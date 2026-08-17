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

export type PostmanTaskStatus = "pending" | "processing" | "completed" | "failed";

export interface PostmanTaskResult<T = unknown> {
  status: PostmanTaskStatus;
  result?: T;
  error?: string;
}

export interface PostmanCollectionRef {
  id: string;
  uid?: string;
  name?: string;
}

export interface PostmanMock {
  id: string;
  url: string;
  collectionId: string;
  name?: string;
}
