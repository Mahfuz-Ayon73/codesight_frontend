"use client";

import { useState } from "react";
import { changePasswordAction } from "@/actions/user.action";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";

export default function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = new FormData(e.currentTarget);
    const currentPassword = String(form.get("currentPassword"));
    const newPassword = String(form.get("newPassword"));
    const confirm = String(form.get("confirm"));

    if (newPassword !== confirm) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await changePasswordAction(currentPassword, newPassword);
      setSuccess("Password changed successfully.");
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-zinc-900">Change password</h2>
      <InputField label="Current password" name="currentPassword" type="password" required />
      <InputField label="New password" name="newPassword" type="password" required minLength={8} />
      <InputField label="Confirm new password" name="confirm" type="password" required minLength={8} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-cyan-600">{success}</p>}
      <Button type="submit" disabled={loading} className="self-start">
        {loading ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
