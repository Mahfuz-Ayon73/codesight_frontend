import { apiFetch } from "@/api-methods/api-methods";
import type { CreateOrganizationInput, Organization } from "@/types/organization/organization.schema";

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
};
