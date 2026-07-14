"use client";

import { useState } from "react";
import { Bell, UserPlus } from "lucide-react";
import Link from "next/link";
import OrgSwitcher from "@/components/navbar/OrgSwitcher";
import InviteDialog from "@/components/Organization/InviteDialog";

export default function Navbar() {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 gap-4">
      {/* Left: Logo */}
      <Link href="/" className="flex items-center gap-2 min-w-[160px]">
        <span className="text-lg font-bold tracking-tight text-zinc-900">
          Code<span className="text-cyan-500">Sight</span>
        </span>
      </Link>

      {/* Center: Org switcher + Invite */}
      <div className="flex flex-1 items-center gap-3 max-w-xl">
        <OrgSwitcher />
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-600 transition"
        >
          <UserPlus size={14} />
          Invite
        </button>
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

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </header>
  );
}
