import Link from "next/link";
import AuthPageBackgroundDesign from "@/components/UI/AuthPage-Background-Design";
import SignInForm from "@/components/Authentication/SignInForm";

export default function LoginPage() {
  return (
    <AuthPageBackgroundDesign maxWidth="max-w-4xl">
      <div className="flex w-full min-h-[450px] overflow-hidden rounded-2xl border border-white/30 bg-white/20 shadow-2xl backdrop-blur-md">

        {/* Left — branding */}
        <div className="flex flex-1 flex-col justify-center gap-5 px-14 py-16">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-800">
            Code<span className="text-cyan-500">Sight</span>
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600">
            Analyze your codebase, track quality metrics, and collaborate with your team — all in one place.
          </p>
          <p className="mt-6 text-xs text-zinc-500">
            No account?{" "}
            <Link href="/signup" className="font-medium text-cyan-600 underline underline-offset-2">
              Sign up for free
            </Link>
          </p>
        </div>

        {/* Divider */}
        <div className="w-px h-64 my-auto bg-gray-300/70" />

        {/* Right — form */}
        <div className="flex flex-1 flex-col justify-center px-14 py-16">
          <h2 className="mb-6 text-xl font-semibold text-zinc-800 text-center">Sign in to your Account</h2>
          <SignInForm />
        </div>

      </div>
    </AuthPageBackgroundDesign>
  );
}
