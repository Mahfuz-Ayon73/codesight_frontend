"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { listOrganizationsAction } from "@/actions/organization.action";
import type { Organization } from "@/types/organization/organization.schema";

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  const refetch = useCallback(() => {
    setLoading(true);
    return listOrganizationsAction()
      .then(setOrganizations)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  // Membership can change (e.g. accepting an org invitation) without this
  // component remounting, since the dashboard layout persists across
  // client-side navigations within the route group. Refetch on every
  // navigation so a newly-joined organization shows up right away.
  useEffect(() => {
    refetch();
  }, [pathname, refetch]);

  return { organizations, loading, error, refetch };
}
