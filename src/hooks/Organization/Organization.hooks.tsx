"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { Organization } from "@/types/organization/organization.schema";
import { CURRENT_ORG_COOKIE, getCookie, setCookie } from "@/utils/cookie";

// document.cookie is an external store, so read it through
// useSyncExternalStore: undefined during SSR and the first hydration render,
// the real value afterwards. Reading it into state from an effect instead
// would cascade an extra render on every navigation.
const subscribe = () => () => {};
const readCookie = () => getCookie(CURRENT_ORG_COOKIE);
const readCookieOnServer = () => undefined;

// Single source of truth for "which org am I looking at": prefer the id
// embedded in the URL (e.g. /organizations/abc/projects), and fall back to
// whichever org was last selected via the switcher (persisted in a cookie)
// for pages like "/profile" that aren't org-scoped in the URL.
//
// Pass the user's actual organizations so a URL org id is only ever written
// back to the cookie when it's one you're still a member of. Without that
// check, opening the URL of an org you'd left would pin the switcher to it,
// and every subsequent non-org-scoped page would try to resolve back into it.
export function useCurrentOrgId(organizations: Organization[] = []): string | undefined {
  const pathname = usePathname();
  const urlOrgId = pathname.match(/\/organizations\/([^/]+)/)?.[1];
  const urlOrgIsMine = !!urlOrgId && organizations.some((o) => o.id === urlOrgId);

  const cookieOrgId = useSyncExternalStore(subscribe, readCookie, readCookieOnServer);

  useEffect(() => {
    if (urlOrgId && urlOrgIsMine) setCookie(CURRENT_ORG_COOKIE, urlOrgId);
  }, [urlOrgId, urlOrgIsMine]);

  // Reports the URL's org even when it isn't yours — callers need to be able
  // to tell "viewing an org I've left" apart from "no org selected".
  return urlOrgId ?? cookieOrgId;
}
