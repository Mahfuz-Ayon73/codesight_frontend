"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { FolderPlus, X } from "lucide-react";
import { createProjectAction } from "@/actions/project.action";
import InputField from "@/components/InputField/InputField";
import Button from "@/components/Button/Button";

export default function NewProjectPage() {
  const router = useRouter();
  const { organizationId } = useParams<{ organizationId: string }>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleClose() {
    router.back();
  }

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
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
        >
          <X size={16} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500">
            <FolderPlus size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">New Project</h1>
            <p className="text-xs text-zinc-400">Add a project to this organization.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <InputField label="Project name" name="name" placeholder="e.g. Backend API" required autoFocus />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">
              Description <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="What does this project do?"
              className="rounded-lg border border-zinc-300/60 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create project"}
          </Button>
        </form>
      </div>
    </div>
  );
}
