"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2, Loader2, AlertTriangle } from "lucide-react";

type Props = {
  organizationId: string;
  projectId: string;
};

export default function CodebaseActions({ organizationId, projectId }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/codebase/reset?organizationId=${organizationId}&projectId=${projectId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Failed to reset codebase (${res.status})`);
      }
      // Reset loading before refresh so spinner stops even if component stays mounted
      setLoading(false);
      setConfirm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (confirm) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-700">Delete codebase?</p>
          <p className="text-xs text-red-500 mt-0.5">
            This removes all uploaded files and resets the project to pending upload. Analysis results will be lost.
          </p>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleReset}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition disabled:opacity-60"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              {loading ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => { setConfirm(false); setError(null); }}
              disabled={loading}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleReset}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition disabled:opacity-60"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
        Re-upload codebase
      </button>
      <button
        onClick={() => setConfirm(true)}
        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition"
      >
        <Trash2 size={13} />
        Delete codebase
      </button>
    </div>
  );
}
