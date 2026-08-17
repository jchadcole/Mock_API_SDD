import type { SyncRun } from "../api/types.js";
import StatusBadge from "./StatusBadge.js";

const typeLabels: Record<SyncRun["type"], string> = {
  spec_push: "Spec pushed to Spec Hub",
  collection_sync: "Collection generated/synced",
  mock_create: "Mock created",
  docs_publish: "Docs published",
};

export default function SyncHistory({ runs }: { runs: SyncRun[] }) {
  if (!runs.length) {
    return <p className="text-sm text-slate-500">No sync activity yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {runs.map((run) => (
        <li key={run.id} className="flex items-center justify-between py-2 text-sm">
          <div>
            <span className="font-medium text-slate-800">{typeLabels[run.type] ?? run.type}</span>
            <span className="ml-2 text-xs text-slate-400">
              {new Date(run.createdAt).toLocaleString()}
            </span>
          </div>
          <StatusBadge
            label={run.status === "success" ? "Success" : "Failed"}
            tone={run.status === "success" ? "success" : "danger"}
          />
        </li>
      ))}
    </ul>
  );
}
