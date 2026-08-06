"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrganizationAction } from "@/actions/organization.action";
import { setLastOrganizationAction } from "@/actions/user.action";
import { setCurrentOrganization } from "@/utils/cookie";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";

export default function OrganizationCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const name = String(new FormData(e.currentTarget).get("name"));
    try {
      const org = await createOrganizationAction({ name });
      setCurrentOrganization(org.id);
      // Awaited, not fire-and-forget: an in-flight request resolving against
      // this route while router.push() is mid-flight has bounced the app
      // back here.
      await setLastOrganizationAction(org.id).catch(() => {});
      router.push(`/organizations/${org.id}/projects`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <InputField label="Organization name" name="name" required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create organization"}</Button>
    </form>
  );
}
