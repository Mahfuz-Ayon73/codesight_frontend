"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { deleteOrganizationAction, listOrganizationsAction } from "@/actions/organization.action";
import { CURRENT_ORG_COOKIE, deleteCookie, getCookie } from "@/utils/cookie";
import { nextOrgDestination } from "@/utils/organization";

type Props = {
  organizationId: string;
  organizationName: string;
  open: boolean;
  onClose: () => void;
  /** Where to navigate after a successful delete. Pass `null` to stay on the current page and just refresh it — unless this was the org you were in, in which case the next org is resolved for you. */
  redirectTo?: string | null;
};

export default function DeleteOrganizationDialog({
  organizationId,
  organizationName,
  open,
  onClose,
  redirectTo = null,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      await deleteOrganizationAction(organizationId);
      // Otherwise the switcher/sidebar keep pointing at this now-deleted org.
      const wasCurrent =
        getCookie(CURRENT_ORG_COOKIE) === organizationId ||
        pathname.startsWith(`/organizations/${organizationId}`);
      if (wasCurrent) deleteCookie(CURRENT_ORG_COOKIE);
      // Close explicitly — when staying on the current page, refresh() alone
      // won't unmount this client component, so it'd otherwise sit open
      // forever showing a stale "Deleting…" state.
      onClose();
      if (redirectTo) {
        router.push(redirectTo);
      } else if (wasCurrent) {
        // The org you were in is gone, so resolve where to go from the list as
        // it stands *after* the delete and navigate straight there — your own
        // org, else any org you're still in, else the create-organization
        // flow. Deliberately not "/" or "/projects": those re-resolve the
        // target server-side, which raced this delete and bounced the app
        // between routes.
        const remaining = await listOrganizationsAction().catch(() => []);
        router.push(nextOrgDestination(remaining));
      } else {
        router.refresh();
      }
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
