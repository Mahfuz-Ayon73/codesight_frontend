"use client";

import { Layers } from "lucide-react";
import type { BlueprintCluster } from "@/types/project/project.schema";
import { CLUSTER_COLORS, type ClusterIndex } from "./useD3Layout";

interface Props {
  clusters:    BlueprintCluster[];
  index:       ClusterIndex;
  colorOffset: number;
  isOpen:      boolean;
  onToggle:    () => void;
  onDragStart: (e: { dataTransfer: DataTransfer }, clusterId: string) => void;
}

const panelStyle = {
  background:     "rgba(8,8,16,0.92)",
  backdropFilter: "blur(14px)",
} as const;

export default function IsolatedClusterPanel({
  clusters, index, colorOffset, isOpen, onToggle, onDragStart,
}: Props) {
  return (
    <div className="absolute right-0 top-0 bottom-0 flex items-stretch z-10 pointer-events-none">

      {/* Slide-in card list */}
      <div
        className="flex flex-col gap-2 overflow-y-auto overflow-x-hidden transition-all duration-300 pointer-events-auto"
        style={{
          ...panelStyle,
          width:          isOpen ? 210 : 0,
          padding:        isOpen ? "10px 8px" : 0,
          opacity:        isOpen ? 1 : 0,
          borderLeft:     "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {isOpen && (
          <>
            <p className="text-[9px] font-semibold text-white/30 uppercase tracking-widest px-1 mb-0.5 shrink-0">
              Isolated · {clusters.length}
            </p>
            {clusters.map((cluster, i) => {
              const ci = ((i + colorOffset) % CLUSTER_COLORS.length + CLUSTER_COLORS.length) % CLUSTER_COLORS.length;
              const color = CLUSTER_COLORS[ci];
              const fileCount = index.descendantCount.get(cluster.id) ?? 0;
              return (
                <div
                  key={cluster.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, cluster.id)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing select-none shrink-0 transition-transform hover:scale-[1.02]"
                  style={{
                    background: color.bg,
                    border:     `1px solid ${color.border}`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                    style={{ background: color.border }}
                  >
                    <Layers size={9} color="#fff" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[10px] font-semibold truncate"
                      style={{ color: color.border.replace("0.50", "0.95") }}
                    >
                      {cluster.suggested_title ?? cluster.name ?? cluster.id}
                    </p>
                    <p className="text-[9px] text-white/35">{fileCount} files</p>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Toggle tab — always visible */}
      <button
        onClick={onToggle}
        className="flex flex-col items-center justify-center gap-1.5 px-1.5 pointer-events-auto transition-all duration-200"
        style={{
          ...panelStyle,
          borderLeft:  "1px solid rgba(255,255,255,0.07)",
          minWidth:    28,
          color:       isOpen ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.4)",
          background:  isOpen ? "rgba(99,102,241,0.10)" : "rgba(8,8,16,0.88)",
        }}
      >
        <span
          className="text-[9px] font-semibold uppercase tracking-widest"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Isolated
        </span>
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
          style={{ background: "rgba(99,102,241,0.22)", color: "rgba(99,102,241,0.9)" }}
        >
          {clusters.length}
        </span>
      </button>
    </div>
  );
}
