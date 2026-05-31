"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signUpAction } from "@/actions/auth.action";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";

export default function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirmPassword"))) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await signUpAction({
        firstName: String(form.get("firstName")),
        lastName: String(form.get("lastName")),
        email: String(form.get("email")),
        password,
      });
      // Redirect to login with a hint to verify email
      router.push("/login?registered=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">

      <InputField label="First name" name="firstName" required />
      <InputField label="Last name" name="lastName" required />

      <div className="col-span-2">
        <InputField label="Email" name="email" type="email" required />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">Password</label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            className="w-full rounded-lg border border-zinc-300/60 bg-white/40 px-3 py-2 pr-9 text-sm outline-none placeholder:text-zinc-400 focus:border-cyan-400 focus:bg-white/60 focus:ring-1 focus:ring-cyan-400 transition"
          />
          <button type="button" onClick={() => setShowPassword(v => !v)}
            className="absolute inset-y-0 right-2 flex items-center text-zinc-400 hover:text-zinc-600" tabIndex={-1}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">Confirm password</label>
        <div className="relative">
          <input
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            required
            className="w-full rounded-lg border border-zinc-300/60 bg-white/40 px-3 py-2 pr-9 text-sm outline-none placeholder:text-zinc-400 focus:border-cyan-400 focus:bg-white/60 focus:ring-1 focus:ring-cyan-400 transition"
          />
          <button type="button" onClick={() => setShowConfirm(v => !v)}
            className="absolute inset-y-0 right-2 flex items-center text-zinc-400 hover:text-zinc-600" tabIndex={-1}>
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}

      <div className="col-span-2">
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Sign up"}
        </Button>
      </div>

    </form>
  );
}
