"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOrganizations, useCurrentOrgId } from "@/hooks/Organization/Organization.hooks";
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

  // Stay inside the currently-open organization's project list rather than
  // sending the user to the cross-org /projects view, which mixes in other
  // organizations' projects and looks like an accidental org switch. Uses
  // the same URL-or-cookie resolution as the org switcher so this stays
  // correct even from pages (like "/") with no org id in the URL.
  // The cookie/URL-derived org id can go stale (e.g. the org was deleted, or
  // the user was removed from it) — only trust it if it's still one of the
  // user's actual organizations, otherwise fall back to the cross-org view
  // so it lands on the "create organization" empty state instead of a
  // "not a member of this organization" error.
  const currentOrgId = useCurrentOrgId();
  const currentOrgValid = !loading && organizations.some((o) => o.id === currentOrgId);
  const projectsHref = currentOrgValid ? `/organizations/${currentOrgId}/projects` : "/projects";

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
        {navItems.map(({ label, href: baseHref, icon: Icon }) => {
          const href = baseHref === "/projects" ? projectsHref : baseHref;
          const active = baseHref === "/projects"
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
