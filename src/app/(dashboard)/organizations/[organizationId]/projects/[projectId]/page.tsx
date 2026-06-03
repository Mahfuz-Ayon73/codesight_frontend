import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { projectService } from "@/services/project/project.service";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";
import ProjectMembersPanel from "@/components/project/ProjectMembersPanel";
import UploadCodebase from "@/components/project/UploadCodebase";
import AnalysisView from "@/components/project/AnalysisView";
import { GitBranch, FolderArchive, Folder } from "lucide-react";

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

  const needsUpload = project.analysisStatus === "PENDING_UPLOAD";
  const isAnalysing =
    project.analysisStatus === "READY_FOR_ANALYSIS" ||
    project.analysisStatus === "IN_PROGRESS" ||
    project.analysisStatus === "ANALYZING";
  const isCompleted = project.analysisStatus === "COMPLETED";
  const isFailed = project.analysisStatus === "FAILED";

  const sourceIcon = {
    GITHUB: <GitBranch size={13} />,
    LOCAL_ZIP: <FolderArchive size={13} />,
    LOCAL_FOLDER: <Folder size={13} />,
  }[project.sourceType];

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <div>
        {!needsUpload && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
            {sourceIcon}
            <span>{project.sourceType?.replace(/_/g, " ")}</span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-zinc-900">{project.name}</h1>
        {project.description && (
          <p className="mt-1 text-sm text-zinc-500">{project.description}</p>
        )}
      </div>

      {/* Upload prompt */}
      {needsUpload && (
        <UploadCodebase organizationId={organizationId} projectId={projectId} />
      )}

      {/* Analysis running or completed */}
      {(isAnalysing || isCompleted || isFailed) && (
        <AnalysisView
          organizationId={organizationId}
          projectId={projectId}
          initialStatus={project.analysisStatus}
        />
      )}

      {/* Status cards — only when not in analysis view */}
      {!needsUpload && !isAnalysing && !isCompleted && !isFailed && (
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
      )}

      {project.uploadErrorMessage && !isAnalysing && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {project.uploadErrorMessage}
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
