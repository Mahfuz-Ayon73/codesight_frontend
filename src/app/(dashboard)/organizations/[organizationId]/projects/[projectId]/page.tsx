type Props = { params: Promise<{ organizationId: string; projectId: string }> };

export default async function ProjectPage({ params }: Props) {
  const { organizationId, projectId } = await params;
  return (
    <div>
      <h1 className="text-2xl font-semibold">Project</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Org {organizationId} · Project {projectId}
      </p>
    </div>
  );
}
