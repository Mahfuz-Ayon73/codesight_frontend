import { organizationService } from "@/services/organization/organization.service";
import { userService } from "@/services/user/user.service";
import type { Organization } from "@/types/organization/organization.schema";

// Picks which organization a bare, non-org-scoped route (like "/" or
// "/projects") should redirect into: the org the user last switched to
// (persisted server-side so it survives logins/devices). If that pick is
// missing or no longer valid (left/deleted since), prefer an org they own
// over one they were merely invited to, then any org at all. Returns null if
// the user has no organizations, which callers send to the create-org flow.
export async function resolveDefaultOrganization(token: string): Promise<Organization | null> {
  const [profile, organizations] = await Promise.all([
    userService.getProfile(token).catch(() => null),
    organizationService.list(token).catch(() => []),
  ]);

  if (organizations.length === 0) return null;

  const lastOrg = profile?.lastOrganizationId
    ? organizations.find((o) => o.id === profile.lastOrganizationId)
    : undefined;

  return lastOrg ?? organizations.find((o) => o.myRole === "OWNER") ?? organizations[0];
}
