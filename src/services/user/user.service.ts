import { apiFetch } from "@/api-methods/api-methods";
import type { User } from "@/types/auth/auth.schema";

export const userService = {
  getProfile: (token: string) =>
    apiFetch<User>("/api/v1/users/profile", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    apiFetch<{ message: string }>("/api/v1/users/password", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  setLastOrganization: (token: string, organizationId: string) =>
    apiFetch<{ message: string }>("/api/v1/users/last-organization", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ organizationId }),
    }),
};
