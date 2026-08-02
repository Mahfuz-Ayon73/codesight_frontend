"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { listOrganizationsAction } from "@/actions/organization.action";
import type { Organization } from "@/types/organization/organization.schema";
import { CURRENT_ORG_COOKIE, getCookie, setCookie } from "@/utils/cookie";

// Single source of truth for "which org am I in": prefer the id embedded in
// the URL (e.g. /organizations/abc/projects), and fall back to whichever org
// was last selected via the switcher (persisted in a cookie) for pages like
// "/" that aren't org-scoped in the URL. Keeps the cookie in sync whenever a
// direct link/back-button navigation lands on an org-scoped URL.
export function useCurrentOrgId(): string | undefined {
  const pathname = usePathname();
  const urlOrgId = pathname.match(/\/organizations\/([^/]+)/)?.[1];
  // Cookie is only readable after mount (document is unavailable during
  // SSR) — start undefined so server and first client render agree, then
  // fill in the persisted org once mounted.
  const [cookieOrgId, setCookieOrgId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (urlOrgId) {
      setCookie(CURRENT_ORG_COOKIE, urlOrgId);
      setCookieOrgId(urlOrgId);
    } else {
      setCookieOrgId(getCookie(CURRENT_ORG_COOKIE));
    }
  }, [urlOrgId]);

  return urlOrgId ?? cookieOrgId;
}

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
