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
      <div className="flex flex-col gap-3 text-center">
        <div className="text-4xl">📬</div>
        <h2 className="text-xl font-semibold text-zinc-800">Check your inbox</h2>
        <p className="text-sm text-zinc-500">
          If an account with that email exists, a reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold text-zinc-800">Reset your password</h2>
        <p className="mt-1 text-sm text-zinc-500">Enter your email and we'll send you a reset link.</p>
      </div>
      <InputField label="Email" name="email" type="email" required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
