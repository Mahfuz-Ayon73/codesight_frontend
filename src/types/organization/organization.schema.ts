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
