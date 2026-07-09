"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle, Building2 } from "lucide-react";
import { deleteProjectAction } from "@/actions/project.action";
import DeleteOrganizationDialog from "@/components/Organization/DeleteOrganizationDialog";

type Props = {
  organizationId: string;
  projectId: string;
  organizationName: string;
  isOrgOwner: boolean;
  initialOrgProjectCount: number;
};

export default function ProjectDangerZone({
  organizationId,
  projectId,
  organizationName,
  isOrgOwner,
  initialOrgProjectCount,
}: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgEmptied, setOrgEmptied] = useState(false);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      await deleteProjectAction(organizationId, projectId);
      const remaining = initialOrgProjectCount - 1;
      if (remaining > 0 || !isOrgOwner) {
        router.push("/projects");
        router.refresh();
      } else {
        setLoading(false);
        setConfirm(false);
        setOrgEmptied(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
      setLoading(false);
    }
  }

  if (orgEmptied) {
    return (
      <>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <Building2 size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">
                &quot;{organizationName}&quot; now has no projects left.
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                As the organization owner, you can delete it entirely.
              </p>
              <button
                onClick={() => setOrgDialogOpen(true)}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition"
              >
                <Trash2 size={12} />
                Delete organization
              </button>
            </div>
          </div>
        </div>
        <DeleteOrganizationDialog
          organizationId={organizationId}
          organizationName={organizationName}
          open={orgDialogOpen}
          onClose={() => setOrgDialogOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-zinc-800 mb-3">Danger zone</h2>

      {confirm ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-700">Delete this project?</p>
            <p className="text-xs text-red-500 mt-0.5">
              This permanently removes the project, its members, and any uploaded codebase/analysis.
            </p>
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleDelete}
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
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition"
        >
          <Trash2 size={13} />
          Delete project
        </button>
      )}
    </div>
  );
}
