export type AnalysisStatus =
  | "PENDING_UPLOAD"
  | "READY_FOR_ANALYSIS"
  | "ANALYZING"
  | "COMPLETED"
  | "FAILED";

export type ProjectSourceType = "LOCAL_ZIP" | "LOCAL_FOLDER" | "GITHUB";

export type ProjectMemberRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  ownerId: string;
  sourceType: ProjectSourceType;
  githubUrl?: string;
  analysisStatus: AnalysisStatus;
  uploadErrorMessage?: string;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  role: ProjectMemberRole;
  joinedAt?: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface InviteProjectMemberInput {
  email: string;
  role: ProjectMemberRole;
}

export interface UpdateProjectMemberRoleInput {
  role: ProjectMemberRole;
}
