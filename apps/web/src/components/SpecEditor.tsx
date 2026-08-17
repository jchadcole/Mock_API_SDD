import Editor from "@monaco-editor/react";
import { useEffect, useState } from "react";

interface SpecEditorProps {
  initialContent: string;
  onSave: (content: string) => Promise<unknown>;
  saving: boolean;
  error?: string | null;
}

export default function SpecEditor({ initialContent, onSave, saving, error }: SpecEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setContent(initialContent);
    setDirty(false);
  }, [initialContent]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          This spec is the source of truth. Saving validates it and writes it to{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">specs/&lt;project&gt;/openapi.yaml</code>.
        </p>
        <button
          className="rounded-md bg-postman-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          disabled={!dirty || saving}
          onClick={() => onSave(content).then(() => setDirty(false))}
        >
          {saving ? "Saving..." : "Save spec"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
        <Editor
          height="480px"
          defaultLanguage="yaml"
          value={content}
          onChange={(value) => {
            setContent(value ?? "");
            setDirty(true);
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
}
