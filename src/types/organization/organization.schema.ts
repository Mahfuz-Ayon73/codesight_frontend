export interface Organization {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  createdByUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrganizationInput {
  name: string;
  description?: string;
}

export type OrganizationMemberRole = "OWNER" | "ADMIN" | "MEMBER";

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  role: OrganizationMemberRole;
  joinedAt?: string;
}

export type InvitationStatus = "PENDING" | "ACCEPTED";

export interface Invitation {
  id: string;
  organizationId: string;
  organizationName: string;
  projectId?: string;
  projectName?: string;
  email: string;
  role: OrganizationMemberRole;
  status: InvitationStatus;
  invitedByName?: string;
  expiresAt: string;
  expired: boolean;
}

export interface CreateInvitationInput {
  email: string;
  role: OrganizationMemberRole;
  projectId?: string;
}
