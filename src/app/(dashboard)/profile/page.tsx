import { redirect } from "next/navigation";
import { getProfileAction } from "@/actions/user.action";
import { listOrganizationsAction } from "@/actions/organization.action";
import ChangePasswordForm from "@/components/Profile/ChangePasswordForm";
import ProfileOrganizationSection from "@/components/Organization/ProfileOrganizationSection";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getProfileAction().catch(() => null);
  if (!user) redirect("/login");

  const organizations = await listOrganizationsAction().catch(() => []);

  const initial = (user.username?.[0] ?? user.firstName?.[0] ?? "U").toUpperCase();

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your account details and security.</p>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="h-14 w-14 rounded-full bg-cyan-500 flex items-center justify-center text-white text-lg font-semibold shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold text-zinc-900 truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-sm text-zinc-500 truncate">@{user.username}</p>
          <p className="text-sm text-zinc-400 truncate">{user.email}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Organization</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {organizations.length > 0
            ? "Organizations you belong to. Only owners can delete an organization."
            : "You don't belong to an organization yet."}
        </p>
        <div className="mt-4">
          <ProfileOrganizationSection organizations={organizations} />
        </div>
      </div>

      <ChangePasswordForm />
    </div>
  );
}
