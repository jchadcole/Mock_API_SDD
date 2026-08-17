import type { TestRun } from "../api/types.js";
import StatusBadge from "./StatusBadge.js";

export default function TestResults({ runs }: { runs: TestRun[] }) {
  if (!runs.length) {
    return <p className="text-sm text-slate-500">No test runs yet. Run the collection to see contract test results here.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {runs.map((run) => (
        <li key={run.id} className="flex items-center justify-between py-2 text-sm">
          <div>
            <span className="font-medium text-slate-800">
              {run.passCount} passed / {run.failCount} failed
            </span>
            <span className="ml-2 text-xs text-slate-400">
              {new Date(run.createdAt).toLocaleString()}
            </span>
          </div>
          <StatusBadge
            label={run.failCount === 0 ? "All green" : "Failures"}
            tone={run.failCount === 0 ? "success" : "danger"}
          />
        </li>
      ))}
    </ul>
  );
}
