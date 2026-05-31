import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { organizationService } from "@/services/organization/organization.service";
import { projectService } from "@/services/project/project.service";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";
import { Plus, Clock, Building2 } from "lucide-react";

export default async function WorkspacePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) redirect("/login");

  const organizations = await organizationService.list(token).catch(() => []);
  const hasOrgs = organizations.length > 0;

  const orgProjects = hasOrgs
    ? await Promise.all(
        organizations.map(async (org) => {
          const projects = await projectService.list(token, org.id).catch(() => []);
          return { org, projects };
        })
      )
    : [];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">My Workspace</h1>
        <p className="mt-1 text-sm text-zinc-500">All your projects, in one place.</p>
      </div>

      {!hasOrgs ? (
        /* No org state */
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
            <Plus size={15} />
            Create organization
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {orgProjects.map(({ org, projects }) => (
            <div key={org.id}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-800">{org.name}</h2>
                  {org.slug && <p className="text-xs text-zinc-400">{org.slug}</p>}
                </div>
                <Link
                  href={`/organizations/${org.id}/projects/new`}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
                >
                  <Plus size={13} />
                  New Project
                </Link>
              </div>

              {projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-8 text-center text-sm text-zinc-400">
                  No projects yet.{" "}
                  <Link href={`/organizations/${org.id}/projects/new`} className="text-cyan-600 underline underline-offset-2">
                    Create one
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/organizations/${org.id}/projects/${project.id}`}
                      className="group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 hover:border-cyan-300 hover:shadow-sm transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-zinc-800 group-hover:text-cyan-600 transition">
                            {project.name}
                          </p>
                          {project.description && (
                            <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">{project.description}</p>
                          )}
                        </div>
                        <StatusBadge status={project.analysisStatus} />
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-400">
                        <Clock size={11} />
                        {project.uploadedAt
                          ? `Uploaded ${formatDate(project.uploadedAt)}`
                          : "Not uploaded yet"}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
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
