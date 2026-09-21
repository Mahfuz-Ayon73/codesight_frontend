"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { EDGE_TYPE_COLORS, type EdgeFilterOptions } from "./useD3Layout";

interface Props {
  filters:              EdgeFilterOptions;
  onChange:             (f: EdgeFilterOptions) => void;
  showOverviewControls: boolean;
  /** Count of connections currently hidden by the overview cap, if any. */
  hiddenCount?:         number;
  theme?:               "dark" | "light";
}

const TYPE_ROWS: Array<{
  key:   keyof Pick<EdgeFilterOptions,
                    "showRenders" | "showBelongsToDomain" | "showSemanticSimilarity" |
                    "showCallsApi" | "showEmitsEvent" | "showProvidesState">;
  label: string;
  color: string;
}> = [
  { key: "showRenders",            label: "RENDERS",    color: EDGE_TYPE_COLORS.RENDERS             },
  { key: "showBelongsToDomain",    label: "DOMAIN",     color: EDGE_TYPE_COLORS.BELONGS_TO_DOMAIN   },
  { key: "showSemanticSimilarity", label: "SIMILARITY", color: EDGE_TYPE_COLORS.SEMANTIC_SIMILARITY },
  { key: "showCallsApi",           label: "API CALL",   color: EDGE_TYPE_COLORS.CALLS_API           },
  { key: "showEmitsEvent",         label: "EVENT",      color: EDGE_TYPE_COLORS.EMITS_EVENT         },
  { key: "showProvidesState",      label: "STATE",      color: EDGE_TYPE_COLORS.PROVIDES_STATE      },
];

export default function EdgeFilterPanel({ filters, onChange, showOverviewControls, hiddenCount = 0, theme = "dark" }: Props) {
  const [open, setOpen] = useState(false);
  const isLight = theme === "light";

  const set = (key: keyof EdgeFilterOptions, value: boolean | number) =>
    onChange({ ...filters, [key]: value });

  const nonDefaultCount = [
    !filters.showRenders,
    !filters.showBelongsToDomain,
    filters.showSemanticSimilarity,
    !filters.showCallsApi,
    !filters.showEmitsEvent,
    !filters.showProvidesState,
    filters.showDeadImports,
  ].filter(Boolean).length;

  const panelStyle = {
    background:     isLight ? "rgba(255,255,255,0.97)" : "rgba(8,8,16,0.92)",
    border:         `1px solid ${isLight ? "rgba(6,182,212,0.48)" : "rgba(255,255,255,0.08)"}`,
    backdropFilter: "blur(14px)",
  } as const;

  const checkmark = (
    <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
      <path d="M1 2.5L2.8 4.2L6 1" stroke="white" strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div className={`flex flex-col items-end gap-1.5 ${isLight ? "canvas-filter-light" : ""}`}>
      {open && (
        <div className="rounded-xl px-3 py-2.5 flex flex-col gap-2 min-w-[184px]" style={panelStyle}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold text-white/40 uppercase tracking-widest">
              Edge Filters
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-white/25 hover:text-white/60 transition-colors"
            >
              <X size={10} />
            </button>
          </div>

          {/* Edge type toggles */}
          {TYPE_ROWS.map(({ key, label, color }) => {
            const checked = filters[key] as boolean;
            return (
              <label key={key} className="flex items-center gap-2 cursor-pointer group">
                <span
                  onClick={() => set(key, !checked)}
                  className="w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-all"
                  style={{ background: checked ? color : "transparent", borderColor: color }}
                >
                  {checked && checkmark}
                </span>
                <span className="text-[10px] font-mono text-white/50 group-hover:text-white/75 transition-colors flex-1">
                  {label}
                </span>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              </label>
            );
          })}

          <div className="h-px bg-white/[0.06]" />

          {/* Dead imports toggle */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <span
              onClick={() => set("showDeadImports", !filters.showDeadImports)}
              className="w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-all"
              style={{
                background:  filters.showDeadImports ? "rgba(239,68,68,0.65)" : "transparent",
                borderColor: "rgba(239,68,68,0.65)",
              }}
            >
              {filters.showDeadImports && checkmark}
            </span>
            <span className="text-[10px] font-mono text-white/50 group-hover:text-white/75 transition-colors flex-1">
              Dead Imports
            </span>
            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-500/60" />
          </label>

          {/* Overview-only: max edges stepper */}
          {showOverviewControls && (
            <>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/35 flex-1">Max edges</span>
                <button
                  onClick={() => set("overviewMaxEdges", Math.max(5, filters.overviewMaxEdges - 5))}
                  className="w-5 h-5 rounded text-[11px] font-bold text-white/45 hover:text-white/80 bg-white/5 hover:bg-white/10 transition-all"
                >
                  −
                </button>
                <span className="text-[10px] font-mono text-white/65 w-4 text-center tabular-nums">
                  {filters.overviewMaxEdges}
                </span>
                <button
                  onClick={() => set("overviewMaxEdges", Math.min(100, filters.overviewMaxEdges + 5))}
                  className="w-5 h-5 rounded text-[11px] font-bold text-white/45 hover:text-white/80 bg-white/5 hover:bg-white/10 transition-all"
                >
                  +
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden-by-cap hint — connections are summarized, not dropped */}
      {hiddenCount > 0 && (
        <div
          className="px-2.5 py-1 rounded-lg text-[9px] font-mono"
          style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.30)", color: "rgba(252,211,77,0.9)" }}
          title="Raise Max edges or merge clusters to reveal more connections"
        >
          {hiddenCount} connection{hiddenCount !== 1 ? "s" : ""} hidden
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all"
        style={{
          background:     open ? "rgba(99,102,241,0.22)" : (isLight ? "rgba(255,255,255,0.97)" : "rgba(8,8,16,0.88)"),
          border:         `1px solid ${open ? "rgba(99,102,241,0.50)" : (isLight ? "rgba(6,182,212,0.48)" : "rgba(255,255,255,0.08)")}`,
          backdropFilter: "blur(14px)",
          color:          open ? (isLight ? "#4338ca" : "rgba(99,102,241,0.90)") : (isLight ? "#334155" : "rgba(255,255,255,0.50)"),
        }}
      >
        <SlidersHorizontal size={11} />
        <span className="text-[10px] font-semibold">Edges</span>
        {nonDefaultCount > 0 && (
          <span
            className="w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.75)", color: "#fff" }}
          >
            {nonDefaultCount}
          </span>
        )}
      </button>
    </div>
  );
}
