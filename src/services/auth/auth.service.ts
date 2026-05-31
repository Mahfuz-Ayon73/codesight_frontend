import { apiFetch } from "@/api-methods/api-methods";
import type { AuthResponse, SignInInput, SignUpInput, User } from "@/types/auth/auth.schema";

export const authService = {
  login: (data: SignInInput) =>
    apiFetch<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  register: (data: SignUpInput) =>
    apiFetch<User>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyEmail: (token: string) =>
    apiFetch<void>(`/api/v1/auth/verify?token=${encodeURIComponent(token)}`),

  resendVerification: (email: string) =>
    apiFetch<{ message: string }>("/api/v1/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    apiFetch<{ message: string }>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),
};
