import Link from "next/link";
import AuthPageBackgroundDesign from "@/components/UI/AuthPage-Background-Design";
import ResetPasswordForm from "@/components/Authentication/ResetPasswordForm";
import Logo from "@/components/Logo/logo";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";

  return (
    <AuthPageBackgroundDesign>
      <div className="mb-6 flex justify-center"><Logo /></div>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-red-600">Invalid or missing reset token.</p>
          <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium underline">
            Request a new link
          </Link>
        </div>
      )}
    </AuthPageBackgroundDesign>
  );
}
