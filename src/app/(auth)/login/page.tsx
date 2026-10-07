import Link from "next/link";
import AuthPageBackgroundDesign from "@/components/UI/AuthPage-Background-Design";
import SignInForm from "@/components/Authentication/SignInForm";

type Props = { searchParams: Promise<{ registered?: string; redirect?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { registered, redirect } = await searchParams;

  return (
    <AuthPageBackgroundDesign maxWidth="max-w-4xl">
      <div className="auth-shell flex w-full min-h-[450px] flex-col overflow-hidden rounded-2xl md:flex-row">

        {/* Left — branding */}
        <div className="auth-brand-panel flex flex-1 flex-col justify-center gap-5 px-8 py-10 md:px-14 md:py-16">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-800">
            Code<span className="text-cyan-500">Sight</span>
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600">
            Analyze your codebase, track quality metrics, and collaborate with your team — all in one place.
          </p>
          <p className="mt-6 text-xs text-zinc-500">
            No account?{" "}
            <Link
              href={redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : "/signup"}
              className="font-medium text-cyan-600 underline underline-offset-2"
            >
              Sign up for free
            </Link>
          </p>
        </div>

        {/* Divider */}
        <div className="auth-divider h-px mx-8 md:mx-0 md:h-64 md:w-px md:my-auto" />

        {/* Right — form */}
        <div className="auth-form-panel flex flex-1 flex-col justify-center px-8 py-10 md:px-14 md:py-16">
          {registered ? (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              Account created! Check your email to verify before signing in.
            </div>
          ) : null}
          <h2 className="mb-1 text-xl font-semibold text-zinc-800 text-center">Welcome to CodeSight</h2>
          <p className="mb-4 text-sm font-normal text-zinc-500 text-center">Login to your Account</p>
          <SignInForm redirectTo={redirect} />
        </div>

      </div>
    </AuthPageBackgroundDesign>
  );
}
