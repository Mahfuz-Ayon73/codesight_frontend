"use client";

import { useState } from "react";
import { forgotPasswordAction } from "@/actions/auth.action";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";

export default function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await forgotPasswordAction(String(form.get("email")));
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-zinc-600">
          If an account with that email exists, a password reset link has been sent. Check your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold">Reset your password</h1>
      <p className="text-sm text-zinc-500">Enter your email and we'll send you a reset link.</p>
      <InputField label="Email" name="email" type="email" required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
