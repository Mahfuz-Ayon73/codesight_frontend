"use client";

import { useState } from "react";
import { Building2, LogOut, Trash2 } from "lucide-react";
import DeleteOrganizationDialog from "@/components/Organization/DeleteOrganizationDialog";
import LeaveOrganizationDialog from "@/components/Organization/LeaveOrganizationDialog";
import CreateOrgDialog from "@/components/Organization/CreateOrgDialog";
import type { Organization } from "@/types/organization/organization.schema";

type Props = {
  organizations: Organization[];
};

export default function ProfileOrganizationSection({ organizations }: Props) {
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<Organization | null>(null);

  if (organizations.length === 0) {
    return <CreateOrgDialog />;
  }

  return (
    <div className="flex flex-col gap-3">
      {organizations.map((org) => (
        <div
          key={org.id}
          className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500">
            <Building2 size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-zinc-900 truncate">{org.name}</p>
            {org.description && (
              <p className="text-sm text-zinc-400 truncate">{org.description}</p>
            )}
            {org.myRole && (
              <p className="mt-0.5 text-xs text-zinc-400">{org.myRole.charAt(0) + org.myRole.slice(1).toLowerCase()}</p>
            )}
          </div>
          {org.myRole === "OWNER" ? (
            <button
              onClick={() => setDeleteTarget(org)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition"
            >
              <Trash2 size={13} />
              Delete
            </button>
          ) : (
            <button
              onClick={() => setLeaveTarget(org)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 transition"
            >
              <LogOut size={13} />
              Leave
            </button>
          )}
        </div>
      ))}

      {deleteTarget && (
        <DeleteOrganizationDialog
          organizationId={deleteTarget.id}
          organizationName={deleteTarget.name}
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          redirectTo={null}
        />
      )}

      {leaveTarget && (
        <LeaveOrganizationDialog
          organizationId={leaveTarget.id}
          organizationName={leaveTarget.name}
          open={!!leaveTarget}
          onClose={() => setLeaveTarget(null)}
        />
      )}
    </div>
  );
}
