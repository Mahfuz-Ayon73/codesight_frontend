"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { updateProjectAction } from "@/actions/project.action";
import Button from "@/components/Button/Button";

type Props = {
  organizationId: string;
  projectId: string;
  description: string;
  canEdit: boolean;
};

export default function EditableDescription({ organizationId, projectId, description, canEdit }: Props) {
  const [value, setValue] = useState(description);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function startEdit() {
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateProjectAction(organizationId, projectId, { description: draft });
      setValue(updated.description ?? "");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update description");
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700">Description</label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          autoFocus
          className="rounded-lg border border-zinc-300/60 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={loading}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-700 mb-1">Description</p>
        <p className="text-sm text-zinc-500">
          {value || <span className="text-zinc-400 italic">No description yet.</span>}
        </p>
      </div>
      {canEdit && (
        <button
          onClick={startEdit}
          className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition shrink-0"
        >
          <Pencil size={12} />
          Edit
        </button>
      )}
    </div>
  );
}
