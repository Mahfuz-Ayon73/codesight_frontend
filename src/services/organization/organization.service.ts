import { apiFetch } from "@/api-methods/api-methods";
import type {
  CreateOrganizationInput,
  CreateInvitationInput,
  Invitation,
  Organization,
  OrganizationMember,
} from "@/types/organization/organization.schema";

export const organizationService = {
  list: (token: string) =>
    apiFetch<Organization[]>("/api/v1/organizations", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  create: (token: string, data: CreateOrganizationInput) =>
    apiFetch<Organization>("/api/v1/organizations", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),
  getById: (token: string, id: string) =>
    apiFetch<Organization>(`/api/v1/organizations/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  listMembers: (token: string, id: string) =>
    apiFetch<OrganizationMember[]>(`/api/v1/organizations/${id}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  delete: (token: string, id: string) =>
    apiFetch<void>(`/api/v1/organizations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
  inviteMember: (token: string, id: string, data: CreateInvitationInput) =>
    apiFetch<Invitation>(`/api/v1/organizations/${id}/invitations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),
};
