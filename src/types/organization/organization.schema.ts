export interface Organization {
  id: string;
  name: string;
  slug?: string;
  createdAt?: string;
}

export interface CreateOrganizationInput {
  name: string;
}
