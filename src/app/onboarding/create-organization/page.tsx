import { getProfileAction } from "@/actions/user.action";
import CreateOrgForm from "@/components/Organization/CreateOrgForm";

export default async function OnboardingCreateOrgPage() {
  const user = await getProfileAction().catch(() => null);
  const firstName = user?.firstName ?? "My";

  // No step indicator: creating an organization is the whole flow now, and
  // project creation happens later from the org's own Projects page.
  return (
    <div className="w-full max-w-md">
      <CreateOrgForm firstName={firstName} />
    </div>
  );
}
