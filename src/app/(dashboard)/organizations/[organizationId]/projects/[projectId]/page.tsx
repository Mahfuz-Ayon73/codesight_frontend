import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { projectService } from "@/services/project/project.service";
import { AUTH_TOKEN_COOKIE } from "@/utils/cookie";
import ProjectMembersPanel from "@/components/project/ProjectMembersPanel";
import UploadCodebase from "@/components/project/UploadCodebase";
import AnalysisView from "@/components/project/AnalysisView";
import CodebaseActions from "@/components/project/CodebaseActions";
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
  const showAnalysisView = !needsUpload;

  const sourceIcon = {
    GITHUB: <GitBranch size={13} />,
    LOCAL_ZIP: <FolderArchive size={13} />,
    LOCAL_FOLDER: <Folder size={13} />,
  }[project.sourceType];

  return (
    <div className="flex flex-col gap-6 bg-white">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 max-w-4xl mx-auto w-full">
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
        {/* Reupload / Delete — shown once codebase has been uploaded */}
        {!needsUpload && (
          <CodebaseActions organizationId={organizationId} projectId={projectId} />
        )}
      </div>

      {/* Upload prompt */}
      {needsUpload && (
        <div className="max-w-4xl mx-auto w-full">
          <UploadCodebase organizationId={organizationId} projectId={projectId} />
        </div>
      )}

      {/* Analysis view — shown for all states after upload */}
      {showAnalysisView && (
        <AnalysisView
          organizationId={organizationId}
          projectId={projectId}
          initialStatus={project.analysisStatus}
        />
      )}

      {project.uploadErrorMessage && (
        <div className="max-w-4xl mx-auto w-full rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {project.uploadErrorMessage}
        </div>
      )}

      {/* Members */}
      <div className="max-w-4xl mx-auto w-full">
        <ProjectMembersPanel
          organizationId={organizationId}
          projectId={projectId}
          initialMembers={members}
        />
      </div>
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
