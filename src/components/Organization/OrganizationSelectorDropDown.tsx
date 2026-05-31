"use client";

import type { Organization } from "@/types/organization/organization.schema";

type Props = {
  organizations: Organization[];
  value?: string;
  onChange: (organizationId: string) => void;
};

export default function OrganizationSelectorDropDown({ organizations, value, onChange }: Props) {
  return (
    <select
      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>Select organization</option>
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>{org.name}</option>
      ))}
    </select>
  );
}
