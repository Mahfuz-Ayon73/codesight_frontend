import type { Organization } from "@/types/organization/organization.schema";

/**
 * Where to send someone who just lost access to the org they were in (left it,
 * or deleted it): their own organization first, then any org they're still a
 * member of, and the create-organization flow if they're now in none.
 *
 * Always returns a concrete URL. Callers must never fall back to "/" or
 * "/projects" — those are redirectors that re-resolve a target server-side,
 * and doing that while the page that triggered the move is still settling is
 * what made leaving an org ping-pong between routes.
 */
export function nextOrgDestination(organizations: Organization[]): string {
  const target = organizations.find((o) => o.myRole === "OWNER") ?? organizations[0];
  return target ? `/organizations/${target.id}` : "/onboarding/create-organization";
}
