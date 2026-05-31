"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";
import OrgSwitcher from "@/components/navbar/OrgSwitcher";

export default function Navbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 gap-4">
      {/* Left: Logo */}
      <Link href="/" className="flex items-center gap-2 min-w-[160px]">
        <span className="text-lg font-bold tracking-tight text-zinc-900">
          Code<span className="text-cyan-500">Sight</span>
        </span>
      </Link>

      {/* Center: Org switcher + Search */}
      <div className="flex flex-1 items-center gap-3 max-w-xl">
        <OrgSwitcher />
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-400">
          <Search size={14} />
          <span>Search...</span>
          <span className="ml-auto text-xs text-zinc-300">/</span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        <button className="rounded-full p-1.5 hover:bg-zinc-100 text-zinc-500">
          <Bell size={18} />
        </button>
        <div className="h-8 w-8 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-semibold">
          U
        </div>
      </div>
    </header>
  );
}
