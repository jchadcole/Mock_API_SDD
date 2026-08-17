export interface PostmanSpec {
  id: string;
  name: string;
  type: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PostmanAsyncTask {
  taskId: string;
}

export type PostmanTaskStatus = "pending" | "in-progress" | "completed" | "failed";

/**
 * Shape of `GET /specs/{specId}/tasks/{taskId}` — the single generic task-status endpoint
 * used for both collection generation and spec/collection sync. Confirmed against the live
 * API: there is no top-level `result` field; generated resources (e.g. the new collection's
 * id, already in `ownerId-uuid` UID form) show up under `details.resources`.
 */
export interface PostmanTaskResult {
  status: PostmanTaskStatus;
  meta?: { action?: string; model?: string };
  details?: { resources?: { id: string; url?: string }[] };
  error?: string;
}

export interface PostmanCollectionRef {
  /** Collection UID in `ownerId-uuid` form — required by most other collection endpoints. */
  id: string;
  url?: string;
}

export interface PostmanMock {
  id: string;
  /** Postman returns `mockUrl`, not `url`. */
  mockUrl: string;
  collection: string;
  name?: string;
}
