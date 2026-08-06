import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_TOKEN_COOKIE, SKIPPED_ORG_SETUP_COOKIE } from "@/utils/cookie";
import { resolveDefaultOrganization } from "./_lib/resolveDefaultOrganization";
import NoOrganizationNotice from "@/components/Organization/NoOrganizationNotice";

// Data is user/session-scoped; never let the client Router Cache reuse a
// render from a different account.
export const dynamic = "force-dynamic";

// "/" is not itself a workspace — it just resolves which organization the
// user should land in (last switched, else their first) and hands off to
// that org's own workspace at /organizations/{id}, so every real page in
// the app stays scoped to a single organization. The one case it renders
// anything itself is when the user has no organization *and* has already
// declined to create one.
export default async function RootRedirectPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) redirect("/login");

  const org = await resolveDefaultOrganization(token);
  if (org) redirect(`/organizations/${org.id}`);

  // Nothing to open. Handing off to the create-organization flow is right for
  // someone who hasn't seen it — but not for someone who just pressed "Skip
  // for now" there, since "/" is where that skip lands: it bounced them
  // straight back into the form they dismissed, with no way out. So render a
  // dead-end empty state instead and let them choose, exactly like
  // OrgAccessNotice does.
  if (!cookieStore.get(SKIPPED_ORG_SETUP_COOKIE)?.value) {
    redirect("/onboarding/create-organization");
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">My Workspace</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Projects, analyses and teammates all live inside an organization.
        </p>
      </div>
      <NoOrganizationNotice />
    </div>
  );
}
