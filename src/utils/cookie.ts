export const AUTH_TOKEN_COOKIE = "codesight_token";

// Remembers which organization the user last switched to, so pages without
// an org id in the URL (e.g. "/") can stay scoped to it instead of falling
// back to whichever organization happens to have the most recent activity.
export const CURRENT_ORG_COOKIE = "codesight_current_org";

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
