"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, AlertCircle, CheckCircle, PlayCircle, BarChart2,
} from "lucide-react";
import type { AnalysisStatus } from "@/types/project/project.schema";

type Props = {
  organizationId: string;
  projectId: string;
  initialStatus: AnalysisStatus;
};

type ViewState = "ready" | "analyzing" | "done" | "failed";

type ProgressState = { stage: string | null; message: string | null };

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued",
  crawling: "Crawling repository",
  parsing: "Parsing code & generating embeddings",
  clustering: "Building dependency graph & clustering",
  labeling: "Labeling clusters with AI summaries",
  finalizing: "Finalizing analysis blueprint",
  cleanup: "Cleaning up temporary files",
  done: "Done",
};

function toViewState(status: AnalysisStatus): ViewState {
  if (status === "READY_FOR_ANALYSIS") return "ready";
  if (status === "IN_PROGRESS" || status === "ANALYZING") return "analyzing";
  if (status === "COMPLETED") return "done";
  if (status === "FAILED") return "failed";
  return "ready";
}

export default function AnalysisView({ organizationId, projectId, initialStatus }: Props) {
  const router = useRouter();
  const [view, setView] = useState<ViewState>(toViewState(initialStatus));
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({ stage: null, message: null });

  // Poll status while analyzing
  const pollStatus = useCallback(async () => {
    const res = await fetch(`/api/project/status?organizationId=${organizationId}&projectId=${projectId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      status: data.analysisStatus as AnalysisStatus,
      stage: (data.analysisStage as string | null) ?? null,
      message: (data.analysisMessage as string | null) ?? null,
    };
  }, [organizationId, projectId]);

  useEffect(() => {
    if (view !== "analyzing") return;
    const interval = setInterval(async () => {
      const result = await pollStatus();
      if (!result) return;
      setProgress({ stage: result.stage, message: result.message });
      if (result.status === "COMPLETED") { clearInterval(interval); setView("done"); }
      else if (result.status === "FAILED") { clearInterval(interval); setView("failed"); }
    }, 3000);
    return () => clearInterval(interval);
  }, [view, pollStatus]);

  async function handleTriggerAnalysis() {
    setTriggering(true);
    setError(null);
    setProgress({ stage: null, message: null });
    try {
      const res = await fetch(
        `/api/project/analyze?organizationId=${organizationId}&projectId=${projectId}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to start analysis");
      setView("analyzing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start analysis");
    } finally {
      setTriggering(false);
    }
  }

  function handleGetResults() {
    router.push(`/organizations/${organizationId}?projectId=${projectId}`);
  }

  // --- Ready for analysis ---
  if (view === "ready") {
    return (
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 py-12 text-center px-6 gap-4">
        <CheckCircle size={32} className="text-cyan-500" />
        <div>
          <p className="text-sm font-semibold text-cyan-800">Codebase uploaded successfully</p>
          <p className="text-xs text-cyan-600 mt-1">Ready to analyze. Click below to start.</p>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={handleTriggerAnalysis}
          disabled={triggering}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-700 transition disabled:opacity-60"
        >
          {triggering ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />}
          {triggering ? "Starting…" : "Analyze Codebase"}
        </button>
      </div>
    );
  }

  // --- Analyzing ---
  if (view === "analyzing") {
    const stageLabel = progress.stage ? STAGE_LABELS[progress.stage] ?? progress.stage : null;
    return (
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white py-16 text-center px-6 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-100 border-t-cyan-500 animate-spin" />
        <div>
          <p className="text-sm font-semibold text-zinc-800">
            {stageLabel ?? "Analysing your codebase"}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {progress.message ?? "Building dependency graph, clustering modules…"}
          </p>
        </div>
        <span className="text-xs font-mono bg-zinc-100 text-zinc-500 px-3 py-1 rounded-full">IN PROGRESS</span>
      </div>
    );
  }

  // --- Done — send the user to My Workspace to view the result ---
  if (view === "done") {
    return (
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 py-12 text-center px-6 gap-4">
        <BarChart2 size={32} className="text-cyan-500" />
        <div>
          <p className="text-sm font-semibold text-cyan-800">Analysis complete</p>
          <p className="text-xs text-cyan-600 mt-1">Your codebase has been mapped into clusters.</p>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={handleGetResults}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-700 transition"
        >
          <BarChart2 size={15} />
          Get Results
        </button>
      </div>
    );
  }

  // --- Failed ---
  return (
    <div className="max-w-4xl mx-auto w-full flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
      <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-red-700">Analysis failed</p>
        <p className="text-xs text-red-500 mt-1">Make sure the Python analysis service is running on port 8000.</p>
        <button
          onClick={handleTriggerAnalysis}
          disabled={triggering}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition disabled:opacity-60"
        >
          {triggering ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}
          Retry Analysis
        </button>
      </div>
    </div>
  );
}
