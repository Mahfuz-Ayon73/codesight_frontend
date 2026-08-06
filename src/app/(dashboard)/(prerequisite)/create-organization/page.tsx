import OrganizationCreateForm from "@/components/Organization/OrganizationCreateForm";
import SkipOrgSetupLink from "@/components/Organization/SkipOrgSetupLink";

export default function CreateOrganizationPage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">Create an organization</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Organizations group your projects and team members together.
      </p>
      <OrganizationCreateForm />
      <p className="mt-4 text-sm text-zinc-400">
        Want to do this later?{" "}
        <SkipOrgSetupLink className="text-cyan-600 underline underline-offset-2" />
      </p>
    </div>
  );
}
