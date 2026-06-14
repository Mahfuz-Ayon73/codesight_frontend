"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Layers, ChevronRight } from "lucide-react";

interface ClusterGroupData {
  label:        string;
  summary:      string;
  fileCount:    number;
  colorBg:      string;
  colorBorder:  string;
  clusterId:    string;
  isBackground?: boolean;
  [key: string]: unknown;
}

function ClusterGroupNode({ data, selected }: NodeProps) {
  const d = data as ClusterGroupData;

  // Background stage node inside detail view — no interaction chrome
  if (d.isBackground) {
    return (
      <div
        className="relative w-full h-full rounded-2xl"
        style={{
          background:   d.colorBg,
          border:       `1.5px solid ${d.colorBorder}`,
          pointerEvents: "none",
        }}
      >
        <div className="absolute top-3 left-4 flex items-center gap-1.5 select-none">
          <div
            className="flex items-center justify-center w-5 h-5 rounded-md"
            style={{ background: d.colorBorder }}
          >
            <Layers size={11} color="#fff" />
          </div>
          <span
            className="text-[11px] font-semibold tracking-wide truncate max-w-[200px]"
            style={{ color: d.colorBorder.replace("0.50", "0.95") }}
          >
            {d.label}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
            style={{
              background: d.colorBorder.replace("0.50", "0.12"),
              color:      d.colorBorder.replace("0.50", "0.85"),
            }}
          >
            {d.fileCount}
          </span>
        </div>
      </div>
    );
  }

  // Overview node — clickable pill card
  return (
    <div
      className="relative w-full h-full rounded-2xl transition-all duration-200 cursor-pointer group"
      style={{
        background:   d.colorBg,
        border:       `1.5px solid ${selected ? "rgba(255,255,255,0.5)" : d.colorBorder}`,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: selected
          ? `0 0 0 3px ${d.colorBorder}, 0 8px 32px rgba(0,0,0,0.30)`
          : `0 2px 16px rgba(0,0,0,0.18)`,
      }}
    >
      <Handle type="target" position={Position.Top}    style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {/* Icon + title */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none select-none">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-md shrink-0"
          style={{ background: d.colorBorder }}
        >
          <Layers size={12} color="#fff" />
        </div>
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold leading-tight truncate max-w-[150px]"
            style={{ color: d.colorBorder.replace("0.50", "0.95") }}
          >
            {d.label}
          </p>
          <p className="text-[9px] text-white/35 mt-0.5 truncate max-w-[150px]">
            {d.fileCount} files
          </p>
        </div>
      </div>

      {/* Click to open hint */}
      <div
        className="absolute bottom-2.5 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none select-none"
        style={{ color: d.colorBorder.replace("0.50", "0.80") }}
      >
        <span className="text-[9px] font-medium">open</span>
        <ChevronRight size={9} />
      </div>
    </div>
  );
}

export default memo(ClusterGroupNode);
