"use client";

import { useEffect, useState } from "react";
import { UserPlus, X, CheckCircle } from "lucide-react";
import { useOrganizations } from "@/hooks/Organization/Organization.hooks";
import { listProjectsAction } from "@/actions/project.action";
import { inviteToOrganizationAction } from "@/actions/organization.action";
import type { OrganizationMemberRole } from "@/types/organization/organization.schema";
import type { Project } from "@/types/project/project.schema";
import InputField from "@/components/InputField/InputField";
import Button from "@/components/Button/Button";

const ROLES: OrganizationMemberRole[] = ["ADMIN", "MEMBER"];

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function InviteDialog({ open, onClose }: Props) {
  const { organizations } = useOrganizations();
  const [orgId, setOrgId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setProjects([]);
      return;
    }
    setProjectsLoading(true);
    listProjectsAction(orgId)
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false));
  }, [orgId]);

  function handleClose() {
    setOrgId("");
    setProjects([]);
    setError(null);
    setSentTo(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const projectId = String(form.get("projectId") || "");
    try {
      await inviteToOrganizationAction(orgId, {
        email,
        role: String(form.get("role")) as OrganizationMemberRole,
        projectId: projectId || undefined,
      });
      setSentTo(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
        >
          <X size={16} />
        </button>

        {sentTo ? (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-500">
              <CheckCircle size={24} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Invitation sent</h2>
              <p className="mt-1 text-sm text-zinc-500">
                We emailed an invitation to <span className="font-medium text-zinc-700">{sentTo}</span>.
              </p>
            </div>
            <Button type="button" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500">
                <UserPlus size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Invite someone</h2>
                <p className="text-xs text-zinc-400">Send an email invitation to join an organization.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <InputField
                label="Invitee email"
                name="email"
                type="email"
                placeholder="teammate@example.com"
                required
                autoFocus
              />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700">Role</label>
                <select
                  name="role"
                  defaultValue="MEMBER"
                  className="rounded-lg border border-zinc-300/60 bg-white px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700">Organization</label>
                <select
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  required
                  className="rounded-lg border border-zinc-300/60 bg-white px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                >
                  <option value="" disabled>Select an organization…</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700">
                  Project <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <select
                  name="projectId"
                  defaultValue=""
                  disabled={!orgId || projectsLoading}
                  className="rounded-lg border border-zinc-300/60 bg-white px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 disabled:bg-zinc-50 disabled:text-zinc-400"
                >
                  <option value="">
                    {!orgId ? "Select an organization first" : projectsLoading ? "Loading projects…" : "No project — organization only"}
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition"
                >
                  Cancel
                </button>
                <Button type="submit" disabled={loading || !orgId}>
                  {loading ? "Sending…" : "Send invitation"}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
