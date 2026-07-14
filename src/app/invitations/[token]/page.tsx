import Link from "next/link";
import { getProfileAction } from "@/actions/user.action";
import { getInvitationAction } from "@/actions/invitation.action";
import { ApiError } from "@/lib/exception";
import { Building2, FolderOpen, Mail, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Invitation } from "@/types/organization/organization.schema";
import AcceptInvitationButton from "@/components/Organization/AcceptInvitationButton";

type Props = { params: Promise<{ token: string }> };

export default async function InvitationPage({ params }: Props) {
  const { token } = await params;

  const currentUser = await getProfileAction().catch(() => null);

  let invitation: Invitation | null = null;
  let loadError: string | null = null;
  try {
    invitation = await getInvitationAction(token);
  } catch (e) {
    loadError = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Failed to load invitation";
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500">
            <Mail size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">You&apos;re invited</h1>
            <p className="text-xs text-zinc-400">Join a team on CodeSight.</p>
          </div>
        </div>

        {loadError || !invitation ? (
          <ErrorMessage message={loadError ?? "This invitation could not be found."} />
        ) : invitation.status === "ACCEPTED" ? (
          <SuccessMessage
            icon={<CheckCircle2 size={18} className="text-green-500" />}
            title="Already accepted"
            message={`This invitation to join ${invitation.organizationName} has already been accepted.`}
          />
        ) : invitation.expired ? (
          <ErrorMessage
            message={`This invitation to join ${invitation.organizationName} has expired. Ask them to send a new one.`}
          />
        ) : !currentUser ? (
          <LoggedOutPrompt email={invitation.email} token={token} />
        ) : invitation.email.toLowerCase() !== currentUser.email.toLowerCase() ? (
          <ErrorMessage
            message={`This invitation was sent to ${invitation.email}, but you're logged in as ${currentUser.email}. Log out and sign in with the invited email to accept.`}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-zinc-700">
                <Building2 size={14} className="text-zinc-400" />
                <span>
                  Organization: <span className="font-medium">{invitation.organizationName}</span>
                </span>
              </div>
              {invitation.projectName && (
                <div className="flex items-center gap-2 text-zinc-700">
                  <FolderOpen size={14} className="text-zinc-400" />
                  <span>
                    Project: <span className="font-medium">{invitation.projectName}</span>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-zinc-700">
                <span className="text-zinc-400">Role:</span>
                <span className="font-medium">{invitation.role}</span>
              </div>
              {invitation.invitedByName && (
                <p className="text-xs text-zinc-400">Invited by {invitation.invitedByName}</p>
              )}
            </div>

            <AcceptInvitationButton token={token} organizationId={invitation.organizationId} />
          </div>
        )}
      </div>
    </div>
  );
}

function LoggedOutPrompt({ email, token }: { email: string; token: string }) {
  const redirect = encodeURIComponent(`/invitations/${token}`);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600">
        Log in or create an account with <span className="font-medium text-zinc-800">{email}</span> to accept this
        invitation. You&apos;ll be brought straight back here afterward.
      </p>
      <div className="flex gap-2">
        <Link
          href={`/login?redirect=${redirect}`}
          className="flex-1 text-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition"
        >
          Log in
        </Link>
        <Link
          href={`/signup?email=${encodeURIComponent(email)}&redirect=${redirect}`}
          className="flex-1 text-center rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function SuccessMessage({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-4">
      {icon}
      <p className="text-sm font-medium text-zinc-800">{title}</p>
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}
