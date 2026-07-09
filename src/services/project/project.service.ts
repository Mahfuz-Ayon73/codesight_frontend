import { apiFetch } from "@/api-methods/api-methods";
import type {
  Project,
  ProjectMember,
  CreateProjectInput,
  UpdateProjectInput,
  InviteProjectMemberInput,
  UpdateProjectMemberRoleInput,
  Blueprint,
} from "@/types/project/project.schema";

const base = (orgId: string) => `/api/v1/organizations/${orgId}/projects`;

export const projectService = {
  list: (token: string, orgId: string) =>
    apiFetch<Project[]>(base(orgId), {
      headers: { Authorization: `Bearer ${token}` },
    }),

  create: (token: string, orgId: string, data: CreateProjectInput) =>
    apiFetch<Project>(base(orgId), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  getById: (token: string, orgId: string, projectId: string) =>
    apiFetch<Project>(`${base(orgId)}/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  update: (token: string, orgId: string, projectId: string, data: UpdateProjectInput) =>
    apiFetch<Project>(`${base(orgId)}/${projectId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  delete: (token: string, orgId: string, projectId: string) =>
    apiFetch<void>(`${base(orgId)}/${projectId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  // Members
  listMembers: (token: string, orgId: string, projectId: string) =>
    apiFetch<ProjectMember[]>(`${base(orgId)}/${projectId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  inviteMember: (
    token: string,
    orgId: string,
    projectId: string,
    data: InviteProjectMemberInput
  ) =>
    apiFetch<ProjectMember>(`${base(orgId)}/${projectId}/members`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  updateMemberRole: (
    token: string,
    orgId: string,
    projectId: string,
    userId: string,
    data: UpdateProjectMemberRoleInput
  ) =>
    apiFetch<ProjectMember>(`${base(orgId)}/${projectId}/members/${userId}/role`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  removeMember: (
    token: string,
    orgId: string,
    projectId: string,
    userId: string
  ) =>
    apiFetch<void>(`${base(orgId)}/${projectId}/members/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getBlueprint: (token: string, orgId: string, projectId: string) =>
    apiFetch<Blueprint>(`${base(orgId)}/${projectId}/blueprint`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};
