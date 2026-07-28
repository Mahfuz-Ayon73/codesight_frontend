"use client";

import { useMemo, useState } from "react";
import { Tag, X } from "lucide-react";
import type { BlueprintCluster } from "@/types/project/project.schema";
import {
  clusterDomainKey, formatDomainLabel, getDomainStyle, UNCLASSIFIED_DOMAIN_KEY,
} from "./domainStyles";

interface Props {
  /** Clusters at the current level (post-merge). */
  clusters:              BlueprintCluster[];
  /** Selected domain keys — empty set means "show everything". */
  selected:              Set<string>;
  onSelectedChange:      (next: Set<string>) => void;
  colorByDomain:         boolean;
  onColorByDomainChange: (v: boolean) => void;
}

interface DomainRow {
  key:   string;
  label: string;
  type:  string;
  count: number;
}

const TYPE_RANK: Record<string, number> = {
  CANONICAL: 0, EMERGENT: 0, INFRASTRUCTURE: 1, UNCLASSIFIED: 2,
};

export default function DomainFilterPanel({
  clusters, selected, onSelectedChange, colorByDomain, onColorByDomainChange,
}: Props) {
  const [open, setOpen] = useState(false);

  const rows = useMemo<DomainRow[]>(() => {
    const acc = new Map<string, DomainRow>();
    for (const c of clusters) {
      const key = clusterDomainKey(c);
      const type = key === UNCLASSIFIED_DOMAIN_KEY ? "UNCLASSIFIED" : (c.domain_type ?? "UNCLASSIFIED");
      const row = acc.get(key) ?? {
        key,
        label: key === UNCLASSIFIED_DOMAIN_KEY ? "Unclassified" : formatDomainLabel(key),
        type,
        count: 0,
      };
      row.count += 1;
      acc.set(key, row);
    }
    return [...acc.values()].sort((a, b) =>
      (TYPE_RANK[a.type] ?? 2) - (TYPE_RANK[b.type] ?? 2) ||
      b.count - a.count ||
      a.label.localeCompare(b.label)
    );
  }, [clusters]);

  const toggleDomain = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    onSelectedChange(next);
  };

  const nonDefaultCount = selected.size + (colorByDomain ? 1 : 0);

  const panelStyle = {
    background:     "rgba(8,8,16,0.92)",
    border:         "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(14px)",
  } as const;

  const checkmark = (
    <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
      <path d="M1 2.5L2.8 4.2L6 1" stroke="white" strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div className="flex flex-col items-end gap-1.5">
      {open && (
        <div className="rounded-xl px-3 py-2.5 flex flex-col gap-2 min-w-[184px] max-h-64 overflow-y-auto" style={panelStyle}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold text-white/40 uppercase tracking-widest">
              Domains
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

          {/* Color-by-domain toggle */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <span
              onClick={() => onColorByDomainChange(!colorByDomain)}
              className="w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-all"
              style={{
                background:  colorByDomain ? "rgba(99,102,241,0.85)" : "transparent",
                borderColor: "rgba(99,102,241,0.85)",
              }}
            >
              {colorByDomain && checkmark}
            </span>
            <span className="text-[10px] font-mono text-white/50 group-hover:text-white/75 transition-colors flex-1">
              Color by domain
            </span>
          </label>

          <div className="h-px bg-white/[0.06]" />

          {/* Domain rows */}
          {rows.length === 0 ? (
            <p className="text-[10px] text-white/30 italic">
              No domains detected — re-analyze the project to classify clusters.
            </p>
          ) : (
            rows.map((row) => {
              const ds = getDomainStyle(row.key === UNCLASSIFIED_DOMAIN_KEY ? null : row.key);
              const checked = selected.has(row.key);
              return (
                <label key={row.key} className="flex items-center gap-2 cursor-pointer group">
                  <span
                    onClick={() => toggleDomain(row.key)}
                    className="w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-all"
                    style={{ background: checked ? ds.dot : "transparent", borderColor: ds.dot }}
                  >
                    {checked && checkmark}
                  </span>
                  <span
                    className="text-[10px] font-mono text-white/50 group-hover:text-white/75 transition-colors flex-1 truncate max-w-[110px]"
                    title={row.type === "EMERGENT" ? `${row.label} (emergent)` : row.label}
                  >
                    {row.label}
                  </span>
                  <span className="text-[9px] font-mono text-white/25 shrink-0 tabular-nums">{row.count}</span>
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: ds.dot,
                      // Emergent domains render as a ring — mirrors the dashed badge.
                      ...(row.type === "EMERGENT" ? { background: "transparent", border: `1.5px solid ${ds.dot}` } : {}),
                    }}
                  />
                </label>
              );
            })
          )}

          {rows.length > 0 && (
            <p className="text-[9px] text-white/25 leading-snug">
              Select domains to spotlight them — everything else dims.
            </p>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all"
        style={{
          background:     open ? "rgba(99,102,241,0.22)" : "rgba(8,8,16,0.88)",
          border:         `1px solid ${open ? "rgba(99,102,241,0.50)" : "rgba(255,255,255,0.08)"}`,
          backdropFilter: "blur(14px)",
          color:          open ? "rgba(99,102,241,0.90)" : "rgba(255,255,255,0.50)",
        }}
      >
        <Tag size={11} />
        <span className="text-[10px] font-semibold">Domains</span>
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
