import { env } from "../env.js";
import type { PostmanMock, PostmanSpec, PostmanTaskResult } from "./types.js";

const BASE_URL = "https://api.getpostman.com";

/**
 * Thin wrapper around the Postman public API (https://learning.postman.com/docs/developer/postman-api/intro-api/).
 * Mirrors the operations exposed by the Postman MCP integration (createSpec, updateSpecFile,
 * generateCollection, syncCollectionWithSpec, createMock, publishDocumentation, ...) so this
 * dashboard can drive the same Spec-Driven Development workflow outside of an AI agent context.
 *
 * NOTE: Postman's API surface evolves. Verify exact paths/payloads against the current
 * Postman API reference (https://www.postman.com/postman/postman-public-workspace/) if a call
 * starts failing with 404/400 - the shapes here reflect the documented endpoints as of this writing.
 */
export class PostmanApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "PostmanApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!env.postmanApiKey) {
    throw new Error("POSTMAN_API_KEY is not configured.");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "X-Api-Key": env.postmanApiKey,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  const body = text ? safeJsonParse(text) : undefined;

  if (!res.ok) {
    throw new PostmanApiError(
      `Postman API request failed: ${init.method ?? "GET"} ${path} -> ${res.status}`,
      res.status,
      body
    );
  }

  return body as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const postmanClient = {
  // ---------------------------------------------------------------------
  // Spec Hub
  // ---------------------------------------------------------------------
  async createSpec(params: {
    name: string;
    type?: "OPENAPI:3.0";
    files: { path: string; content: string }[];
    workspaceId?: string;
  }): Promise<PostmanSpec> {
    const workspaceId = params.workspaceId ?? env.postmanWorkspaceId;
    const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
    // NOTE: unlike most Postman endpoints, POST /specs returns the spec object directly
    // (not wrapped in `{ spec: {...} }`) — confirmed against the live API.
    return request<PostmanSpec>(`/specs${query}`, {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        type: params.type ?? "OPENAPI:3.0",
        files: params.files,
      }),
    });
  },

  async getSpecDefinition(specId: string, filePath = "index.yaml"): Promise<string> {
    const res = await request<{ content: string }>(
      `/specs/${specId}/files/${encodeURIComponent(filePath)}`
    );
    return res.content;
  },

  async updateSpecFile(
    specId: string,
    filePath: string,
    content: string
  ): Promise<void> {
    // NOTE: this is a PATCH, not a PUT - PUT returns a 404 on the live API.
    await request(`/specs/${specId}/files/${encodeURIComponent(filePath)}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    });
  },

  // ---------------------------------------------------------------------
  // Collection generation / sync (async operations)
  // ---------------------------------------------------------------------
  async generateCollection(specId: string, name: string): Promise<{ taskId: string }> {
    // NOTE: the endpoint is singular ("generations/collection"), and the request body
    // must NOT include `elementType` (despite what the generateCollection tool schema
    // implies) but DOES require every `options` field to be explicitly present — both
    // confirmed by trial against the live API, since Postman's docs for this endpoint
    // are inconsistent with its actual behavior.
    return request<{ taskId: string }>(`/specs/${specId}/generations/collection`, {
      method: "POST",
      body: JSON.stringify({
        name,
        options: {
          requestNameSource: "Fallback",
          indentCharacter: "Space",
          parametersResolution: "Example",
          folderStrategy: "Paths",
          includeAuthInfoInExample: true,
          enableOptionalParameters: true,
          keepImplicitHeaders: false,
          includeDeprecated: true,
          alwaysInheritAuthentication: false,
          nestedFolderHierarchy: false,
        },
      }),
    });
  },

  /**
   * Re-syncs a generated collection with its source spec's latest changes.
   * NOTE: the real endpoint is `PUT /collections/{uid}/synchronizations?specId=...`
   * (not the `/specs/.../sync-with-spec` path the API naming elsewhere would suggest).
   * Postman returns a 400 "Collection is already in sync" when there's nothing to do -
   * callers should treat that as a benign success, not a failure.
   */
  async syncCollectionWithSpec(
    specId: string,
    collectionUid: string
  ): Promise<{ taskId: string } | { alreadyInSync: true }> {
    try {
      return await request<{ taskId: string }>(
        `/collections/${collectionUid}/synchronizations?specId=${encodeURIComponent(specId)}`,
        { method: "PUT" }
      );
    } catch (err) {
      if (err instanceof PostmanApiError && err.status === 400) {
        const detail = (err.body as { detail?: string } | undefined)?.detail ?? "";
        if (/already in sync/i.test(detail)) {
          return { alreadyInSync: true };
        }
      }
      throw err;
    }
  },

  /**
   * Task-status poller for collection generation. Confirmed shape against the live API:
   * `{ status, meta, details: { resources: [{ id, url }] } }` - there is no `result` field.
   */
  async getSpecTaskStatus(specId: string, taskId: string): Promise<PostmanTaskResult> {
    return request<PostmanTaskResult>(`/specs/${specId}/tasks/${taskId}`);
  },

  /** Task-status poller for collection sync - a different, collection-scoped endpoint. */
  async getCollectionTaskStatus(collectionUid: string, taskId: string): Promise<PostmanTaskResult> {
    return request<PostmanTaskResult>(`/collections/${collectionUid}/tasks/${taskId}`);
  },

  /** Polls an async spec-hub task until it settles (completed/failed) or times out. */
  async pollTask(
    fetchStatus: () => Promise<PostmanTaskResult>,
    { intervalMs = 2000, timeoutMs = 60000 } = {}
  ): Promise<PostmanTaskResult> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const status = await fetchStatus();
      if (status.status === "completed" || status.status === "failed") {
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error("Timed out waiting for Postman async task to complete.");
  },

  // ---------------------------------------------------------------------
  // Collections
  // ---------------------------------------------------------------------
  async getCollection(collectionId: string): Promise<unknown> {
    const res = await request<{ collection: unknown }>(`/collections/${collectionId}`);
    return res.collection;
  },

  // ---------------------------------------------------------------------
  // Mocks
  // ---------------------------------------------------------------------
  async createMock(params: {
    /** Collection UID (`ownerId-uuid`) — a bare collection id is rejected. */
    collectionId: string;
    name: string;
    workspaceId?: string;
  }): Promise<PostmanMock> {
    const workspaceId = params.workspaceId ?? env.postmanWorkspaceId;
    const query = workspaceId ? `?workspace=${encodeURIComponent(workspaceId)}` : "";
    const res = await request<{ mock: PostmanMock }>(`/mocks${query}`, {
      method: "POST",
      body: JSON.stringify({
        mock: {
          collection: params.collectionId,
          name: params.name,
        },
      }),
    });
    return res.mock;
  },

  // ---------------------------------------------------------------------
  // Docs
  // ---------------------------------------------------------------------
  async publishDocumentation(collectionUid: string): Promise<{ docsUrl: string | null }> {
    // NOTE: this is a PUT to /collections/{uid}/public-documentations (not POST .../publish
    // like the older, deprecated endpoint). Confirmed live: it requires `collectionId` in the
    // body (in addition to the path) and a full `customization.appearance` block with at
    // least one theme - a bare `{ metaTags: [] }` customization object is rejected. The
    // response's URL field is `publicUrl`.
    const colors = { highlight: "FF6C37", rightSidebar: "FFFFFF", topBar: "FFFFFF" };
    const res = await request<{ publicUrl?: string }>(
      `/collections/${collectionUid}/public-documentations`,
      {
        method: "PUT",
        body: JSON.stringify({
          collectionId: collectionUid,
          customColor: colors,
          documentationLayout: "classic-single-column",
          customization: {
            metaTags: [],
            appearance: {
              default: "light",
              themes: [
                { name: "light", colors, logo: null },
                { name: "dark", colors: { highlight: "FF6C37", rightSidebar: "1A1A1A", topBar: "1A1A1A" }, logo: null },
              ],
            },
          },
        }),
      }
    );
    return { docsUrl: res.publicUrl ?? null };
  },

  // ---------------------------------------------------------------------
  // Environments (used to fetch variables for test runs)
  // ---------------------------------------------------------------------
  async getEnvironment(environmentId: string): Promise<unknown> {
    const res = await request<{ environment: unknown }>(`/environments/${environmentId}`);
    return res.environment;
  },
};
