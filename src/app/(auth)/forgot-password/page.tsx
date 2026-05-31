import Link from "next/link";
import AuthPageBackgroundDesign from "@/components/UI/AuthPage-Background-Design";
import ForgotPasswordForm from "@/components/Authentication/ForgotPasswordForm";
import Logo from "@/components/Logo/logo";

export default function ForgotPasswordPage() {
  return (
    <AuthPageBackgroundDesign>
      <div className="mb-6 flex justify-center"><Logo /></div>
      <ForgotPasswordForm />
      <p className="mt-4 text-center text-sm text-zinc-600">
        Remember it? <Link href="/login" className="font-medium underline">Sign in</Link>
      </p>
    </AuthPageBackgroundDesign>
  );
}
