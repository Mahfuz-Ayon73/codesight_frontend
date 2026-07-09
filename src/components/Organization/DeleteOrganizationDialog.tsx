"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { deleteOrganizationAction } from "@/actions/organization.action";

type Props = {
  organizationId: string;
  organizationName: string;
  open: boolean;
  onClose: () => void;
};

export default function DeleteOrganizationDialog({ organizationId, organizationName, open, onClose }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      await deleteOrganizationAction(organizationId);
      router.push("/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete organization");
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
        >
          <X size={16} />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Delete organization</h2>
            <p className="text-xs text-zinc-400">This cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-zinc-600">
          Are you sure you want to permanently delete <span className="font-medium text-zinc-800">{organizationName}</span>? All members will lose access.
        </p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60"
          >
            {loading ? "Deleting…" : "Delete organization"}
          </button>
        </div>
      </div>
    </div>
  );
}
