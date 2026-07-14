import { apiFetch } from "@/api-methods/api-methods";
import type { Invitation } from "@/types/organization/organization.schema";

export const invitationService = {
  // Public — viewable before the invitee has logged in or signed up.
  getByToken: (token: string) =>
    apiFetch<Invitation>(`/api/v1/invitations/${token}`),
  accept: (token: string, authToken: string) =>
    apiFetch<Invitation>(`/api/v1/invitations/${token}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    }),
};
