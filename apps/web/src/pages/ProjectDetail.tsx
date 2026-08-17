import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import DriftPanel from "../components/DriftPanel.js";
import SpecEditor from "../components/SpecEditor.js";
import StatusBadge from "../components/StatusBadge.js";
import SyncHistory from "../components/SyncHistory.js";
import TestResults from "../components/TestResults.js";

type Tab = "spec" | "collection" | "mocks" | "tests" | "docs" | "drift";

const TABS: { id: Tab; label: string }[] = [
  { id: "spec", label: "Spec" },
  { id: "collection", label: "Collection" },
  { id: "mocks", label: "Mocks" },
  { id: "tests", label: "Tests" },
  { id: "docs", label: "Docs" },
  { id: "drift", label: "Drift" },
];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = id!;
  const [tab, setTab] = useState<Tab>("spec");
  const [specError, setSpecError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject(projectId),
  });

  const { data: specData } = useQuery({
    queryKey: ["project", projectId, "spec"],
    queryFn: () => api.getSpec(projectId),
    enabled: tab === "spec",
  });

  const invalidateProject = () => queryClient.invalidateQueries({ queryKey: ["project", projectId] });

  const saveSpecMutation = useMutation({
    mutationFn: (content: string) => api.updateSpec(projectId, content),
    onSuccess: () => {
      setSpecError(null);
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "spec"] });
    },
    onError: (err: Error) => setSpecError(err.message),
  });

  const runAction = useMutation({
    mutationFn: async (action: "syncSpec" | "syncCollection" | "createMock" | "publishDocs" | "runTests" | "checkDrift") => {
      setActionError(null);
      switch (action) {
        case "syncSpec":
          return api.syncSpec(projectId);
        case "syncCollection":
          return api.syncCollection(projectId);
        case "createMock":
          return api.createMock(projectId);
        case "publishDocs":
          return api.publishDocs(projectId);
        case "runTests":
          return api.runTests(projectId);
        case "checkDrift":
          return api.checkDrift(projectId);
      }
    },
    onSuccess: () => invalidateProject(),
    onError: (err: Error) => setActionError(err.message),
  });

  if (isLoading || !project) {
    return <div className="text-sm text-slate-500">Loading...</div>;
  }

  return (
    <div>
      <Link to="/" className="text-sm text-slate-500 hover:underline">
        &larr; Back to projects
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-sm text-slate-400">{project.specPath}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={project.postmanSpecId ? "Spec synced" : "Spec not synced"} tone={project.postmanSpecId ? "success" : "neutral"} />
          <StatusBadge label={project.postmanCollectionId ? "Collection ready" : "No collection"} tone={project.postmanCollectionId ? "success" : "neutral"} />
        </div>
      </div>

      {actionError && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{actionError}</div>
      )}

      <div className="mt-6 border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`border-b-2 px-1 py-3 text-sm font-medium ${
                tab === t.id
                  ? "border-postman-orange text-postman-orange"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {tab === "spec" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Push to Postman Spec Hub</h2>
                <button
                  className="rounded-md bg-postman-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                  disabled={runAction.isPending}
                  onClick={() => runAction.mutate("syncSpec")}
                >
                  {runAction.isPending ? "Syncing..." : "Sync to Postman"}
                </button>
              </div>
              <div className="mt-4">
                <SyncHistory runs={project.syncRuns.filter((r) => r.type === "spec_push")} />
              </div>
            </div>

            {specData && (
              <SpecEditor
                initialContent={specData.content}
                onSave={(content) => saveSpecMutation.mutateAsync(content)}
                saving={saveSpecMutation.isPending}
                error={specError}
              />
            )}
          </div>
        )}

        {tab === "collection" && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">Generate / sync collection</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Requires the spec to be synced to Postman first.
                </p>
              </div>
              <button
                className="rounded-md bg-postman-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                disabled={runAction.isPending || !project.postmanSpecId}
                onClick={() => runAction.mutate("syncCollection")}
              >
                {runAction.isPending ? "Working..." : project.postmanCollectionId ? "Re-sync collection" : "Generate collection"}
              </button>
            </div>
            <div className="mt-4">
              <SyncHistory runs={project.syncRuns.filter((r) => r.type === "collection_sync")} />
            </div>
          </div>
        )}

        {tab === "mocks" && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">Mock server</h2>
                {project.postmanMockUrl ? (
                  <a
                    href={project.postmanMockUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-sm text-postman-orange hover:underline"
                  >
                    {project.postmanMockUrl}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">
                    Requires a generated collection. Frontend teams can point at the mock URL
                    before the real API is ready.
                  </p>
                )}
              </div>
              <button
                className="rounded-md bg-postman-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                disabled={runAction.isPending || !project.postmanCollectionId}
                onClick={() => runAction.mutate("createMock")}
              >
                {runAction.isPending ? "Working..." : project.postmanMockUrl ? "Re-create mock" : "Create mock"}
              </button>
            </div>
            <div className="mt-4">
              <SyncHistory runs={project.syncRuns.filter((r) => r.type === "mock_create")} />
            </div>
          </div>
        )}

        {tab === "tests" && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">Contract tests</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Runs the generated collection with Newman and records pass/fail history.
                </p>
              </div>
              <button
                className="rounded-md bg-postman-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                disabled={runAction.isPending || !project.postmanCollectionId}
                onClick={() => runAction.mutate("runTests")}
              >
                {runAction.isPending ? "Running..." : "Run tests"}
              </button>
            </div>
            <div className="mt-4">
              <TestResults runs={project.testRuns} />
            </div>
          </div>
        )}

        {tab === "docs" && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">Documentation</h2>
                {project.docsUrl ? (
                  <a
                    href={project.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-sm text-postman-orange hover:underline"
                  >
                    {project.docsUrl}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">Requires a generated collection.</p>
                )}
              </div>
              <button
                className="rounded-md bg-postman-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                disabled={runAction.isPending || !project.postmanCollectionId}
                onClick={() => runAction.mutate("publishDocs")}
              >
                {runAction.isPending ? "Publishing..." : "Publish docs"}
              </button>
            </div>
            <div className="mt-4">
              <SyncHistory runs={project.syncRuns.filter((r) => r.type === "docs_publish")} />
            </div>
          </div>
        )}

        {tab === "drift" && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">Drift detection</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Compares the repo spec against Postman Spec Hub. Also runs automatically on a
                  schedule.
                </p>
              </div>
              <button
                className="rounded-md bg-postman-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                disabled={runAction.isPending || !project.postmanSpecId}
                onClick={() => runAction.mutate("checkDrift")}
              >
                {runAction.isPending ? "Checking..." : "Check drift"}
              </button>
            </div>
            <div className="mt-4">
              <DriftPanel checks={project.driftChecks} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
