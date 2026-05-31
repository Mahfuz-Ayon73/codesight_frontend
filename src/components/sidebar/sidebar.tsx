"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, BarChart2, Users, Settings, Plus } from "lucide-react";

const navItems = [
  { label: "My Workspace", href: "/",                    icon: LayoutDashboard },
  { label: "Projects",      href: "/projects",            icon: FolderOpen },
  { label: "Visualization", href: "/visualization",       icon: BarChart2 },
  { label: "Collaboration", href: "/collaboration",       icon: Users },
  { label: "Settings",      href: "/settings",            icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-52 flex-col border-r border-zinc-200 bg-white">
      {/* Create project CTA */}
      <div className="p-3 border-b border-zinc-100">
        <Link
          href="/create-organization"
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition"
        >
          <Plus size={15} />
          Create Project
        </Link>
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
