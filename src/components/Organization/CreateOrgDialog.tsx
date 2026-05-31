"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, X } from "lucide-react";
import { createOrganizationAction } from "@/actions/organization.action";
import InputField from "@/components/InputField/InputField";
import Button from "@/components/Button/Button";

export default function CreateOrgDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const name = String(new FormData(e.currentTarget).get("name"));
    try {
      const org = await createOrganizationAction({ name });
      router.push(`/organizations/${org.id}/projects`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Empty state card — click anywhere to open dialog */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-500">
          <Building2 size={26} />
        </div>
        <p className="text-base font-semibold text-zinc-800">You don't have an organization yet</p>
        <p className="mt-1 mb-6 max-w-sm text-sm text-zinc-400">
          An organization is a container for all your projects. Create one to get started — you can always create more or be invited to others later.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition"
        >
          Create your organization
        </button>
      </div>

      {/* Dialog overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
            >
              <X size={16} />
            </button>

            {/* Icon + heading */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Create an organization</h2>
                <p className="text-xs text-zinc-400">Groups your projects and team members.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <InputField
                label="Organization name"
                name="name"
                placeholder="e.g. Acme Corp"
                required
                autoFocus
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition"
                >
                  Cancel
                </button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating…" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
