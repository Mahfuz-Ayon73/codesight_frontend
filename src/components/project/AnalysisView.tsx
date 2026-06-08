"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronDown, ChevronRight, FileCode, AlertCircle, Layers, Crown, ArrowRight, ArrowLeft } from "lucide-react";
import type { Blueprint, BlueprintCluster, AnalysisStatus } from "@/types/project/project.schema";

type Props = {
  organizationId: string;
  projectId: string;
  initialStatus: AnalysisStatus;
};

export default function AnalysisView({ organizationId, projectId, initialStatus }: Props) {
  const [status, setStatus] = useState<AnalysisStatus>(initialStatus);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBlueprint = useCallback(async () => {
    const res = await fetch(
      `/api/project/blueprint?organizationId=${organizationId}&projectId=${projectId}`
    );
    if (!res.ok) throw new Error("Failed to load analysis results");
    return res.json() as Promise<Blueprint>;
  }, [organizationId, projectId]);

  const pollStatus = useCallback(async () => {
    const res = await fetch(
      `/api/project/status?organizationId=${organizationId}&projectId=${projectId}`
    );
    if (!res.ok) return;
    const data = await res.json();
    return data.analysisStatus as AnalysisStatus;
  }, [organizationId, projectId]);

  useEffect(() => {
    if (status === "COMPLETED") {
      fetchBlueprint()
        .then(setBlueprint)
        .catch((e) => setError(e.message));
      return;
    }

    if (status === "FAILED") return;

    // Poll every 3 seconds while analysis is running
    const interval = setInterval(async () => {
      const newStatus = await pollStatus();
      if (!newStatus) return;
      setStatus(newStatus);
      if (newStatus === "COMPLETED") {
        clearInterval(interval);
        fetchBlueprint()
          .then(setBlueprint)
          .catch((e) => setError(e.message));
      } else if (newStatus === "FAILED") {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status, fetchBlueprint, pollStatus]);

  // --- Analysing state ---
  if (status !== "COMPLETED" && status !== "FAILED") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white py-16 text-center px-6 gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-100 border-t-cyan-500 animate-spin" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-800">Analysing your codebase</p>
          <p className="text-xs text-zinc-400 mt-1">
            Building dependency graph, clustering modules…
          </p>
        </div>
        <span className="text-xs font-mono bg-zinc-100 text-zinc-500 px-3 py-1 rounded-full">
          {status.replace(/_/g, " ")}
        </span>
      </div>
    );
  }

  // --- Failed state ---
  if (status === "FAILED") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
        <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-700">Analysis failed</p>
          <p className="text-xs text-red-500 mt-1">
            Make sure the Python analysis service is running on port 8000, then re-upload the codebase.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
        <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400 py-8">
        <Loader2 size={14} className="animate-spin" /> Loading results…
      </div>
    );
  }

  return <BlueprintResults blueprint={blueprint} />;
}

// ---------------------------------------------------------------------------
// Blueprint results view
// ---------------------------------------------------------------------------

function BlueprintResults({ blueprint }: { blueprint: Blueprint }) {
  const meta = blueprint.project_metadata;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetaStat label="Paradigm" value={meta.detected_paradigm.replace(/_/g, " ")} />
        <MetaStat label="Files indexed" value={String(meta.total_nodes_indexed)} />
        <MetaStat label="Dependencies" value={String(meta.total_edges)} />
        <MetaStat label="Clusters" value={String(meta.total_clusters)} />
      </div>

      {/* Clusters */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-zinc-700">Architectural Clusters</p>
        {blueprint.clusters.map((cluster) => (
          <ClusterCard
            key={cluster.cluster_id}
            cluster={cluster}
            nodes={blueprint.nodes}
          />
        ))}
      </div>
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

// ---------------------------------------------------------------------------
// Cluster card — collapsible file list
// ---------------------------------------------------------------------------

function ClusterCard({
  cluster,
  nodes,
}: {
  cluster: BlueprintCluster;
  nodes: Blueprint["nodes"];
}) {
  const [open, setOpen] = useState(false);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const clusterNodes = cluster.node_ids
    .map((id) => nodeMap.get(id))
    .filter(Boolean) as Blueprint["nodes"];

  const godFiles = clusterNodes.filter((n) => n.is_god_file);
  const entryPoints = clusterNodes.filter((n) => n.execution_role === "ENTRY_POINT");

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-zinc-50 transition"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 shrink-0">
          <Layers size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-800 truncate">
            {cluster.suggested_title || cluster.cluster_id}
          </p>
          {cluster.functional_summary && (
            <p className="text-xs text-zinc-400 truncate mt-0.5">{cluster.functional_summary}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-zinc-400">{cluster.node_ids.length} files</span>
          {open ? (
            <ChevronDown size={14} className="text-zinc-400" />
          ) : (
            <ChevronRight size={14} className="text-zinc-400" />
          )}
        </div>
      </button>

      {/* Badge row */}
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

      {/* File list */}
      {open && (
        <div className="border-t border-zinc-100 divide-y divide-zinc-50">
          {clusterNodes.map((node) => (
            <FileRow key={node.id} node={node} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({ node }: { node: Blueprint["nodes"][number] }) {
  const roleIcon = {
    ENTRY_POINT: <ArrowRight size={11} className="text-green-500" />,
    TERMINAL_SINK: <ArrowLeft size={11} className="text-purple-400" />,
    INTERNAL: null,
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
          {node.is_god_file && (
            <Crown size={10} className="text-amber-500 shrink-0" />
          )}
        </div>
        {dir && (
          <p className="text-xs text-zinc-400 truncate">{dir}</p>
        )}
      </div>
      <span className="text-xs text-zinc-300 tabular-nums shrink-0">
        {(node.centrality_score * 100).toFixed(1)}%
      </span>
    </div>
  );
}
