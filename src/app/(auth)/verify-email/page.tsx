import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, MailWarning, ShieldCheck } from "lucide-react";
import AuthPageBackgroundDesign from "@/components/UI/AuthPage-Background-Design";
import { verifyEmailAction } from "@/actions/auth.action";
import { ApiError } from "@/lib/exception";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let error: string | null = null;
  if (!token) {
    error = "This verification link is missing its token.";
  } else {
    try {
      await verifyEmailAction(token);
    } catch (e) {
      error = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Failed to verify email.";
    }
  }

  const alreadyVerified = error?.toLowerCase().includes("already verified") ?? false;
  const successful = !error || alreadyVerified;

  return (
    <AuthPageBackgroundDesign maxWidth="max-w-xl">
      <main className="auth-shell w-full overflow-hidden rounded-xl" aria-live="polite">
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-300" />

        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="mb-9 flex items-center justify-between gap-4">
            <Link href="/login" className="text-2xl font-bold tracking-tight text-zinc-900">
              Code<span className="text-cyan-500">Sight</span>
            </Link>
            <span className="rounded-md border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
              Email verification
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div
              className={`mb-5 flex h-14 w-14 items-center justify-center rounded-xl border ${
                successful
                  ? "border-cyan-200 bg-cyan-50 text-cyan-600"
                  : "border-red-200 bg-red-50 text-red-600"
              }`}
            >
              {successful ? <CheckCircle2 size={28} /> : <MailWarning size={28} />}
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600">
              {successful ? "Account ready" : "Action needed"}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {!error ? "Email verified" : alreadyVerified ? "Already verified" : "Verification failed"}
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">
              {!error
                ? "Your CodeSight account is verified. You can now sign in and start exploring your codebase."
                : alreadyVerified
                  ? "This email is already connected to a verified CodeSight account. You can continue to sign in."
                  : error}
            </p>

            <Link
              href="/login"
              className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
            >
              {successful ? "Continue to sign in" : "Return to sign in"}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-9 grid grid-cols-2 gap-3 border-t border-zinc-200 pt-5 text-left">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 shrink-0 text-cyan-600" size={17} aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-zinc-700">Secure verification</p>
                <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">Protected account activation</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock3 className="mt-0.5 shrink-0 text-cyan-600" size={17} aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-zinc-700">One quick step</p>
                <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">Then your workspace is ready</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AuthPageBackgroundDesign>
  );
}
