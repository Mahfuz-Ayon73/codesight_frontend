"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentOrgId } from "@/hooks/Organization/Organization.hooks";
import { listOrganizationsAction } from "@/actions/organization.action";
import type { Organization } from "@/types/organization/organization.schema";
import { LayoutDashboard, FolderOpen, BarChart2, Users, Settings, Plus } from "lucide-react";

const navItems = [
  { label: "My Workspace", href: "/",             icon: LayoutDashboard },
  { label: "Projects",     href: "/projects",     icon: FolderOpen },
  { label: "Visualization",href: "/visualization",icon: BarChart2 },
  { label: "Collaboration",href: "/collaboration", icon: Users },
  { label: "Settings",     href: "/settings",     icon: Settings },
];

type Props = {
  organizations: Organization[];
  /** True once the user has pressed "Skip for now" on the create-org step. */
  skippedOrgSetup?: boolean;
};

export default function Sidebar({ organizations, skippedOrgSetup = false }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  // Stay inside the currently-open organization rather than linking at the
  // bare "/" and "/projects" redirectors. The URL/cookie org can be stale (you
  // left it, or it was deleted), so fall back to an org you own, then to any
  // org you're in, and only then to the create-organization flow — resolved
  // right here, so these links never bounce through a redirect.
  const currentOrgId = useCurrentOrgId(organizations);
  const activeOrg =
    organizations.find((o) => o.id === currentOrgId) ??
    organizations.find((o) => o.myRole === "OWNER") ??
    organizations[0];

  // With no org at all there's nothing concrete to link to. Someone who has
  // skipped org setup goes to the plain routes — which render their own empty
  // state in that case — because pushing them back into the form they just
  // dismissed is exactly what "Skip for now" is supposed to stop.
  const noOrgHref = (base: string) => (skippedOrgSetup ? base : "/onboarding/create-organization");
  const workspaceHref = activeOrg ? `/organizations/${activeOrg.id}` : noOrgHref("/");
  const projectsHref = activeOrg ? `/organizations/${activeOrg.id}/projects` : noOrgHref("/projects");

  // Only an organization's OWNER may create projects in it — being invited
  // as a member only grants access to specific assigned projects, not the
  // right to add more. Re-fetch fresh (rather than trusting possibly-stale
  // props) so a just-created organization is never missed here.
  async function handleCreateProject() {
    if (checking) return;
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
          disabled={checking}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition disabled:opacity-60"
        >
          <Plus size={15} />
          Create Project
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {navItems.map(({ label, href: baseHref, icon: Icon }) => {
          const href = baseHref === "/" ? workspaceHref
            : baseHref === "/projects" ? projectsHref
            : baseHref;
          const active = baseHref === "/"
            ? pathname === "/" || /^\/organizations\/[^/]+$/.test(pathname)
            : baseHref === "/projects"
            ? pathname === "/projects" || /\/organizations\/[^/]+\/projects/.test(pathname)
            : pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={baseHref}
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
