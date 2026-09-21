"use client";

import { useMemo, useState } from "react";
import { Users, X, AlertTriangle, Loader2 } from "lucide-react";
import { getOwnerStyle, BUS_FACTOR_THRESHOLD } from "./ownershipStyles";

export interface ClusterOwnerInfo {
  clusterId: string;
  ownerName: string | null;
  ownerPercentage: number;
  ownerCount: number;
}

interface Props {
  /** Per-visible-cluster (post-merge) primary owner, once ownership is loaded. */
  clusterOwners:         ClusterOwnerInfo[];
  selected:              Set<string>;
  onSelectedChange:      (next: Set<string>) => void;
  colorByOwner:          boolean;
  onColorByOwnerChange:  (v: boolean) => void;
  /** Whether ownership data has been requested — fetch is lazy (git blame isn't free). */
  enabled:               boolean;
  onEnableChange:        (v: boolean) => void;
  loading:               boolean;
  error:                 string | null;
  theme?:                "dark" | "light";
}

interface OwnerRow {
  key:   string;
  count: number;
  riskyCount: number;
}

export default function OwnershipFilterPanel({
  clusterOwners, selected, onSelectedChange, colorByOwner, onColorByOwnerChange,
  enabled, onEnableChange, loading, error, theme = "dark",
}: Props) {
  const [open, setOpen] = useState(false);
  const isLight = theme === "light";

  const rows = useMemo<OwnerRow[]>(() => {
    const acc = new Map<string, OwnerRow>();
    for (const c of clusterOwners) {
      if (!c.ownerName) continue;
      const row = acc.get(c.ownerName) ?? { key: c.ownerName, count: 0, riskyCount: 0 };
      row.count += 1;
      if (c.ownerPercentage >= BUS_FACTOR_THRESHOLD && c.ownerCount <= 2) row.riskyCount += 1;
      acc.set(c.ownerName, row);
    }
    return [...acc.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }, [clusterOwners]);

  const totalRisky = rows.reduce((sum, r) => sum + r.riskyCount, 0);

  const toggleOwner = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    onSelectedChange(next);
  };

  const nonDefaultCount = selected.size + (colorByOwner ? 1 : 0);

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
        <div className="rounded-xl px-3 py-2.5 flex flex-col gap-2 min-w-[196px] max-h-64 overflow-y-auto" style={panelStyle}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold text-white/40 uppercase tracking-widest">
              Ownership
            </span>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button
                  onClick={() => onSelectedChange(new Set())}
                  className="text-[9px] text-indigo-400/80 hover:text-indigo-300 transition-colors"
                >
                  clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-white/25 hover:text-white/60 transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          </div>

          {/* Show ownership toggle — lazily triggers the git-blame fetch */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <span
              onClick={() => onEnableChange(!enabled)}
              className="w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-all"
              style={{
                background:  enabled ? "rgba(99,102,241,0.85)" : "transparent",
                borderColor: "rgba(99,102,241,0.85)",
              }}
            >
              {enabled && checkmark}
            </span>
            <span className="text-[10px] font-mono text-white/50 group-hover:text-white/75 transition-colors flex-1">
              Show ownership
            </span>
            {loading && <Loader2 size={10} className="animate-spin text-white/40" />}
          </label>

          {error && <p className="text-[9px] text-red-400/80">{error}</p>}

          {enabled && !loading && rows.length > 0 && (
            <>
              {/* Color-by-owner toggle */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <span
                  onClick={() => onColorByOwnerChange(!colorByOwner)}
                  className="w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-all"
                  style={{
                    background:  colorByOwner ? "rgba(99,102,241,0.85)" : "transparent",
                    borderColor: "rgba(99,102,241,0.85)",
                  }}
                >
                  {colorByOwner && checkmark}
                </span>
                <span className="text-[10px] font-mono text-white/50 group-hover:text-white/75 transition-colors flex-1">
                  Color by owner
                </span>
              </label>

              <div className="h-px bg-white/[0.06]" />

              {rows.map((row) => {
                const os = getOwnerStyle(row.key);
                const checked = selected.has(row.key);
                return (
                  <label key={row.key} className="flex items-center gap-2 cursor-pointer group">
                    <span
                      onClick={() => toggleOwner(row.key)}
                      className="w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-all"
                      style={{ background: checked ? os.dot : "transparent", borderColor: os.dot }}
                    >
                      {checked && checkmark}
                    </span>
                    <span
                      className="text-[10px] font-mono text-white/50 group-hover:text-white/75 transition-colors flex-1 truncate max-w-[110px]"
                      title={row.key}
                    >
                      {row.key}
                    </span>
                    {row.riskyCount > 0 && (
                      <AlertTriangle size={8} color="rgba(251,191,36,0.85)" />
                    )}
                    <span className="text-[9px] font-mono text-white/25 shrink-0 tabular-nums">{row.count}</span>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: os.dot }} />
                  </label>
                );
              })}

              {totalRisky > 0 && (
                <p className="text-[9px] text-amber-400/70 leading-snug flex items-start gap-1">
                  <AlertTriangle size={9} className="shrink-0 mt-[1px]" />
                  {totalRisky} cluster{totalRisky === 1 ? "" : "s"} owned {`>=${BUS_FACTOR_THRESHOLD}%`} by one person.
                </p>
              )}
              <p className="text-[9px] text-white/25 leading-snug">
                Select owners to spotlight their clusters — everything else dims.
              </p>
            </>
          )}

          {enabled && !loading && rows.length === 0 && !error && (
            <p className="text-[10px] text-white/30 italic">
              No blame data — the repo may have no git history.
            </p>
          )}
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
        <Users size={11} />
        <span className="text-[10px] font-semibold">Ownership</span>
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
