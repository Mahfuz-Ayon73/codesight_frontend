"use client";

import { useState } from "react";
import { UserPlus, Trash2 } from "lucide-react";
import type { ProjectMember, ProjectMemberRole } from "@/types/project/project.schema";
import {
  inviteProjectMemberAction,
  removeProjectMemberAction,
  updateProjectMemberRoleAction,
} from "@/actions/project.action";
import InputField from "@/components/InputField/InputField";
import Button from "@/components/Button/Button";

const ROLES: ProjectMemberRole[] = ["VIEWER", "MEMBER", "ADMIN"];

type Props = {
  organizationId: string;
  projectId: string;
  initialMembers: ProjectMember[];
};

export default function ProjectMembersPanel({ organizationId, projectId, initialMembers }: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    const form = new FormData(e.currentTarget);
    try {
      const member = await inviteProjectMemberAction(organizationId, projectId, {
        email: String(form.get("email")),
        role: String(form.get("role")) as ProjectMemberRole,
      });
      setMembers((prev) => [...prev, member]);
      setShowInvite(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRoleChange(userId: string, role: ProjectMemberRole) {
    try {
      const updated = await updateProjectMemberRoleAction(organizationId, projectId, userId, { role });
      setMembers((prev) => prev.map((m) => (m.userId === userId ? updated : m)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this member from the project?")) return;
    try {
      await removeProjectMemberAction(organizationId, projectId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <h2 className="text-sm font-semibold text-zinc-800">Members</h2>
        <button
          onClick={() => setShowInvite((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
        >
          <UserPlus size={13} />
          Invite
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <form onSubmit={handleInvite} className="flex flex-col gap-3 px-4 py-3 border-b border-zinc-100 bg-zinc-50">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <InputField label="Email" name="email" type="email" required />
            </div>
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
            <Button type="submit" disabled={inviteLoading}>
              {inviteLoading ? "Inviting…" : "Invite"}
            </Button>
          </div>
          {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
        </form>
      )}

      {/* Members list */}
      <ul className="divide-y divide-zinc-100">
        {members.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-zinc-400">No members yet.</li>
        )}
        {members.map((member) => (
          <li key={member.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-800">
                {member.userFirstName} {member.userLastName}
              </p>
              <p className="text-xs text-zinc-400">{member.userEmail}</p>
            </div>
            <div className="flex items-center gap-2">
              {member.role === "OWNER" ? (
                <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-600">
                  Owner
                </span>
              ) : (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.userId, e.target.value as ProjectMemberRole)}
                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs focus:outline-none focus:border-cyan-400"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}
              {member.role !== "OWNER" && (
                <button
                  onClick={() => handleRemove(member.userId)}
                  className="rounded p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
