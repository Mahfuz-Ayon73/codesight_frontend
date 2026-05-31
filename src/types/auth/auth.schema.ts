export type UserRole = "USER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
