import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";

/**
 * Empty state for the org-less redirectors ("/" and "/projects") once the user
 * has skipped org setup — a dead end they choose their way out of, rather than
 * an automatic hop back into the form they just dismissed.
 *
 * The CTA goes to /onboarding/create-organization — the same form every other
 * "you need an organization" path uses, and the one that carries a working
 * "Skip for now" — rather than opening a second, name-only create dialog of
 * its own.
 */
export default function NoOrganizationNotice() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-500">
        <Building2 size={26} />
      </div>
      <p className="text-base font-semibold text-zinc-800">You don&apos;t have an organization yet</p>
      <p className="mt-1 mb-6 max-w-sm text-sm text-zinc-400">
        An organization is a container for all your projects. Create one to get started — you can
        always create more or be invited to others later.
      </p>
      <Link
        href="/onboarding/create-organization"
        className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition"
      >
        Create your organization
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
