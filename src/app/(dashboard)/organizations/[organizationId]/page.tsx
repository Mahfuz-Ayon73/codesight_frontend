import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { organizationService } from "@/services/organization/organization.service";
import { projectService } from "@/services/project/project.service";
import { getProfileAction } from "@/actions/user.action";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";
import { ApiError } from "@/lib/exception";
import { ArrowRight } from "lucide-react";
import type { Blueprint, Project } from "@/types/project/project.schema";
import DashboardGraphPreview from "@/components/project/DashboardGraphPreview";
import OrgAccessNotice from "@/components/Organization/OrgAccessNotice";

// Data is user/session-scoped; never let the client Router Cache reuse a
// render from a different account.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ projectId?: string }>;
};

export default async function OrgWorkspacePage({ params, searchParams }: Props) {
  const { organizationId } = await params;
  const { projectId: requestedProjectId } = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) redirect("/login");

  let orgName = "";
  let isOwner = false;
  let projects: Project[] = [];
  let loadError: string | null = null;
  try {
    const [org, projectList] = await Promise.all([
      organizationService.getById(token, organizationId),
      projectService.list(token, organizationId),
    ]);
    orgName = org.name;
    isOwner = org.myRole === "OWNER";
    projects = projectList;
  } catch (e) {
    loadError = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Failed to load workspace";
  }

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto">
        <OrgAccessNotice organizationId={organizationId} message={loadError} />
      </div>
    );
  }

  // Last active = most recently uploaded, fallback to most recently created
  const lastProject = [...projects].sort((a, b) => {
    const ta = a.uploadedAt ?? a.createdAt ?? "";
    const tb = b.uploadedAt ?? b.createdAt ?? "";
    return tb.localeCompare(ta);
  })[0] ?? null;

  // "Open in workspace" links here with a specific project — show that one instead
  // of whichever project was last active.
  const requestedProject = requestedProjectId
    ? projects.find((p) => p.id === requestedProjectId) ?? null
    : null;
  const targetProject = requestedProject ?? lastProject;

  const hasAnalysis = targetProject?.analysisStatus === "COMPLETED";

  // Cluster rename (double-click on the canvas) is gated to ADMIN/OWNER, while
  // cluster notes (SRS 2.2.9) are gated one tier lower at MEMBER — resolve the
  // caller's role on this specific project alongside the blueprint fetch so we
  // don't add a second round trip after the page has already loaded.
  type CanvasPermissions = { canEditClusters: boolean; canAddNotes: boolean; currentUserId: string | null };
  const [blueprint, permissions]: [Blueprint | null, CanvasPermissions] = hasAnalysis && targetProject
    ? await Promise.all([
        projectService.getBlueprint(token, organizationId, targetProject.id).catch(() => null),
        Promise.all([
          projectService.listMembers(token, organizationId, targetProject.id).catch(() => []),
          getProfileAction().catch(() => null),
        ]).then(([members, currentUser]) => {
          if (!currentUser) return { canEditClusters: false, canAddNotes: false, currentUserId: null };
          const myRole = members.find((m) => m.userId === currentUser.id)?.role;
          return {
            canEditClusters: myRole === "ADMIN" || myRole === "OWNER",
            canAddNotes: myRole === "ADMIN" || myRole === "OWNER" || myRole === "MEMBER",
            currentUserId: currentUser.id,
          };
        }),
      ])
    : [null, { canEditClusters: false, canAddNotes: false, currentUserId: null }];
  const { canEditClusters, canAddNotes, currentUserId } = permissions;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">My Workspace</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {requestedProject
            ? `Viewing ${requestedProject.name}.`
            : `Your last active project in ${orgName}.`}
        </p>
      </div>

      {!targetProject ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center px-6">
          <p className="text-base font-semibold text-zinc-700">No projects yet in {orgName}</p>
          <p className="mt-2 text-sm text-zinc-400">
            {isOwner
              ? "Use the Create Project button in the sidebar to start analyzing your code."
              : "You haven't been added to a project in this organization yet."}
          </p>
        </div>
      ) : (
        <>
          {/* Project header */}
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-semibold text-zinc-900">{targetProject.name}</h2>
            <p className="text-xs text-zinc-400">
              Last modified{" "}
              {formatDate(targetProject.updatedAt ?? targetProject.uploadedAt ?? targetProject.createdAt)}
            </p>
            {targetProject.description && (
              <p className="text-sm text-zinc-500 mt-1">{targetProject.description}</p>
            )}
          </div>

          {/* Graph / cluster map area */}
          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div>
                <p className="text-sm font-semibold text-zinc-800">Codebase Graph</p>
                <p className="text-xs text-zinc-400">Cluster map of {targetProject.name}</p>
              </div>
            </div>

            {hasAnalysis && blueprint ? (
              <DashboardGraphPreview
                blueprint={blueprint} projectId={targetProject.id} orgId={organizationId}
                canEditClusters={canEditClusters}
                canAddNotes={canAddNotes}
                currentUserId={currentUserId}
              />
            ) : hasAnalysis && !blueprint ? (
              <div className="flex items-center justify-center h-64 text-sm text-zinc-400">
                Could not load graph data
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                <p className="text-sm font-medium text-zinc-600">No analysis available yet</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {targetProject.analysisStatus === "PENDING_UPLOAD"
                    ? "Upload your source code to start the analysis."
                    : targetProject.analysisStatus === "FAILED"
                    ? "The last analysis failed. Try re-uploading your code."
                    : "Analysis is in progress — check back soon."}
                </p>
                {targetProject.analysisStatus === "PENDING_UPLOAD" && (
                  <Link
                    href={`/organizations/${organizationId}/projects/${targetProject.id}`}
                    className="mt-4 flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-600 transition"
                  >
                    Upload code <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function formatDate(iso: string | undefined) {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
