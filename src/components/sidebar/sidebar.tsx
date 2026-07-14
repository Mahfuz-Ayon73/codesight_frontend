"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOrganizations } from "@/hooks/Organization/Organization.hooks";
import { listOrganizationsAction } from "@/actions/organization.action";
import { LayoutDashboard, FolderOpen, BarChart2, Users, Settings, Plus } from "lucide-react";

const navItems = [
  { label: "My Workspace", href: "/",             icon: LayoutDashboard },
  { label: "Projects",     href: "/projects",     icon: FolderOpen },
  { label: "Visualization",href: "/visualization",icon: BarChart2 },
  { label: "Collaboration",href: "/collaboration", icon: Users },
  { label: "Settings",     href: "/settings",     icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { organizations, loading } = useOrganizations();
  const [checking, setChecking] = useState(false);

  // Only an organization's OWNER may create projects in it — being invited
  // as a member only grants access to specific assigned projects, not the
  // right to add more. Re-fetch fresh (rather than trusting possibly-stale
  // hook state) so a just-created organization is never missed here.
  async function handleCreateProject() {
    if (loading || checking) return;
    setChecking(true);
    try {
      const freshOrgs = await listOrganizationsAction().catch(() => organizations);
      const ownedOrgId = freshOrgs?.find((o) => o.myRole === "OWNER")?.id;
      if (ownedOrgId) {
        router.push(`/organizations/${ownedOrgId}/projects/new`);
      } else {
        router.push("/onboarding/create-organization");
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <aside className="flex w-52 flex-col border-r border-zinc-200 bg-white h-full">
      {/* Create project CTA */}
      <div className="p-3 border-b border-zinc-100">
        <button
          onClick={handleCreateProject}
          disabled={loading || checking}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition disabled:opacity-60"
        >
          <Plus size={15} />
          Create Project
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                active ? "bg-cyan-50 text-cyan-600 font-medium" : "text-zinc-600 hover:bg-zinc-100"
              ].join(" ")}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
