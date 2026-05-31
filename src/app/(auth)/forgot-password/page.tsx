import Link from "next/link";
import AuthPageBackgroundDesign from "@/components/UI/AuthPage-Background-Design";
import ForgotPasswordForm from "@/components/Authentication/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthPageBackgroundDesign maxWidth="max-w-4xl">
      <div className="flex w-full min-h-[400px] overflow-hidden rounded-2xl border border-white/30 bg-white/20 shadow-2xl backdrop-blur-md">

        {/* Left — branding */}
        <div className="flex flex-[0.7] flex-col justify-center gap-5 px-10 py-16">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-800">
            Code<span className="text-cyan-500">Sight</span>
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600">
            No worries — happens to the best of us. Enter your email and we'll get you back in.
          </p>
          <p className="mt-6 text-xs text-zinc-500">
            Remember it?{" "}
            <Link href="/login" className="font-medium text-cyan-600 underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>

        {/* Divider */}
        <div className="w-px h-48 my-auto bg-gray-300/70" />

        {/* Right — form */}
        <div className="flex flex-[0.7] flex-col justify-center px-10 py-16">
          <ForgotPasswordForm />
        </div>

      </div>
    </AuthPageBackgroundDesign>
  );
}
