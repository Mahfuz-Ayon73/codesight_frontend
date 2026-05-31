"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createProjectAction } from "@/actions/project.action";
import InputField from "@/components/InputField/InputField";
import Button from "@/components/Button/Button";

export default function NewProjectPage() {
  const router = useRouter();
  const { organizationId } = useParams<{ organizationId: string }>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const project = await createProjectAction(organizationId, {
        name: String(form.get("name")),
        description: String(form.get("description") || ""),
      });
      router.push(`/organizations/${organizationId}/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">New Project</h1>
      <p className="text-sm text-zinc-500 mb-6">Add a project to this organization.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <InputField label="Project name" name="name" required />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Description (optional)</label>
          <textarea
            name="description"
            rows={3}
            className="rounded-lg border border-zinc-300/60 bg-white/40 px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create project"}
        </Button>
      </form>
    </div>
  );
}
