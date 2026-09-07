export const AUTH_TOKEN_COOKIE = "codesight_token";

// Remembers which organization the user last switched to, so pages without
// an org id in the URL (e.g. "/") can stay scoped to it instead of falling
// back to whichever organization happens to have the most recent activity.
export const CURRENT_ORG_COOKIE = "codesight_current_org";

// Records that the user chose "Skip for now" instead of creating an
// organization. The org-less redirectors ("/" and "/projects") resolve which
// org to open and, finding none, hand off to the create-organization flow —
// which sent a skipping user straight back to the form they just dismissed,
// with no way out. While this is set those routes render a dead-end empty
// state instead, so skipping always sticks.
export const SKIPPED_ORG_SETUP_COOKIE = "codesight_skipped_org_setup";

export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 365): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Remember which organization the user is now in. Clears any earlier "Skip for
 * now" at the same time: they're in an organization, so the skip has served
 * its purpose and shouldn't keep suppressing onboarding if they ever end up
 * with none again.
 */
export function setCurrentOrganization(organizationId: string): void {
  setCookie(CURRENT_ORG_COOKIE, organizationId);
  deleteCookie(SKIPPED_ORG_SETUP_COOKIE);
}

/** Record a "Skip for now" — call it *before* navigating away from the form. */
export function skipOrganizationSetup(): void {
  setCookie(SKIPPED_ORG_SETUP_COOKIE, "1");
}
