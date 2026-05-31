"use client";

import { useEffect, useState } from "react";
import { listOrganizationsAction } from "@/actions/organization.action";
import type { Organization } from "@/types/organization/organization.schema";

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOrganizationsAction()
      .then(setOrganizations)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return { organizations, loading, error };
}
