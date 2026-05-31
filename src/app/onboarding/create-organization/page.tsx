import { getProfileAction } from "@/actions/user.action";
import CreateOrgForm from "@/components/Organization/CreateOrgForm";

export default async function OnboardingCreateOrgPage() {
  const user = await getProfileAction().catch(() => null);
  const firstName = user?.firstName ?? "My";

  return (
    <div className="w-full max-w-md">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        <StepDot active />
        <div className="h-px flex-1 bg-zinc-200" />
        <StepDot />
      </div>
      <CreateOrgForm firstName={firstName} />
    </div>
  );
}

function StepDot({ active }: { active?: boolean }) {
  return (
    <div className={`h-2.5 w-2.5 rounded-full ${active ? "bg-cyan-500" : "bg-zinc-200"}`} />
  );
}
