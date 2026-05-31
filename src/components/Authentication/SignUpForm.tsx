"use client";

import { useState } from "react";
import Link from "next/link";
import { signUpAction } from "@/actions/auth.action";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";

export default function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await signUpAction({
        firstName: String(form.get("firstName")),
        lastName: String(form.get("lastName")),
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-zinc-600">Check your email to verify your account.</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium underline">Sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold">Create account</h1>
      <InputField label="First name" name="firstName" required />
      <InputField label="Last name" name="lastName" required />
      <InputField label="Email" name="email" type="email" required />
      <InputField label="Password" name="password" type="password" required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Sign up"}</Button>
    </form>
  );
}
