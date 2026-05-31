"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderOpen, GitBranch, Upload, ArrowRight } from "lucide-react";
import { createProjectAction } from "@/actions/project.action";
import InputField from "@/components/InputField/InputField";
import Button from "@/components/Button/Button";

type UploadMethod = "zip" | "github" | null;

export default function OnboardingCreateProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const project = await createProjectAction(orgId, {
        name: String(form.get("name")),
        description: String(form.get("description") || ""),
      });
      // After project created, go to the project page
      router.push(`/organizations/${orgId}/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        <StepDot done />
        <div className="h-px flex-1 bg-cyan-200" />
        <StepDot active />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500">
            <FolderOpen size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Create your first project</h1>
            <p className="text-xs text-zinc-400">Step 2 of 2 — Upload your source code to analyze it.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <InputField
            label="Project name"
            name="name"
            placeholder="e.g. Backend API"
            required
            autoFocus
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">
              Description <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              name="description"
              rows={2}
              placeholder="What does this project do?"
              className="rounded-lg border border-zinc-300/60 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
            />
          </div>

          {/* Upload method picker */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-zinc-700">How do you want to upload your code?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUploadMethod("zip")}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                  uploadMethod === "zip"
                    ? "border-cyan-400 bg-cyan-50 text-cyan-700"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <Upload size={15} />
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setUploadMethod("github")}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                  uploadMethod === "github"
                    ? "border-cyan-400 bg-cyan-50 text-cyan-700"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <GitBranch size={15} />
                GitHub URL
              </button>
            </div>

            {uploadMethod === "zip" && (
              <div
                onClick={() => fileRef.current?.click()}
                className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 py-6 text-sm text-zinc-400 hover:border-cyan-300 hover:text-cyan-500 transition"
              >
                <Upload size={20} className="mb-2" />
                <span>Click to select a ZIP file</span>
                <input ref={fileRef} type="file" name="file" accept=".zip" className="hidden" />
              </div>
            )}

            {uploadMethod === "github" && (
              <InputField
                label="GitHub repository URL"
                name="githubUrl"
                placeholder="https://github.com/user/repo"
              />
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2">
            {loading ? "Creating…" : <><span>Create project</span><ArrowRight size={15} /></>}
          </Button>

          <p className="text-center text-xs text-zinc-400">
            You can upload your code later from the project page.
          </p>
        </form>
      </div>
    </div>
  );
}

function StepDot({ active, done }: { active?: boolean; done?: boolean }) {
  return (
    <div className={`h-2.5 w-2.5 rounded-full ${
      done ? "bg-cyan-500" : active ? "bg-cyan-500" : "bg-zinc-200"
    }`} />
  );
}
