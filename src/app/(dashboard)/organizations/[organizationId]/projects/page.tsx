type Props = { params: Promise<{ organizationId: string }> };

export default async function ProjectsPage({ params }: Props) {
  const { organizationId } = await params;
  return (
    <div>
      <h1 className="text-2xl font-semibold">Projects</h1>
      <p className="mt-2 text-sm text-zinc-600">Organization: {organizationId}</p>
    </div>
  );
}
