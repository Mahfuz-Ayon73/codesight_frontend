import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_TOKEN_COOKIE, SKIPPED_ORG_SETUP_COOKIE } from "@/utils/cookie";
import { resolveDefaultOrganization } from "../_lib/resolveDefaultOrganization";
import NoOrganizationNotice from "@/components/Organization/NoOrganizationNotice";

// Data is user/session-scoped; never let the client Router Cache reuse a
// render from a different account.
export const dynamic = "force-dynamic";

// The cross-org project list used to live here, but that let a stale link
// or bookmark surface other organizations' projects. Projects are always
// viewed inside an organization now — resolve which one and hand off.
export default async function ProjectsRedirectPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) redirect("/login");

  const org = await resolveDefaultOrganization(token);
  if (org) redirect(`/organizations/${org.id}/projects`);

  // No organization to scope a project list to. Same rule as "/": send a
  // first-timer into the create-organization flow, but never someone who
  // already declined it there — that's the loop "Skip for now" fell into.
  if (!cookieStore.get(SKIPPED_ORG_SETUP_COOKIE)?.value) {
    redirect("/onboarding/create-organization");
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Projects</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Projects are always viewed inside an organization.
        </p>
      </div>
      <NoOrganizationNotice />
    </div>
  );
}
