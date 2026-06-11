"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FileCode, Crown, ArrowRight, ArrowLeft, Share2 } from "lucide-react";

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

  return (
    <div
      className="relative rounded-xl transition-all duration-150 cursor-pointer group"
      style={{
        width:      220,
        background: "rgba(15,15,25,0.82)",
        border:     `1px solid ${selected ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.08)"}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: selected
          ? `0 0 0 2px rgba(99,102,241,0.3), 0 4px 20px rgba(0,0,0,0.4)`
          : "0 2px 8px rgba(0,0,0,0.3)",
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
              : "rgba(99,102,241,0.12)",
          }}
        >
          {d.is_god_file
            ? <Crown size={11} className="text-amber-400" />
            : <FileCode size={11} className="text-indigo-400" />
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
        {role.label && (
          <span className={`flex items-center gap-0.5 text-[9px] px-1.5 py-px rounded-full border font-medium ${role.cls}`}>
            {role.icon}{role.label}
          </span>
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
        style={{ background: d.clusterColor }}
      />
    </div>
  );
}

export default memo(FileCardNode);
