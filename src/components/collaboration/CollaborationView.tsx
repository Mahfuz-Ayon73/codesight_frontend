"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Mail, Users } from "lucide-react";
import type { Organization } from "@/types/organization/organization.schema";
import type { Project, ProjectMember } from "@/types/project/project.schema";

export type CollaborationOrganization = {
  organization: Organization;
  projects: Array<{ project: Project; members: ProjectMember[] }>;
};

type Props = { organizations: CollaborationOrganization[] };

export default function CollaborationView({ organizations }: Props) {
  const [selectedId, setSelectedId] = useState(organizations[0]?.organization.id ?? "");
  const selected = useMemo(
    () => organizations.find(({ organization }) => organization.id === selectedId),
    [organizations, selectedId]
  );

  const memberCount = selected?.projects.reduce((total, project) => total + project.members.length, 0) ?? 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-cyan-600">Team overview</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">Collaboration</h1>
        <p className="mt-1 text-sm text-zinc-500">
          See the active members working on projects you can access in each organization.
        </p>
      </div>

      {organizations.length === 0 ? (
        <EmptyState title="No organizations yet" message="Join or create an organization to see its project teams." />
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 sm:max-w-md">
              Organization
              <span className="relative">
                <select
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 py-2.5 pr-9 text-sm text-zinc-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                >
                  {organizations.map(({ organization }) => (
                    <option key={organization.id} value={organization.id}>{organization.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3 text-zinc-400" />
              </span>
            </label>
            {selected && (
              <div className="flex gap-5 text-sm text-zinc-500">
                <span><strong className="text-zinc-800">{selected.projects.length}</strong> project{selected.projects.length !== 1 ? "s" : ""}</span>
                <span><strong className="text-zinc-800">{memberCount}</strong> active membership{memberCount !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {!selected || selected.projects.length === 0 ? (
            <EmptyState title="No projects to show" message="You do not have access to any projects in this organization yet." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {selected.projects.map(({ project, members }) => (
                <section key={project.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                  <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-zinc-900">{project.name}</h2>
                      {project.description && <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{project.description}</p>}
                    </div>
                    <span className="ml-3 shrink-0 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                      {members.length} member{members.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <ul className="divide-y divide-zinc-100">
                    {members.length === 0 ? (
                      <li className="px-5 py-6 text-center text-sm text-zinc-400">No active members.</li>
                    ) : members.map((member) => (
                      <li key={member.id} className="flex items-center gap-3 px-5 py-3">
                        <Avatar member={member} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-800">{displayName(member)}</p>
                          <p className="flex items-center gap-1 truncate text-xs text-zinc-400"><Mail size={11} />{member.userEmail}</p>
                        </div>
                        <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">{member.role}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function displayName(member: ProjectMember) {
  const name = [member.userFirstName, member.userLastName].filter(Boolean).join(" ");
  return name || member.userEmail || "Unknown member";
}

function Avatar({ member }: { member: ProjectMember }) {
  const initials = [member.userFirstName, member.userLastName]
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
  return <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold text-cyan-700">{initials.slice(0, 2)}</div>;
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center">
      <Users size={24} className="text-zinc-300" />
      <p className="mt-3 text-sm font-semibold text-zinc-700">{title}</p>
      <p className="mt-1 text-sm text-zinc-400">{message}</p>
    </div>
  );
}
