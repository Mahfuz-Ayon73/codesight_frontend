type TicketCardProps = {
  title: string;
  status?: string;
  assignee?: string;
};

export default function TicketCard({ title, status, assignee }: TicketCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <p className="text-sm font-medium">{title}</p>
      {status && <span className="mt-2 inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs">{status}</span>}
      {assignee && <p className="mt-2 text-xs text-zinc-500">{assignee}</p>}
    </div>
  );
}
