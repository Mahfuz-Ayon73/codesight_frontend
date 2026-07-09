import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { projectService } from "@/services/project/project.service";
import { organizationService } from "@/services/organization/organization.service";
import { getProfileAction } from "@/actions/user.action";
import { ApiError } from "@/lib/exception";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";
import { ArrowUpRight, Users, Building2, UserCircle } from "lucide-react";
import EditableDescription from "@/components/project/EditableDescription";
import ProjectDangerZone from "@/components/project/ProjectDangerZone";

type Props = { params: Promise<{ organizationId: string; projectId: string }> };

export default async function ProjectDetailsPage({ params }: Props) {
  const { organizationId, projectId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) redirect("/login");

  let data;
  let loadError: string | null = null;
  try {
    const [project, members, organization, orgMembers, orgProjects, currentUser] = await Promise.all([
      projectService.getById(token, organizationId, projectId),
      projectService.listMembers(token, organizationId, projectId),
      organizationService.getById(token, organizationId),
      organizationService.listMembers(token, organizationId),
      projectService.list(token, organizationId),
      getProfileAction(),
    ]);
    data = { project, members, organization, orgMembers, orgProjects, currentUser };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return (
        <div className="max-w-2xl mx-auto w-full">
          <h1 className="text-2xl font-semibold text-zinc-900">Project not found</h1>
          <p className="mt-2 text-sm text-zinc-600">
            This project doesn&apos;t exist in this organization, or you don&apos;t have access to it.
          </p>
        </div>
      );
    }
    loadError = e instanceof ApiError ? `${e.status}: ${e.message}` : e instanceof Error ? e.message : "Failed to load project";
  }

  if (loadError || !data) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-semibold text-zinc-900">Couldn&apos;t load project details</h1>
        <p className="mt-2 text-sm text-red-600">{loadError}</p>
      </div>
    );
  }

  const { project, members, organization, orgMembers, orgProjects, currentUser } = data;

  const projectOwnerMember = members.find((m) => m.role === "OWNER");
  const orgOwnerMember = orgMembers.find((m) => m.role === "OWNER");
  const isProjectOwner = project.ownerId === currentUser.id;
  const isOrgOwner = orgOwnerMember?.userId === currentUser.id;
  const canManage = isProjectOwner || isOrgOwner;
  const orgProjectCount = orgProjects.length;

  const ownerName = projectOwnerMember
    ? `${projectOwnerMember.userFirstName} ${projectOwnerMember.userLastName}`.trim() || projectOwnerMember.userEmail
    : "Unknown";

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
              <Building2 size={12} />
              <span>{organization.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">{project.name}</h1>
          </div>
          <Link
            href={`/?projectId=${projectId}`}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-600 transition shrink-0"
          >
            Open in workspace
            <ArrowUpRight size={12} />
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
          <div className="flex items-center gap-1.5">
            <UserCircle size={14} className="text-zinc-400" />
            <span>Owner: <span className="font-medium text-zinc-800">{ownerName}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-zinc-400" />
            <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="mt-4 border-t border-zinc-100 pt-4">
          <EditableDescription
            organizationId={organizationId}
            projectId={projectId}
            description={project.description ?? ""}
            canEdit={canManage}
          />
        </div>
      </div>

      {canManage && (
        <ProjectDangerZone
          organizationId={organizationId}
          projectId={projectId}
          organizationName={organization.name}
          isOrgOwner={isOrgOwner}
          initialOrgProjectCount={orgProjectCount}
        />
      )}
    </div>
  );
}
