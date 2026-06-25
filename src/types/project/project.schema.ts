export type AnalysisStatus =
  | "PENDING_UPLOAD"
  | "READY_FOR_ANALYSIS"
  | "IN_PROGRESS"
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

// Analysis blueprint types — schema v2 (flat relational)
export interface BlueprintNode {
  id: string;           // canonical path, e.g. "src/services/stripe.ts"
  cluster_id: string;   // foreign key → BlueprintCluster.id
  canonical_path: string;
  centrality_score: number;
  is_god_file: boolean;
  execution_role: "ENTRY_POINT" | "TERMINAL_SINK" | "INTERNAL" | "SHARED_DEPENDENCY";
  external_dependencies: string[];
  text_summary: string;
}

export interface BlueprintEdge {
  source: string;       // canonical path
  target: string;       // canonical path
  type: string;         // "BELONGS_TO_DOMAIN" | "RENDERS" | "SEMANTIC_SIMILARITY"
  weight: number;
  binding?: string;
  called_names?: string[];
  is_dead_import?: boolean;
  is_synthetic?: boolean;
}

export interface BlueprintCluster {
  id: string;
  name: string | null;
  parent_cluster_id: string | null;
  suggested_title: string | null;
  functional_summary: string | null;
}

export interface BlueprintMetadata {
  detected_paradigm: string;
  total_nodes_indexed: number;
  total_edges: number;
  total_clusters: number;
  max_cluster_size?: number;
}

export interface Blueprint {
  schema_version: string;
  project_id: string;
  project_metadata: BlueprintMetadata;
  clusters: BlueprintCluster[];
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
}
