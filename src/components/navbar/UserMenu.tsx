"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User as UserIcon } from "lucide-react";
import { signOutAction } from "@/actions/auth.action";
import type { User } from "@/types/auth/auth.schema";

type Props = {
  user: User;
};

export default function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setOpen(false);
    await signOutAction();
    router.push("/login");
    router.refresh();
  }

  const displayName = user.username || user.firstName;
  const initial = (user.username?.[0] ?? user.firstName?.[0] ?? "U").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-2 pr-1 hover:bg-zinc-100 transition"
      >
        <span className="max-w-[120px] truncate text-sm font-medium text-zinc-700">
          {displayName}
        </span>
        <div className="h-8 w-8 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {initial}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-zinc-200 bg-white py-1.5 shadow-lg z-50">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition"
          >
            <UserIcon size={15} />
            Profile
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
