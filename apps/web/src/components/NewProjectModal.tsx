import { useState } from "react";

const DEFAULT_SPEC = `openapi: 3.0.3
info:
  title: My API
  version: 1.0.0
paths:
  /health:
    get:
      summary: Health check
      responses:
        "200":
          description: OK
`;

interface NewProjectModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; specContent: string }) => Promise<unknown>;
  submitting: boolean;
  error?: string | null;
}

export default function NewProjectModal({ onClose, onCreate, submitting, error }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [specContent, setSpecContent] = useState(DEFAULT_SPEC);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">New project</h2>
        <p className="mt-1 text-sm text-slate-500">
          Give your API a name and starting OpenAPI spec. You can edit the spec later.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-postman-orange focus:outline-none focus:ring-1 focus:ring-postman-orange"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Widgets API"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Initial OpenAPI spec (YAML)</label>
            <textarea
              className="mt-1 h-64 w-full rounded-md border border-slate-300 p-3 font-mono text-xs focus:border-postman-orange focus:outline-none focus:ring-1 focus:ring-postman-orange"
              value={specContent}
              onChange={(e) => setSpecContent(e.target.value)}
              spellCheck={false}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-postman-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            disabled={submitting || !name.trim() || !specContent.trim()}
            onClick={() => onCreate({ name, specContent })}
          >
            {submitting ? "Creating..." : "Create project"}
          </button>
        </div>
      </div>
    </div>
  );
}
