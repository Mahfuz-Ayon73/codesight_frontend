"use client";

import { ChevronDown } from "lucide-react";
import { useOrganizations } from "@/hooks/Organization/Organization.hooks";
import { useRouter, usePathname } from "next/navigation";

export default function OrgSwitcher() {
  const { organizations, loading } = useOrganizations();
  const router = useRouter();
  const pathname = usePathname();

  // Extract current org from URL if present
  const match = pathname.match(/\/organizations\/([^/]+)/);
  const currentOrgId = match?.[1];
  const currentOrg = organizations.find((o) => o.id === currentOrgId) ?? organizations[0];

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/organizations/${e.target.value}/projects`);
  }

  if (loading || organizations.length === 0) {
    return (
      <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-400 min-w-[120px]">
        {loading ? "Loading…" : "No orgs"}
        <ChevronDown size={14} className="ml-auto" />
      </div>
    );
  }

  return (
    <div className="relative flex items-center">
      <select
        value={currentOrg?.id ?? ""}
        onChange={handleChange}
        className="appearance-none rounded-lg border border-zinc-200 bg-zinc-50 pl-3 pr-8 py-1.5 text-sm font-medium text-zinc-700 focus:outline-none focus:border-cyan-400 cursor-pointer"
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>{org.name}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2 pointer-events-none text-zinc-400" />
    </div>
  );
}
