export type AnalysisStatus =
  | "PENDING_UPLOAD"
  | "READY_FOR_ANALYSIS"
  | "IN_PROGRESS"
  | "ANALYZING"
  | "COMPLETED"
  | "FAILED";

export type ProjectSourceType = "LOCAL_ZIP" | "GITHUB";

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
  analysisStage?: string | null;
  analysisMessage?: string | null;
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

export interface UpdateProjectInput {
  description: string;
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
  /** Label-propagation result (schema >= 2.2). Null for infra/boundary/unlabeled files. */
  domain?: string | null;
  domain_confidence?: number;
  domain_source?: "seed:dependency" | "seed:name" | "seed:dependency+name" | "seed:name-emergent" | "propagated" | null;
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
  source_line?: number | null;
  target_line?: number | null;
}

export type DomainType = "CANONICAL" | "EMERGENT" | "INFRASTRUCTURE" | "UNCLASSIFIED";

export interface BlueprintCluster {
  id: string;
  name: string | null;
  parent_cluster_id: string | null;
  suggested_title: string | null;
  functional_summary: string | null;
  domain?: string | null;
  domain_type?: DomainType | null;
  domain_confidence?: number | null;
  domain_evidence?: string[];
  /** Optional Gemini/OpenAI/Ollama sanity pass over `domain` — advisory only, never overrides it. */
  domain_llm_validated?: boolean | null;
  domain_llm_confidence?: number | null;
  domain_llm_reason?: string | null;
  /** Only set for clusters the sanity pass flagged as weak — a content-grounded replacement name, still advisory. */
  domain_llm_suggested_name?: string | null;
  domain_llm_suggested_reason?: string | null;
}

export interface JourneyCoverage {
  reached: number;
  total: number;
  unreached_count: number;
  unreached_sample: string[];
}

export interface BlueprintMetadata {
  detected_paradigm: string;
  total_nodes_indexed: number;
  total_edges: number;
  total_clusters: number;
  max_cluster_size?: number;
  detected_domains?: string[];
  journey_coverage?: JourneyCoverage;
}

/**
 * A place a user actually lands, as opposed to `execution_role: "ENTRY_POINT"`
 * which only means "nothing imports me". `is_landing` marks the suggested
 * starting point for its auth state — the login screen when signed out, the
 * shallowest guarded route when signed in.
 */
export interface BlueprintEntryPoint {
  file: string;
  url: string | null;
  kind: "page" | "api" | "server";
  auth_state: "public" | "protected";
  confidence: number;
  evidence: string[];
  /** Layouts wrapping this screen, outermost first, ending with the file itself. */
  render_chain?: string[];
  cluster_id: string | null;
  domain: string | null;
  /** Files reachable from the whole render chain — the size of the tour. */
  reach_count: number;
  /** Files reachable from this file alone; used for ranking, since every
   *  page shares the root layout's subtree. */
  own_reach_count?: number;
  reach_ratio: number;
  is_landing: boolean;
}

export interface Blueprint {
  schema_version: string;
  project_id: string;
  project_metadata: BlueprintMetadata;
  /** Absent on blueprints produced before journey detection existed. */
  entry_points?: BlueprintEntryPoint[];
  clusters: BlueprintCluster[];
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
}

// Commit history / diff types
export type DiffStatus = "added" | "modified" | "deleted" | "moved";

export interface CommitDiff {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  timestamp: string | null;
  addedFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  totalChanges: number;
}

export interface SnapshotSummary {
  commitSha: string;
  snapshotId: string;
  /** Raw JSON string of a GraphDelta — parse with JSON.parse before use. Null until Phase 2 deep analysis runs. */
  deltaJson?: string | null;
}

export interface CommitHistoryResponse {
  projectId: string;
  commits: CommitDiff[];
  snapshots: SnapshotSummary[];
}

// Cluster name/summary override — a team member's manual replacement of the
// LLM-suggested label, keyed by the snapshot it was made against.
export interface ClusterOverride {
  clusterId: string;
  overrideTitle: string | null;
  overrideSummary: string | null;
  version: number;
}

// A single free-form note attached to a cluster (SRS 2.2.9). Unlike
// ClusterOverride, several of these can exist for the same clusterId — they
// accumulate into a running history rather than overwriting each other.
export interface ClusterNote {
  id: number;
  clusterId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface GraphDelta {
  added_nodes: string[];
  removed_nodes: string[];
  moved_nodes: { file: string; from_cluster: string; to_cluster: string }[];
}

// Cluster ownership (git-blame-derived) — "who currently owns this code".
// Backend returns per-file breakdowns keyed by canonical_path; the frontend
// aggregates them up to cluster level itself (same split as CommitDiff).
export interface AuthorShare {
  name: string;
  email: string;
  lines: number;
  percentage: number;
}

export interface FileOwnership {
  path: string;
  authors: AuthorShare[];
  primaryOwner: string;
  primaryOwnerEmail: string;
  primaryOwnerPercentage: number;
  totalLines: number;
}

export interface OwnershipResponse {
  files: FileOwnership[];
  truncated: boolean;
}
