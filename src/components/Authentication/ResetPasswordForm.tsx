"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/actions/auth.action";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("newPassword"));
    const confirm = String(form.get("confirm"));

    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordAction(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-zinc-600">Password reset successfully.</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold">Set a new password</h1>
      <InputField label="New password" name="newPassword" type="password" required />
      <InputField label="Confirm password" name="confirm" type="password" required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Reset password"}
      </Button>
    </form>
  );
}
