type Props = {
  params: Promise<{ organizationId: string; projectId: string; boardId: string }>;
};

export default async function BoardPage({ params }: Props) {
  const { organizationId, projectId, boardId } = await params;
  return (
    <div>
      <h1 className="text-2xl font-semibold">Board</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Org {organizationId} · Project {projectId} · Board {boardId}
      </p>
    </div>
  );
}
