"use server";

import { cookies } from "next/headers";
import { invitationService } from "@/services/invitation/invitation.service";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";

async function getToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) throw new Error("Not authenticated");
  return token;
}

export async function getInvitationAction(token: string) {
  return invitationService.getByToken(token);
}

export async function acceptInvitationAction(token: string) {
  const authToken = await getToken();
  return invitationService.accept(token, authToken);
}
