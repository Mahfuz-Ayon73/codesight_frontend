import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { organizationService } from "@/services/organization/organization.service";
import { projectService } from "@/services/project/project.service";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";
import { Building2, Clock, GitBranch, FolderArchive, Folder, ArrowRight } from "lucide-react";
import type { Blueprint, Project } from "@/types/project/project.schema";
import DashboardGraphPreview from "@/components/project/DashboardGraphPreview";

type Props = { searchParams: Promise<{ projectId?: string }> };

export default async function WorkspacePage({ searchParams }: Props) {
  const { projectId: requestedProjectId } = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) redirect("/login");

  const organizations = await organizationService.list(token).catch(() => []);
  const hasOrgs = organizations.length > 0;

  // Collect all projects across all orgs
  const allProjects: (Project & { orgName: string })[] = hasOrgs
    ? (
        await Promise.all(
          organizations.map(async (org) => {
            const projects = await projectService.list(token, org.id).catch(() => []);
            return projects.map((p) => ({ ...p, orgName: org.name }));
          })
        )
      ).flat()
    : [];

  // Last active = most recently uploaded, fallback to most recently created
  const lastProject = allProjects.sort((a, b) => {
    const ta = a.uploadedAt ?? a.createdAt ?? "";
    const tb = b.uploadedAt ?? b.createdAt ?? "";
    return tb.localeCompare(ta);
  })[0] ?? null;

  // "Open in workspace" links here with a specific project — show that one instead
  // of whichever project was last active.
  const requestedProject = requestedProjectId
    ? allProjects.find((p) => p.id === requestedProjectId) ?? null
    : null;
  const targetProject = requestedProject ?? lastProject;

  const hasAnalysis = targetProject?.analysisStatus === "COMPLETED";

  const blueprint: Blueprint | null = hasAnalysis && targetProject
    ? await projectService
        .getBlueprint(token, targetProject.organizationId, targetProject.id)
        .catch(() => null)
    : null;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">My Workspace</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {requestedProject ? `Viewing ${requestedProject.name}.` : "Your last active project at a glance."}
        </p>
      </div>

      {!hasOrgs ? (
        /* No org */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center px-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-500">
            <Building2 size={22} />
          </div>
          <p className="text-base font-semibold text-zinc-800">No organization yet</p>
          <p className="mt-2 mb-6 max-w-sm text-sm text-zinc-400">
            An organization is required to manage your projects. Create one to get started.
          </p>
          <Link
            href="/onboarding/create-organization"
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition"
          >
            Create organization
          </Link>
        </div>
      ) : !targetProject ? (
        /* Has org but no projects */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center px-6">
          <p className="text-base font-semibold text-zinc-700">No projects yet</p>
          <p className="mt-2 mb-6 text-sm text-zinc-400">
            Create a project to start analyzing your codebase.
          </p>
          <Link
            href={`/organizations/${organizations[0].id}/projects/new`}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition"
          >
            Create project
          </Link>
        </div>
      ) : (
        <>
          {/* Project card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <SourceIcon type={targetProject.sourceType} />
                  <span>{targetProject.orgName}</span>
                </div>
                <h2 className="text-lg font-semibold text-zinc-900">{targetProject.name}</h2>
                {targetProject.description && (
                  <p className="text-sm text-zinc-500">{targetProject.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={targetProject.analysisStatus} />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-400 border-t border-zinc-100 pt-4">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {targetProject.uploadedAt
                  ? `Uploaded ${formatDate(targetProject.uploadedAt)}`
                  : "Not uploaded yet"}
              </span>
              {targetProject.createdAt && (
                <span>Created {formatDate(targetProject.createdAt)}</span>
              )}
            </div>
          </div>

          {/* Graph / cluster map area */}
          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div>
                <p className="text-sm font-semibold text-zinc-800">Codebase Graph</p>
                <p className="text-xs text-zinc-400">Cluster map of {targetProject.name}</p>
              </div>
              {hasAnalysis && (
                <Link
                  href={`/organizations/${targetProject.organizationId}/projects/${targetProject.id}`}
                  className="text-xs text-cyan-600 hover:underline"
                >
                  View full analysis
                </Link>
              )}
            </div>

            {hasAnalysis && blueprint ? (
              <DashboardGraphPreview blueprint={blueprint} projectId={targetProject.id} orgId={targetProject.organizationId} />
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
                    href={`/organizations/${targetProject.organizationId}/projects/${targetProject.id}`}
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

function SourceIcon({ type }: { type: string }) {
  if (type === "GITHUB") return <GitBranch size={12} />;
  if (type === "LOCAL_ZIP") return <FolderArchive size={12} />;
  return <Folder size={12} />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING_UPLOAD:     { label: "Pending",   className: "bg-zinc-100 text-zinc-500" },
    READY_FOR_ANALYSIS: { label: "Ready",     className: "bg-blue-50 text-blue-600" },
    ANALYZING:          { label: "Analyzing", className: "bg-yellow-50 text-yellow-600" },
    COMPLETED:          { label: "Done",      className: "bg-green-50 text-green-600" },
    FAILED:             { label: "Failed",    className: "bg-red-50 text-red-600" },
  };
  const { label, className } = map[status] ?? { label: status, className: "bg-zinc-100 text-zinc-500" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
