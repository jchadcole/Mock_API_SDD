import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import NewProjectModal from "../components/NewProjectModal.js";
import StatusBadge from "../components/StatusBadge.js";

export default function Dashboard() {
  const [showNewProject, setShowNewProject] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  });

  const createMutation = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowNewProject(false);
      setCreateError(null);
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            OpenAPI specs are the source of truth. Sync them to Postman, generate collections,
            mocks, docs, and keep everything drift-free.
          </p>
        </div>
        <button
          className="rounded-md bg-postman-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          onClick={() => setShowNewProject(true)}
        >
          New project
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading...</div>
        ) : !projects?.length ? (
          <div className="p-6 text-sm text-slate-500">
            No projects yet. Create one to start the Spec-Driven Development workflow.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Spec Hub</th>
                <th className="px-4 py-3 font-medium">Collection</th>
                <th className="px-4 py-3 font-medium">Mock</th>
                <th className="px-4 py-3 font-medium">Docs</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/projects/${project.id}`} className="font-medium text-postman-orange hover:underline">
                      {project.name}
                    </Link>
                    <div className="text-xs text-slate-400">{project.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    {project.postmanSpecId ? (
                      <StatusBadge label="Synced" tone="success" />
                    ) : (
                      <StatusBadge label="Not synced" tone="neutral" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {project.postmanCollectionId ? (
                      <StatusBadge label="Generated" tone="success" />
                    ) : (
                      <StatusBadge label="Not generated" tone="neutral" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {project.postmanMockUrl ? (
                      <StatusBadge label="Live" tone="success" />
                    ) : (
                      <StatusBadge label="None" tone="neutral" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {project.docsUrl ? (
                      <StatusBadge label="Published" tone="success" />
                    ) : (
                      <StatusBadge label="Not published" tone="neutral" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => {
            setShowNewProject(false);
            setCreateError(null);
          }}
          onCreate={(data) => createMutation.mutateAsync(data)}
          submitting={createMutation.isPending}
          error={createError}
        />
      )}
    </div>
  );
}
