import Link from "next/link";
import { cookies } from "next/headers";
import { Building2, ArrowRight, AlertTriangle, LogOut } from "lucide-react";
import { organizationService } from "@/services/organization/organization.service";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";

type Props = {
  /** The org the page was trying to open. */
  organizationId: string;
  /** Raw failure from the page's own data fetch, shown only if this isn't a membership problem. */
  message: string;
};

/**
 * Shown when an org-scoped page can't load. Deliberately renders a dead-end
 * page rather than redirecting: the org you're looking at is the one you just
 * left, so any automatic "send them somewhere valid" hop races the page that
 * triggered it and ping-pongs. The user picks where to go next, explicitly.
 *
 * Every link here points at a concrete /organizations/{id} URL — never at "/"
 * or "/projects", which are redirectors and would put a resolve-then-bounce
 * step back in the loop.
 */
export default async function OrgAccessNotice({ organizationId, message }: Props) {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE)?.value;

  // Whether the org list loads at all is what tells "you were removed from
  // this one org" apart from "your session/the backend is broken" — a 401 on
  // the org itself could be either, so don't guess from the status code.
  const organizations = token
    ? await organizationService.list(token).catch(() => null)
    : null;

  const noLongerMember = organizations !== null && !organizations.some((o) => o.id === organizationId);

  return (
    <div className="flex flex-col gap-4">
      {noLongerMember ? (
        <div className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-400 border border-zinc-200">
            <LogOut size={15} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-800">
              You are no longer a member of this organization
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              You left it, or your access was removed. Your other organizations are unaffected.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>{message}</p>
        </div>
      )}

      {organizations && organizations.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
          <p className="border-b border-zinc-100 px-5 py-3 text-xs font-medium text-zinc-400">
            Your organizations
          </p>
          <div className="flex flex-col divide-y divide-zinc-100">
            {organizations.map((org) => (
              <Link
                key={org.id}
                href={`/organizations/${org.id}`}
                className="flex items-center gap-3 px-5 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition group"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-500">
                  <Building2 size={15} />
                </span>
                <span className="font-medium">{org.name}</span>
                {org.myRole === "OWNER" && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">Owner</span>
                )}
                <ArrowRight
                  size={14}
                  className="ml-auto text-zinc-300 group-hover:text-zinc-500 transition"
                />
              </Link>
            ))}
          </div>
        </div>
      ) : organizations ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-zinc-200 bg-white px-5 py-6">
          <p className="text-sm text-zinc-500">
            You aren&apos;t in any organization anymore. Create your own to keep working.
          </p>
          <Link
            href="/onboarding/create-organization"
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition"
          >
            Create an organization
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
