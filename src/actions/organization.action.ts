"use server";

import { cookies } from "next/headers";
import { organizationService } from "@/services/organization/organization.service";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";
import type { CreateOrganizationInput } from "@/types/organization/organization.schema";

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

export async function createOrganizationAction(data: CreateOrganizationInput) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  return organizationService.create(token, data);
}

export async function listOrganizationsAction() {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  return organizationService.list(token);
}
