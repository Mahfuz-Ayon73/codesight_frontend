"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitationAction } from "@/actions/invitation.action";
import { setLastOrganizationAction } from "@/actions/user.action";
import { setCurrentOrganization } from "@/utils/cookie";
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
      const invitation = await acceptInvitationAction(token);
      const destination = invitation.projectId
        ? `/organizations/${organizationId}/projects/${invitation.projectId}`
        : `/organizations/${organizationId}/projects`;
      // Make the newly-joined org "current". Awaited deliberately: left
      // fire-and-forget, this request resolves against the invitation route
      // while router.push() is mid-flight and the app lands back here — with
      // the invitation already consumed, so retrying reports it as invalid.
      setCurrentOrganization(organizationId);
      await setLastOrganizationAction(organizationId).catch(() => {});
      router.push(destination);
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
