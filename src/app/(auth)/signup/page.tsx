import { Suspense } from "react";
import Link from "next/link";
import AuthPageBackgroundDesign from "@/components/UI/AuthPage-Background-Design";
import SignUpForm from "@/components/Authentication/SignUpForm";

type Props = { searchParams: Promise<{ email?: string; redirect?: string }> };

export default async function SignupPage({ searchParams }: Props) {
  const { redirect } = await searchParams;
  const loginHref = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";
  return (
    <AuthPageBackgroundDesign maxWidth="max-w-[950px]">
      <div className="auth-shell flex w-full min-h-[450px] flex-col overflow-hidden rounded-2xl md:flex-row">

        {/* Left — branding */}
        <div className="auth-brand-panel flex flex-[0.7] flex-col justify-center gap-5 px-8 py-10 md:px-10 md:py-16">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-800">
            Code<span className="text-cyan-500">Sight</span>
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600">
            Analyze your codebase, track quality metrics, and collaborate with your team — all in one place.
          </p>
          <p className="mt-6 text-xs text-zinc-500">
            Already have an account?{" "}
            <Link href={loginHref} className="font-medium text-cyan-600 underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>

        {/* Divider */}
        <div className="auth-divider h-px mx-8 md:mx-0 md:h-64 md:w-px md:my-auto" />

        {/* Right — form */}
        <div className="auth-form-panel flex flex-[0.85] flex-col justify-center px-6 py-10 md:py-16">
          <h2 className="mb-6 text-xl font-semibold text-zinc-800 text-center">Create your Account</h2>
          <Suspense>
            <SignUpForm />
          </Suspense>
        </div>

      </div>
    </AuthPageBackgroundDesign>
  );
}
