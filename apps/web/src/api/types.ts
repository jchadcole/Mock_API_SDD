export interface Project {
  id: string;
  name: string;
  slug: string;
  specPath: string;
  postmanWorkspaceId: string | null;
  postmanSpecId: string | null;
  postmanCollectionId: string | null;
  postmanMockId: string | null;
  postmanMockUrl: string | null;
  docsUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncRun {
  id: string;
  projectId: string;
  type: "spec_push" | "collection_sync" | "mock_create" | "docs_publish";
  status: "success" | "failed";
  resultJson: string | null;
  createdAt: string;
}

export interface TestRun {
  id: string;
  projectId: string;
  newmanReportJson: string;
  passCount: number;
  failCount: number;
  createdAt: string;
}

export interface DriftCheck {
  id: string;
  projectId: string;
  driftFound: boolean;
  diffJson: string | null;
  checkedAt: string;
}

export interface ProjectDetail extends Project {
  syncRuns: SyncRun[];
  testRuns: TestRun[];
  driftChecks: DriftCheck[];
}
