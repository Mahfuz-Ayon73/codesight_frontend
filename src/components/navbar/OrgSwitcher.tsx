"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrentOrgId } from "@/hooks/Organization/Organization.hooks";
import { setLastOrganizationAction } from "@/actions/user.action";
import { CURRENT_ORG_COOKIE, setCookie } from "@/utils/cookie";
import type { Organization } from "@/types/organization/organization.schema";

type Props = { organizations: Organization[] };

export default function OrgSwitcher({ organizations }: Props) {
  const router = useRouter();
  const currentOrgId = useCurrentOrgId(organizations);

  // Only ever select an org that's actually in the list. Falling back to
  // organizations[0] made the dropdown *claim* you were in that org while you
  // were really looking at one you'd left — and then picking it fired no
  // change event, so the switcher looked frozen. An empty value shows the
  // placeholder instead, and every real option stays selectable.
  const selectedId = organizations.some((o) => o.id === currentOrgId) ? currentOrgId : "";

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const organizationId = e.target.value;
    if (!organizationId || organizationId === selectedId) return;

    // Cheap client-side cache for pages without an org id in the URL (e.g.
    // /profile) — the real, cross-device "remember this" is the server call
    // below.
    setCookie(CURRENT_ORG_COOKIE, organizationId);
    // Awaited, not fire-and-forget: an in-flight request resolving mid-
    // navigation has bounced this app back to its originating route before.
    // Best-effort — failing to remember the choice shouldn't block the switch.
    await setLastOrganizationAction(organizationId).catch(() => {});
    // Straight to the destination. Never route through "/" — that's a
    // redirector, and having it re-resolve a target while the page that
    // triggered the switch is still settling is what produced the loop.
    router.push(`/organizations/${organizationId}`);
  }

  if (organizations.length === 0) {
    return (
      <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-400 min-w-[120px]">
        No orgs
        <ChevronDown size={14} className="ml-auto" />
      </div>
    );
  }

  return (
    <div className="relative flex items-center">
      <select
        value={selectedId}
        onChange={handleChange}
        className="appearance-none rounded-lg border border-zinc-200 bg-zinc-50 pl-3 pr-8 py-1.5 text-sm font-medium text-zinc-700 focus:outline-none focus:border-cyan-400 cursor-pointer"
      >
        {!selectedId && <option value="">Select organization…</option>}
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>{org.name}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2 pointer-events-none text-zinc-400" />
    </div>
  );
}
