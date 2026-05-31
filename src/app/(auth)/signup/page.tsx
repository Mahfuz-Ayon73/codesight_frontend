import Link from "next/link";
import AuthPageBackgroundDesign from "@/components/UI/AuthPage-Background-Design";
import SignUpForm from "@/components/Authentication/SignUpForm";
import Logo from "@/components/Logo/logo";

export default function SignupPage() {
  return (
    <AuthPageBackgroundDesign>
      <div className="mb-6 flex justify-center"><Logo /></div>
      <SignUpForm />
      <p className="mt-4 text-center text-sm text-zinc-600">
        Have an account? <Link href="/login" className="font-medium underline">Sign in</Link>
      </p>
    </AuthPageBackgroundDesign>
  );
}
