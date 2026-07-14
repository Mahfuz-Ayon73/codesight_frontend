import Link from "next/link";
import { CheckCircle2, MailWarning, ShieldAlert } from "lucide-react";
import AuthPageBackgroundDesign from "@/components/UI/AuthPage-Background-Design";
import Logo from "@/components/Logo/logo";
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

  return (
    <AuthPageBackgroundDesign>
      <div className="mb-6 flex justify-center"><Logo /></div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        {error ? (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              {error.toLowerCase().includes("already verified") ? (
                <ShieldAlert size={24} />
              ) : (
                <MailWarning size={24} />
              )}
            </div>
            <p className="text-sm font-medium text-zinc-800">
              {error.toLowerCase().includes("already verified") ? "Already verified" : "Verification failed"}
            </p>
            <p className="text-sm text-zinc-500">{error}</p>
            <Link
              href="/login"
              className="mt-2 inline-block rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition"
            >
              Go to login
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-500">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-sm font-medium text-zinc-800">Email verified</p>
            <p className="text-sm text-zinc-500">Your CodeSight account is now verified. You can sign in.</p>
            <Link
              href="/login"
              className="mt-2 inline-block rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition"
            >
              Sign in
            </Link>
          </div>
        )}
      </div>
    </AuthPageBackgroundDesign>
  );
}
