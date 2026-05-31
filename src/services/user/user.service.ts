import { apiFetch } from "@/api-methods/api-methods";
import type { User } from "@/types/auth/auth.schema";

export const userService = {
  getProfile: (token: string) =>
    apiFetch<User>("/api/v1/users/profile", {
      headers: { Authorization: `Bearer ${token}` },
    }),
};
