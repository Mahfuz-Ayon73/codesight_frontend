"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInAction, resendVerificationAction } from "@/actions/auth.action";
import { listOrganizationsAction } from "@/actions/organization.action";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
import { ApiError } from "@/lib/exception";

export default function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnverifiedEmail(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));

    try {
      await signInAction({ email, password: String(form.get("password")) });
      const orgs = await listOrganizationsAction().catch(() => []);
      if (orgs.length === 0) {
        router.push("/onboarding/create-organization");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setUnverifiedEmail(email);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Sign in failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!unverifiedEmail) return;
    setResendStatus("sending");
    try {
      await resendVerificationAction(unverifiedEmail);
      setResendStatus("sent");
    } catch {
      setResendStatus("idle");
      setError("Failed to resend verification email. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <InputField label="Email" name="email" type="email" required/>
      <InputField label="Password" name="password" type="password" required/>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <p>{error}</p>
          {unverifiedEmail && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendStatus !== "idle"}
              className="mt-1 font-medium underline disabled:opacity-50"
            >
              {resendStatus === "sending"
                ? "Sending…"
                : resendStatus === "sent"
                ? "Email sent — check your inbox"
                : "Resend verification email"}
            </button>
          )}
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        <Link href="/forgot-password" className="underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
