"use server";

import { cookies } from "next/headers";
import { projectService } from "@/services/project/project.service";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";
import type {
  CreateProjectInput,
  InviteProjectMemberInput,
  UpdateProjectMemberRoleInput,
} from "@/types/project/project.schema";

async function getToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) throw new Error("Not authenticated");
  return token;
}

export async function listProjectsAction(orgId: string) {
  const token = await getToken();
  return projectService.list(token, orgId);
}

export async function createProjectAction(orgId: string, data: CreateProjectInput) {
  const token = await getToken();
  return projectService.create(token, orgId, data);
}

export async function getProjectAction(orgId: string, projectId: string) {
  const token = await getToken();
  return projectService.getById(token, orgId, projectId);
}

export async function deleteProjectAction(orgId: string, projectId: string) {
  const token = await getToken();
  return projectService.delete(token, orgId, projectId);
}

export async function listProjectMembersAction(orgId: string, projectId: string) {
  const token = await getToken();
  return projectService.listMembers(token, orgId, projectId);
}

export async function inviteProjectMemberAction(
  orgId: string,
  projectId: string,
  data: InviteProjectMemberInput
) {
  const token = await getToken();
  return projectService.inviteMember(token, orgId, projectId, data);
}

export async function updateProjectMemberRoleAction(
  orgId: string,
  projectId: string,
  userId: string,
  data: UpdateProjectMemberRoleInput
) {
  const token = await getToken();
  return projectService.updateMemberRole(token, orgId, projectId, userId, data);
}

export async function removeProjectMemberAction(
  orgId: string,
  projectId: string,
  userId: string
) {
  const token = await getToken();
  return projectService.removeMember(token, orgId, projectId, userId);
}
