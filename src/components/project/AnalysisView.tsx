"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Loader2, ChevronDown, ChevronRight, FileCode,
  AlertCircle, Layers, Crown, ArrowRight, ArrowLeft,
  CheckCircle, PlayCircle, BarChart2, Network, List
} from "lucide-react";
import type { Blueprint, AnalysisStatus } from "@/types/project/project.schema";
import type { EdgeDiffSelection } from "@/components/canvas/EdgeDiffPanel";

// Dynamically import the canvas to avoid SSR issues with React Flow
const CodeSightCanvas = dynamic(() => import("@/components/canvas/CodeSightCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] rounded-2xl flex items-center justify-center bg-[#0a0a14] border border-white/5">
      <Loader2 size={20} className="animate-spin text-indigo-400" />
    </div>
  ),
});
const EdgeDiffPanel = dynamic(() => import("@/components/canvas/EdgeDiffPanel"), { ssr: false });

type Props = {
  organizationId: string;
  projectId: string;
  initialStatus: AnalysisStatus;
};

type ViewState = "ready" | "analyzing" | "done" | "results" | "failed";

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
  const [view, setView] = useState<ViewState>(toViewState(initialStatus));
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
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

  async function handleGetResults() {
    setError(null);
    try {
      const res = await fetch(`/api/project/blueprint?organizationId=${organizationId}&projectId=${projectId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const detail = body?.message ?? res.statusText ?? "Unknown error";
        // Surface the real reason: status not COMPLETED vs file missing vs analyzer down.
        throw new Error(`HTTP ${res.status} — ${detail}`);
      }
      const data = await res.json() as Blueprint;
      setBlueprint(data);
      setView("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results");
    }
  }

  // --- Ready for analysis ---
  if (view === "ready") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-green-200 bg-green-50 py-12 text-center px-6 gap-4">
        <CheckCircle size={32} className="text-green-500" />
        <div>
          <p className="text-sm font-semibold text-green-800">Codebase uploaded successfully</p>
          <p className="text-xs text-green-600 mt-1">Ready to analyze. Click below to start.</p>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={handleTriggerAnalysis}
          disabled={triggering}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition disabled:opacity-60"
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white py-16 text-center px-6 gap-4">
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

  // --- Done, waiting for user to fetch results ---
  if (view === "done") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 py-12 text-center px-6 gap-4">
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
  if (view === "failed") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
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

  // --- Results ---
  if (!blueprint) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400 py-8">
        <Loader2 size={14} className="animate-spin" /> Loading results…
      </div>
    );
  }

  return <BlueprintResults blueprint={blueprint} projectId={projectId} organizationId={organizationId} />;
}

// ---------------------------------------------------------------------------
// Blueprint results
// ---------------------------------------------------------------------------

function BlueprintResults({ blueprint, projectId, organizationId }: { blueprint: Blueprint; projectId: string; organizationId: string }) {
  const [viewMode, setViewMode] = useState<"canvas" | "list">("canvas");
  // Edge clicked in the graph's flow mode — renders as its own section below the
  // canvas (not inside it), so the canvas itself never resizes.
  const [edgeSelection, setEdgeSelection] = useState<EdgeDiffSelection | null>(null);
  const meta = blueprint.project_metadata;

  return (
    <div className="flex flex-col gap-4">
      {/* Meta stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetaStat label="Paradigm" value={meta.detected_paradigm.replace(/_/g, " ")} />
        <MetaStat label="Files indexed" value={String(meta.total_nodes_indexed)} />
        <MetaStat label="Dependencies" value={String(meta.total_edges)} />
        <MetaStat label="Clusters" value={String(meta.total_clusters)} />
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode("canvas")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            viewMode === "canvas"
              ? "bg-indigo-600 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          <Network size={13} /> Graph View
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            viewMode === "list"
              ? "bg-indigo-600 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          <List size={13} /> List View
        </button>
        {viewMode === "canvas" && (
          <span className="text-xs text-zinc-400 ml-1">
            Drag files between clusters · Delete key removes edges · Scroll to zoom
          </span>
        )}
      </div>

      {/* Canvas */}
      {viewMode === "canvas" && (
        <>
          <div
            className="-mx-6 w-[calc(100%+3rem)]"
            style={{ height: "calc(100vh - 160px)", minHeight: 640 }}
          >
            <CodeSightCanvas
              blueprint={blueprint} projectId={projectId} orgId={organizationId}
              onEdgeSelect={setEdgeSelection}
            />
          </div>

          {/* Edge relation code view — a separate section below the canvas (the
              parent's flex gap-4 gives it breathing room), never overlapping or
              resizing the graph above it. */}
          <EdgeDiffPanel
            selection={edgeSelection}
            organizationId={organizationId}
            projectId={projectId}
            onClose={() => setEdgeSelection(null)}
          />
        </>
      )}

      {/* List */}
      {viewMode === "list" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-zinc-700">Architectural Clusters</p>
          {blueprint.clusters
            .filter((c) => !c.id.startsWith("shared_dep_"))
            .map((cluster) => (
              <ClusterCard key={cluster.id} cluster={cluster} nodes={blueprint.nodes} />
            ))}
          {blueprint.clusters.some((c) => c.id.startsWith("shared_dep_")) && (
            <>
              <p className="text-sm font-semibold text-zinc-700 mt-2">Shared Dependencies</p>
              {blueprint.clusters
                .filter((c) => c.id.startsWith("shared_dep_"))
                .map((cluster) => (
                  <ClusterCard key={cluster.id} cluster={cluster} nodes={blueprint.nodes} />
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-zinc-800 capitalize">{value.toLowerCase()}</p>
    </div>
  );
}

function ClusterCard({ cluster, nodes }: { cluster: Blueprint["clusters"][number]; nodes: Blueprint["nodes"] }) {
  const [open, setOpen] = useState(false);
  const clusterNodes = nodes.filter((n) => n.cluster_id === cluster.id);
  const godFiles = clusterNodes.filter((n) => n.is_god_file);
  const entryPoints = clusterNodes.filter((n) => n.execution_role === "ENTRY_POINT");

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-zinc-50 transition"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 shrink-0">
          <Layers size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-800 truncate">{cluster.suggested_title || cluster.id}</p>
          {cluster.functional_summary && (
            <p className="text-xs text-zinc-400 truncate mt-0.5">{cluster.functional_summary}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-zinc-400">{clusterNodes.length} files</span>
          {open ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
        </div>
      </button>

      {(godFiles.length > 0 || entryPoints.length > 0) && (
        <div className="flex gap-2 px-4 pb-2.5 flex-wrap">
          {godFiles.length > 0 && (
            <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
              <Crown size={10} /> {godFiles.length} god file{godFiles.length > 1 ? "s" : ""}
            </span>
          )}
          {entryPoints.length > 0 && (
            <span className="flex items-center gap-1 text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full">
              <ArrowRight size={10} /> {entryPoints.length} entry point{entryPoints.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {open && (
        <div className="border-t border-zinc-100 divide-y divide-zinc-50">
          {clusterNodes.map((node) => <FileRow key={node.id} node={node} />)}
        </div>
      )}
    </div>
  );
}

function FileRow({ node }: { node: Blueprint["nodes"][number] }) {
  const roleIcon = {
    ENTRY_POINT:        <ArrowRight size={11} className="text-green-500" />,
    TERMINAL_SINK:      <ArrowLeft size={11} className="text-purple-400" />,
    INTERNAL:           null,
    SHARED_DEPENDENCY:  null,
  }[node.execution_role];

  const parts = node.canonical_path.split("/");
  const fileName = parts.pop() ?? node.canonical_path;
  const dir = parts.join("/");

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-zinc-50 transition">
      <FileCode size={13} className={node.is_god_file ? "text-amber-500" : "text-zinc-400"} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-zinc-700 truncate">{fileName}</span>
          {roleIcon}
          {node.is_god_file && <Crown size={10} className="text-amber-500 shrink-0" />}
        </div>
        {dir && <p className="text-xs text-zinc-400 truncate">{dir}</p>}
      </div>
      <span className="text-xs text-zinc-300 tabular-nums shrink-0">
        {(node.centrality_score * 100).toFixed(1)}%
      </span>
    </div>
  );
}
