import type { DriftCheck } from "../api/types.js";
import StatusBadge from "./StatusBadge.js";

export default function DriftPanel({ checks }: { checks: DriftCheck[] }) {
  if (!checks.length) {
    return <p className="text-sm text-slate-500">No drift checks yet.</p>;
  }

  const latest = checks[0];
  const diffs = latest.diffJson ? (JSON.parse(latest.diffJson) as unknown[]) : [];

  return (
    <div>
      <div className="flex items-center gap-2">
        <StatusBadge
          label={latest.driftFound ? "Drift detected" : "In sync"}
          tone={latest.driftFound ? "warning" : "success"}
        />
        <span className="text-xs text-slate-400">
          Last checked {new Date(latest.checkedAt).toLocaleString()}
        </span>
      </div>

      {latest.driftFound && diffs.length > 0 && (
        <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
          {JSON.stringify(diffs, null, 2)}
        </pre>
      )}

      <ul className="mt-4 divide-y divide-slate-100">
        {checks.map((check) => (
          <li key={check.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-xs text-slate-400">{new Date(check.checkedAt).toLocaleString()}</span>
            <StatusBadge
              label={check.driftFound ? "Drift" : "In sync"}
              tone={check.driftFound ? "warning" : "success"}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
