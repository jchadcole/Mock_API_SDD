import type { DriftCheck, Project, ProjectDetail, TestRun } from "./types.js";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message = body?.error
      ? typeof body.error === "string"
        ? body.error
        : JSON.stringify(body.error)
      : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

export const api = {
  listProjects: () => request<Project[]>("/api/projects"),

  getProject: (id: string) => request<ProjectDetail>(`/api/projects/${id}`),

  createProject: (data: { name: string; specContent: string }) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteProject: (id: string) =>
    request<void>(`/api/projects/${id}`, { method: "DELETE" }),

  getSpec: (id: string) => request<{ content: string }>(`/api/projects/${id}/spec`),

  updateSpec: (id: string, content: string) =>
    request<{ ok: true }>(`/api/projects/${id}/spec`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),

  syncSpec: (id: string) =>
    request<Project>(`/api/projects/${id}/spec/sync`, { method: "POST" }),

  syncCollection: (id: string) =>
    request<Project>(`/api/projects/${id}/collection/sync`, { method: "POST" }),

  createMock: (id: string) =>
    request<Project>(`/api/projects/${id}/mock`, { method: "POST" }),

  publishDocs: (id: string) =>
    request<Project>(`/api/projects/${id}/docs`, { method: "POST" }),

  runTests: (id: string, environmentId?: string) =>
    request<TestRun>(`/api/projects/${id}/tests`, {
      method: "POST",
      body: JSON.stringify({ environmentId }),
    }),

  listTestRuns: (id: string) => request<TestRun[]>(`/api/projects/${id}/tests`),

  checkDrift: (id: string) =>
    request<DriftCheck>(`/api/projects/${id}/drift/check`, { method: "POST" }),

  listDriftChecks: (id: string) => request<DriftCheck[]>(`/api/projects/${id}/drift`),
};

export { ApiError };
