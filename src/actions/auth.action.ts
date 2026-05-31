"use server";

import { cookies } from "next/headers";
import { authService } from "@/services/auth/auth.service";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";
import type { SignInInput, SignUpInput } from "@/types/auth/auth.schema";

export async function signInAction(data: SignInInput) {
  const res = await authService.login(data);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_TOKEN_COOKIE, res.token, { httpOnly: true, path: "/" });
  return res.user;
}

export async function signUpAction(data: SignUpInput) {
  return authService.register(data);
}

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_TOKEN_COOKIE);
}

export async function resendVerificationAction(email: string) {
  return authService.resendVerification(email);
}

export async function forgotPasswordAction(email: string) {
  return authService.forgotPassword(email);
}

export async function resetPasswordAction(token: string, newPassword: string) {
  return authService.resetPassword(token, newPassword);
}
