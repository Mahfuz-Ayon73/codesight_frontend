import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { projectService } from "@/services/project/project.service";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";
import ProjectMembersPanel from "@/components/project/ProjectMembersPanel";
import { Clock, GitBranch, FolderArchive, Folder } from "lucide-react";

type Props = { params: Promise<{ organizationId: string; projectId: string }> };

export default async function ProjectPage({ params }: Props) {
  const { organizationId, projectId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) redirect("/login");

  const [project, members] = await Promise.all([
    projectService.getById(token, organizationId, projectId).catch(() => null),
    projectService.listMembers(token, organizationId, projectId).catch(() => []),
  ]);

  if (!project) notFound();

  const sourceIcon = {
    GITHUB: <GitBranch size={14} />,
    LOCAL_ZIP: <FolderArchive size={14} />,
    LOCAL_FOLDER: <Folder size={14} />,
  }[project.sourceType];

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
          {sourceIcon}
          <span>{project.sourceType.replace("_", " ")}</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">{project.name}</h1>
        {project.description && (
          <p className="mt-1 text-sm text-zinc-500">{project.description}</p>
        )}
      </div>

      {/* Status card */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoCard label="Status" value={project.analysisStatus.replace(/_/g, " ")} />
        <InfoCard
          label="Uploaded"
          value={project.uploadedAt ? new Date(project.uploadedAt).toLocaleDateString() : "—"}
        />
        <InfoCard
          label="Created"
          value={project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "—"}
        />
        <InfoCard label="Members" value={String(members.length)} />
      </div>

      {project.uploadErrorMessage && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          Upload error: {project.uploadErrorMessage}
        </div>
      )}

      {/* Members */}
      <ProjectMembersPanel
        organizationId={organizationId}
        projectId={projectId}
        initialMembers={members}
      />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-zinc-800 capitalize">{value.toLowerCase()}</p>
    </div>
  );
}
