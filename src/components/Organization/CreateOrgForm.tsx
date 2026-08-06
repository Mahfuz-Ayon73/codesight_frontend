"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, ArrowLeft } from "lucide-react";
import { createOrganizationAction } from "@/actions/organization.action";
import { setLastOrganizationAction } from "@/actions/user.action";
import { setCurrentOrganization } from "@/utils/cookie";
import Button from "@/components/Button/Button";
import SkipOrgSetupLink from "@/components/Organization/SkipOrgSetupLink";

// Generate a short 8-char hex suffix from a UUID
function shortId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

function suggestName(firstName: string) {
  const base = `${firstName}'s Org`;
  return `${base}-${shortId()}`;
}

type Props = { firstName: string; skipHref?: string };

export default function CreateOrgForm({ firstName, skipHref = "/" }: Props) {
  const router = useRouter();
  const [name, setName] = useState(() => suggestName(firstName));
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const org = await createOrganizationAction({ name: name.trim(), description });
      setCurrentOrganization(org.id);
      // Awaited, not fire-and-forget: an in-flight request resolving against
      // this route while router.push() is mid-flight has bounced the app
      // back here.
      await setLastOrganizationAction(org.id).catch(() => {});
      // Straight into the new org. Creating a project is no longer part of
      // this flow — it's done from the org's own Projects page.
      router.push(`/organizations/${org.id}/projects`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500">
          <Building2 size={20} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Create your organization</h1>
          <p className="text-xs text-zinc-400">Groups all your projects together.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Organization name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="rounded-lg border border-zinc-300/60 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
          />
          <p className="text-xs text-zinc-400">
            The suffix is a unique identifier — you can change the name but keep it unique.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">
            Description <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What does this organization work on?"
            className="rounded-lg border border-zinc-300/60 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2">
          {loading ? "Creating…" : <><span>Continue</span><ArrowRight size={15} /></>}
        </Button>

        <SkipOrgSetupLink
          href={skipHref}
          className="text-center text-sm font-medium text-zinc-400 hover:text-zinc-600 transition"
        />
      </form>
    </div>
  );
}
