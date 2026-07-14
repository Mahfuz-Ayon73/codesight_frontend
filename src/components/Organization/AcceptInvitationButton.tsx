"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitationAction } from "@/actions/invitation.action";
import Button from "@/components/Button/Button";

type Props = {
  token: string;
  organizationId: string;
};

export default function AcceptInvitationButton({ token, organizationId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      await acceptInvitationAction(token);
      router.push(`/organizations/${organizationId}/projects`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="button" onClick={handleAccept} disabled={loading} className="w-full">
        {loading ? "Accepting…" : "Accept invitation"}
      </Button>
    </div>
  );
}
