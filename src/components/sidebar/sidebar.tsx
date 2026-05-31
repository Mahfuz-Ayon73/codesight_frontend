import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="flex w-56 flex-col gap-1 border-r border-zinc-200 p-4 text-sm">
      <Link href="/" className="rounded px-2 py-1.5 hover:bg-zinc-100">Dashboard</Link>
      <Link href="/create-organization" className="rounded px-2 py-1.5 hover:bg-zinc-100">New organization</Link>
    </aside>
  );
}
