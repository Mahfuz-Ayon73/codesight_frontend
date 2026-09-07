"use server";

import { cookies } from "next/headers";
import { userService } from "@/services/user/user.service";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";

export async function getProfileAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) throw new Error("Not authenticated");
  return userService.getProfile(token);
}

export async function changePasswordAction(currentPassword: string, newPassword: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) throw new Error("Not authenticated");
  return userService.changePassword(token, currentPassword, newPassword);
}

export async function setLastOrganizationAction(organizationId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) throw new Error("Not authenticated");
  return userService.setLastOrganization(token, organizationId);
}
