import { env } from "../env.js";
import type {
  PostmanCollectionRef,
  PostmanMock,
  PostmanSpec,
  PostmanTaskResult,
} from "./types.js";

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
    const res = await request<{ spec: PostmanSpec }>(`/specs${query}`, {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        type: params.type ?? "OPENAPI:3.0",
        files: params.files,
      }),
    });
    return res.spec;
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
    await request(`/specs/${specId}/files/${encodeURIComponent(filePath)}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  },

  // ---------------------------------------------------------------------
  // Collection generation / sync (async operations)
  // ---------------------------------------------------------------------
  async generateCollection(specId: string): Promise<{ taskId: string }> {
    return request<{ taskId: string }>(`/specs/${specId}/generations/collections`, {
      method: "POST",
    });
  },

  async getGenerateCollectionTaskStatus(
    specId: string,
    taskId: string
  ): Promise<PostmanTaskResult<PostmanCollectionRef>> {
    return request<PostmanTaskResult<PostmanCollectionRef>>(
      `/specs/${specId}/generations/collections/${taskId}`
    );
  },

  async syncCollectionWithSpec(
    specId: string,
    collectionId: string
  ): Promise<{ taskId: string }> {
    return request<{ taskId: string }>(
      `/specs/${specId}/collections/${collectionId}/sync-with-spec`,
      { method: "POST" }
    );
  },

  async getSyncTaskStatus(
    specId: string,
    taskId: string
  ): Promise<PostmanTaskResult> {
    return request<PostmanTaskResult>(
      `/specs/${specId}/tasks/${taskId}`
    );
  },

  async syncSpecWithCollection(specId: string, collectionId: string): Promise<{ taskId: string }> {
    return request<{ taskId: string }>(
      `/specs/${specId}/collections/${collectionId}/sync-with-collection`,
      { method: "POST" }
    );
  },

  /** Polls an async spec-hub task until it settles (completed/failed) or times out. */
  async pollTask<T>(
    fetchStatus: () => Promise<PostmanTaskResult<T>>,
    { intervalMs = 2000, timeoutMs = 60000 } = {}
  ): Promise<PostmanTaskResult<T>> {
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
  async publishDocumentation(collectionId: string): Promise<{ docsUrl: string }> {
    const res = await request<{ docsUrl: string }>(
      `/collections/${collectionId}/publish`,
      { method: "POST" }
    );
    return res;
  },

  // ---------------------------------------------------------------------
  // Environments (used to fetch variables for test runs)
  // ---------------------------------------------------------------------
  async getEnvironment(environmentId: string): Promise<unknown> {
    const res = await request<{ environment: unknown }>(`/environments/${environmentId}`);
    return res.environment;
  },
};
