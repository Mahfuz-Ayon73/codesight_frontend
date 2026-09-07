"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FileCode, Crown, ArrowRight, ArrowLeft, Share2, Unlink, Plus, Pencil, Minus, Move } from "lucide-react";
import type { DiffStatus } from "@/types/project/project.schema";

const DIFF_CONFIG: Record<DiffStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  added:    { color: "#34d399", bg: "rgba(16,185,129,0.15)", icon: <Plus size={8} />,   label: "added" },
  modified: { color: "#fbbf24", bg: "rgba(245,158,11,0.15)", icon: <Pencil size={8} />, label: "modified" },
  deleted:  { color: "#f87171", bg: "rgba(239,68,68,0.15)",  icon: <Minus size={8} />,  label: "deleted" },
  moved:    { color: "#c084fc", bg: "rgba(168,85,247,0.15)", icon: <Move size={8} />,   label: "moved" },
};

interface FileCardData {
  id:                   number;
  canonical_path:       string;
  centrality_score:     number;
  is_god_file:          boolean;
  execution_role:       "ENTRY_POINT" | "TERMINAL_SINK" | "INTERNAL" | "SHARED_DEPENDENCY";
  external_dependencies: string[];
  text_summary:         string;
  clusterId:            string;
  clusterColor:         string;
  isSharedDep?:         boolean;
  referencedBy?:        string[];
  isOrphan?:            boolean;
  isFlowOrphan?:        boolean;
  edgeCount?:           number;
  flowActive?:          boolean;
  showAllEdges?:        boolean;   // when false, entry nodes show a "trace flow" pill
  isSelectedEntry?:     boolean;   // this entry is the currently traced flow source
  onSelectFlow?:        () => void;
  /** Set when a commit diff overlay is active and this file changed in the selected commit. */
  diffStatus?:          DiffStatus;
  [key: string]: unknown;
}

const ROLE_CONFIG = {
  ENTRY_POINT: {
    icon:  <ArrowRight size={9} />,
    label: "entry",
    cls:   "bg-emerald-900/40 text-emerald-300 border-emerald-600/40",
  },
  TERMINAL_SINK: {
    icon:  <ArrowLeft size={9} />,
    label: "sink",
    cls:   "bg-violet-900/40 text-violet-300 border-violet-600/40",
  },
  INTERNAL: {
    icon:  null,
    label: "",
    cls:   "",
  },
  SHARED_DEPENDENCY: {
    icon:  <Share2 size={9} />,
    label: "shared",
    cls:   "bg-amber-900/40 text-amber-300 border-amber-600/40",
  },
};

function FileCardNode({ data, selected }: NodeProps) {
  const d = data as FileCardData;
  const parts    = d.canonical_path.split("/");
  const fileName = parts.pop() ?? d.canonical_path;
  const ext      = fileName.split(".").pop() ?? "";
  const dirLabel = parts.slice(-2).join("/");
  const role     = ROLE_CONFIG[d.execution_role] ?? ROLE_CONFIG.INTERNAL;

  const flowActive      = !!d.flowActive;
  const showAllEdges    = d.showAllEdges !== false;
  const isSelectedEntry = !!d.isSelectedEntry;
  const isOrphan        = flowActive ? d.isFlowOrphan : d.isOrphan;
  const diff             = d.diffStatus ? DIFF_CONFIG[d.diffStatus] : null;

  // Show the "trace flow" pill above ENTRY_POINT nodes when showAllEdges is off
  const showEntrySelector =
    flowActive && !showAllEdges && d.execution_role === "ENTRY_POINT" && !isOrphan;

  return (
    <div className="relative flex flex-col items-center">
      {/* Trace-flow selector pill */}
      {showEntrySelector && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            (d.onSelectFlow as (() => void) | undefined)?.();
          }}
          className="mb-1 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all nodrag nopan"
          style={{
            background: isSelectedEntry ? "rgba(6,182,212,0.25)" : "rgba(6,182,212,0.08)",
            border:     `1px solid ${isSelectedEntry ? "rgba(6,182,212,0.7)" : "rgba(6,182,212,0.25)"}`,
            color:      isSelectedEntry ? "#67e8f9" : "rgba(6,182,212,0.5)",
            cursor:     "pointer",
          }}
        >
          <ArrowRight size={8} />
          {isSelectedEntry ? "tracing flow" : "trace flow"}
        </button>
      )}

      {/* Card */}
      <div
        className="relative rounded-xl transition-all duration-150 cursor-pointer group"
        style={{
          width:      220,
          background: flowActive
            ? isOrphan ? "rgba(10,10,15,0.4)" : "rgba(10,25,35,0.85)"
            : d.isOrphan ? "rgba(30,20,10,0.85)" : "rgba(15,15,25,0.82)",
          border: `1px solid ${
            diff
              ? diff.color
              : selected
                ? flowActive ? "rgba(6,182,212,0.9)" : "rgba(99,102,241,0.8)"
                : flowActive
                  ? isOrphan
                    ? "rgba(255,255,255,0.03)"
                    : isSelectedEntry
                      ? "rgba(6,182,212,0.65)"
                      : "rgba(6,182,212,0.3)"
                  : d.isOrphan
                    ? "rgba(245,158,11,0.25)"
                    : "rgba(255,255,255,0.08)"
          }`,
          backdropFilter: flowActive ? "none" : "blur(12px)",
          WebkitBackdropFilter: flowActive ? "none" : "blur(12px)",
          boxShadow: diff
            ? `0 0 0 1px ${diff.color}, 0 4px 20px rgba(0,0,0,0.35)`
            : isSelectedEntry
              ? "0 0 0 1px rgba(6,182,212,0.4), 0 4px 24px rgba(6,182,212,0.15)"
              : selected
                ? flowActive
                  ? "0 0 0 2px rgba(6,182,212,0.3), 0 4px 20px rgba(0,0,0,0.4)"
                  : "0 0 0 2px rgba(99,102,241,0.3), 0 4px 20px rgba(0,0,0,0.4)"
                : "0 2px 8px rgba(0,0,0,0.3)",
          opacity: flowActive ? (isOrphan ? 0.35 : 1) : d.isOrphan ? 0.75 : 1,
        }}
      >
        <Handle type="target" position={Position.Top}    style={{ opacity: 0, top: -1 }} />
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0, bottom: -1 }} />

        <div className="px-3 py-2.5 flex items-start gap-2">
          {/* Icon */}
          <div
            className="mt-0.5 flex items-center justify-center w-6 h-6 rounded-md shrink-0"
            style={{
              background: d.is_god_file
                ? "rgba(245,158,11,0.15)"
                : flowActive ? "rgba(6,182,212,0.12)" : "rgba(99,102,241,0.12)",
            }}
          >
            {d.is_god_file
              ? <Crown size={11} className="text-amber-400" />
              : <FileCode size={11} className={flowActive ? "text-cyan-400" : "text-indigo-400"} />
            }
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-zinc-100 truncate leading-tight">
                {fileName}
              </span>
              {ext && (
                <span className="text-[9px] font-mono px-1 py-px rounded bg-zinc-700/60 text-zinc-400 shrink-0 uppercase">
                  {ext}
                </span>
              )}
            </div>
            {dirLabel && (
              <p className="text-[9px] text-zinc-500 truncate mt-0.5 leading-tight">{dirLabel}</p>
            )}
          </div>

          {/* Centrality */}
          <span className="text-[9px] text-zinc-500 tabular-nums shrink-0 mt-0.5">
            {(d.centrality_score * 100).toFixed(1)}%
          </span>
        </div>

        {/* Badges */}
        <div className="px-3 pb-2 flex gap-1 flex-wrap">
          {diff && (
            <span
              className="flex items-center gap-0.5 text-[9px] px-1.5 py-px rounded-full border font-medium"
              style={{ background: diff.bg, color: diff.color, borderColor: diff.color }}
            >
              {diff.icon}{diff.label}
            </span>
          )}
          {role.label && (
            <span className={`flex items-center gap-0.5 text-[9px] px-1.5 py-px rounded-full border font-medium ${role.cls}`}>
              {role.icon}{role.label}
            </span>
          )}
          {flowActive ? (
            isOrphan ? (
              <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-px rounded-full border font-medium bg-zinc-800/50 text-zinc-500 border-zinc-700/30">
                <Unlink size={8} />no flow
              </span>
            ) : (
              d.edgeCount !== undefined && d.edgeCount > 0 && (
                <span className="text-[9px] text-cyan-400 font-mono">
                  {d.edgeCount} flow{d.edgeCount !== 1 ? "s" : ""}
                </span>
              )
            )
          ) : (
            <>
              {d.isOrphan && (
                <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-px rounded-full border font-medium bg-amber-900/30 text-amber-400 border-amber-600/30">
                  <Unlink size={8} />isolated
                </span>
              )}
              {!d.isOrphan && d.edgeCount !== undefined && d.edgeCount > 0 && (
                <span className="text-[9px] text-emerald-400/70 font-mono">
                  {d.edgeCount} dep{d.edgeCount !== 1 ? "s" : ""}
                </span>
              )}
            </>
          )}
          {d.isSharedDep && d.referencedBy && d.referencedBy.length > 0 && (
            <span className="text-[9px] text-amber-400/80 truncate">
              ×{d.referencedBy.length} clusters
            </span>
          )}
        </div>

        {/* Left accent bar */}
        <div
          className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
          style={{ background: diff ? diff.color : flowActive ? (isOrphan ? "rgba(255,255,255,0.05)" : "#06b6d4") : d.clusterColor }}
        />
      </div>
    </div>
  );
}

export default memo(FileCardNode);
