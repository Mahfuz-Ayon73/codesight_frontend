import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { organizationService } from "@/services/organization/organization.service";
import { projectService } from "@/services/project/project.service";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";
import { Clock, FolderOpen, Plus, Info, ArrowUpRight } from "lucide-react";

export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) redirect("/login");

  const organizations = await organizationService.list(token).catch(() => []);

  const allProjects = (
    await Promise.all(
      organizations.map(async (org) => {
        const projects = await projectService.list(token, org.id).catch(() => []);
        return projects.map((p) => ({ ...p, orgName: org.name }));
      })
    )
  ).flat();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {allProjects.length > 0
              ? `${allProjects.length} project${allProjects.length !== 1 ? "s" : ""} across your organizations`
              : "All your projects will appear here"}
          </p>
        </div>
      </div>

      {allProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center px-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
            <FolderOpen size={22} />
          </div>
          <p className="text-base font-semibold text-zinc-700">No projects yet</p>
          <p className="mt-2 mb-6 max-w-xs text-sm text-zinc-400">
            Create a project inside an organization to start analyzing your code.
          </p>
          {organizations.length > 0 ? (
            <Link
              href={`/organizations/${organizations[0].id}/projects/new`}
              className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition"
            >
              <Plus size={15} />
              Create project
            </Link>
          ) : (
            <Link
              href="/onboarding/create-organization"
              className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition"
            >
              <Plus size={15} />
              Create organization first
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
          {allProjects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition group"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm font-medium text-zinc-800">
                  {project.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span>{project.orgName}</span>
                  {project.description && (
                    <>
                      <span>·</span>
                      <span className="max-w-xs truncate">{project.description}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <Clock size={11} />
                  {project.uploadedAt
                    ? formatDate(project.uploadedAt)
                    : "Not uploaded"}
                </div>
                <StatusBadge status={project.analysisStatus} />
                <Link
                  href={`/organizations/${project.organizationId}/projects/${project.id}/details`}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
                >
                  <Info size={12} />
                  Show details
                </Link>
                <Link
                  href={`/?projectId=${project.id}`}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-600 transition"
                >
                  Open in workspace
                  <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
