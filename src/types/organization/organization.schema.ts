export interface Organization {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  createdAt?: string;
}

export interface CreateOrganizationInput {
  name: string;
  description?: string;
}
