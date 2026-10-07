"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

export interface TourFileEntry {
  name: string;
  path: string;
  via:  string | null;
  linkType: string | null;
}

export interface TourNodeData extends Record<string, unknown> {
  title:     string;
  color:     string;
  domain:    string | null;
  files:     TourFileEntry[];
  /** Revealed by the most recent Next click — the hop being explained now. */
  isNew:     boolean;
  isRoot:    boolean;
  visualTheme: "dark" | "light";
  expanded:  boolean;
  onToggle:  () => void;
  onOpenFile: (path: string) => void;
}

function TourNodeInner({ data }: { data: TourNodeData }) {
  const { title, color, domain, files, isNew, isRoot, visualTheme, expanded, onToggle, onOpenFile } = data;
  const isLight = visualTheme === "light";

  // Past hops recede but stay on the canvas, so the path travelled is still
  // visible without competing with the hop being explained.
  const opacity = isNew || isRoot ? 1 : isLight ? 0.76 : 0.4;
  // Collapsed by default: listing files inline made each card ~150px tall and
  // a 12-cluster hop 1800px deep, which is the column problem all over again.
  const shown = expanded ? files : [];

  return (
    <div style={{ opacity, transition: "opacity 220ms ease" }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div
        className="px-3 py-2 flex flex-col gap-1 w-[210px] transition-all"
        style={{
          borderRadius: expanded ? 14 : 11,
          background: isLight
            ? isRoot
              ? "linear-gradient(135deg, #ecfdf5, #f0fdfa)"
              : isNew
                ? "linear-gradient(135deg, #eef2ff, #ecfeff)"
                : "rgba(255,255,255,0.96)"
            : isRoot
              ? "rgba(16,185,129,0.14)"
              : isNew ? "rgba(99,102,241,0.14)" : "rgba(16,16,28,0.95)",
          border: `1px solid ${isRoot
            ? (isLight ? "rgba(5,150,105,0.58)" : "rgba(52,211,153,0.7)")
            : isNew ? color : (isLight ? "rgba(148,163,184,0.58)" : "rgba(255,255,255,0.10)")}`,
          boxShadow: isNew || isRoot
            ? (isLight
                ? `0 8px 24px ${isRoot ? "rgba(5,150,105,0.16)" : "rgba(79,70,229,0.14)"}`
                : `0 0 18px ${isRoot ? "rgba(52,211,153,0.22)" : "rgba(99,102,241,0.22)"}`)
            : (isLight ? "0 4px 14px rgba(15,23,42,0.08)" : "none"),
        }}
      >
        {isRoot && (
          <span className={`text-[7px] font-bold uppercase tracking-widest ${isLight ? "text-emerald-700" : "text-emerald-300"}`}>
            Start here
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
          <span className={`text-[10px] font-semibold truncate flex-1 ${isLight ? "text-black" : "text-white/90"}`}>
            {title}
          </span>
          <span className={`text-[9px] font-mono ${isLight ? "text-slate-500" : "text-white/30"}`}>{files.length}</span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="flex items-center gap-1 text-left"
        >
          {domain && (
            <span className={`text-[8px] uppercase tracking-wider truncate ${isLight ? "font-semibold" : ""}`} style={{ color: isLight ? "#475569" : color }}>
              {domain}
            </span>
          )}
          <span className={`text-[8px] ml-auto ${isLight ? "text-indigo-600 hover:text-indigo-800" : "text-indigo-300/60 hover:text-indigo-200"}`}>
            {expanded ? "hide files" : "show files"}
          </span>
        </button>

        {expanded && (
          // max-h must stay in step with FILE_LIST_MAX_H in TourCanvas, which
          // is what the layout reserves for this list.
          <div className="flex flex-col overflow-y-auto" style={{ maxHeight: 208 }}>
            {shown.map((f) => (
              <button
                key={f.path}
                onClick={(e) => { e.stopPropagation(); onOpenFile(f.path); }}
                className={`text-left rounded px-1 transition-colors ${isLight ? "hover:bg-slate-100" : "hover:bg-white/[0.08]"}`}
                style={{ height: 15 }}
              >
                <span className={`text-[9px] font-mono truncate block leading-[15px] ${isLight ? "text-black" : "text-white/60"}`}>
                  {f.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

export default memo(TourNodeInner);
