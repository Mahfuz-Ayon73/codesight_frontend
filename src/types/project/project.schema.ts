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

// Analysis blueprint types
export interface BlueprintNode {
  id: number;
  canonical_path: string;
  centrality_score: number;
  is_god_file: boolean;
  execution_role: "ENTRY_POINT" | "TERMINAL_SINK" | "INTERNAL";
  external_dependencies: string[];
  text_summary: string;
}

export interface BlueprintEdge {
  source_id: number;
  target_id: number;
  weight: number;
}

export interface BlueprintCluster {
  cluster_id: string;
  suggested_title: string;
  functional_summary: string;
  node_ids: number[];
  nodes: string[]; // canonical paths
  referenced_by_clusters?: string[]; // shared-dependency clusters only
}

export interface BlueprintMetadata {
  detected_paradigm: string;
  total_nodes_indexed: number;
  total_edges: number;
  total_clusters: number;
}

export interface Blueprint {
  schema_version: string;
  project_id: string;
  project_metadata: BlueprintMetadata;
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
  clusters: BlueprintCluster[];
  execution_sequences: unknown[];
}
