"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Layers, ChevronRight, X, Pencil, Info, Plus, Minus, AlertTriangle } from "lucide-react";
import { getDomainStyle, formatDomainLabel } from "./domainStyles";
import { getOwnerStyle, initialsOf, BUS_FACTOR_THRESHOLD } from "./ownershipStyles";

interface ClusterGroupData {
  label:           string;
  summary:         string;
  fileCount:       number;
  colorBg:         string;
  colorBorder:     string;
  clusterId:       string;
  isBackground?:   boolean;
  isMerged?:       boolean;
  mergedCount?:    number;
  onUnmerge?:      (mergeId: string) => void;
  isMultiSelected?: boolean;
  hideName?:       boolean;
  domain?:           string | null;
  domainType?:       string;
  domainConfidence?: number | null;
  domainEvidence?:   string[];
  /** True when a domain spotlight filter is active and this cluster doesn't match. */
  dimmed?:         boolean;
  /** ADMIN/OWNER only — enables double-click-to-rename on the title label. */
  canEditTitle?:   boolean;
  onSaveTitle?:    (clusterId: string, title: string) => void;
  /** Opens the summary detail panel. Omitted for synthetic (merged) clusters. */
  onOpenSummary?:  (clusterId: string) => void;
  /** Set when a commit diff overlay is active — aggregate change counts for this cluster's files. */
  diffCounts?: { added: number; modified: number; deleted: number } | null;
  /** Set when the ownership panel is enabled — git-blame-derived owner of this cluster's files. */
  ownerName?:       string | null;
  ownerPercentage?: number;
  ownerCount?:      number;
  [key: string]: unknown;
}

const DIFF_BORDER_COLORS = {
  added:    "rgba(52,211,153,0.85)",
  modified: "rgba(251,191,36,0.85)",
  deleted:  "rgba(248,113,113,0.85)",
} as const;

function dominantDiffColor(counts: { added: number; modified: number; deleted: number }): string | null {
  const { added, modified, deleted } = counts;
  if (added + modified + deleted === 0) return null;
  if (added >= modified && added >= deleted) return DIFF_BORDER_COLORS.added;
  if (modified >= deleted) return DIFF_BORDER_COLORS.modified;
  return DIFF_BORDER_COLORS.deleted;
}

// Small colored chip naming the cluster's detected domain; tooltip carries
// confidence + evidence. Emergent domains get a dashed border to signal
// they're open-set names, not canonical taxonomy hits.
function DomainBadge({ d }: { d: ClusterGroupData }) {
  if (!d.domain || d.domainType === "UNCLASSIFIED") return null;
  const ds = getDomainStyle(d.domain);
  const pct = d.domainConfidence != null ? `${Math.round(d.domainConfidence * 100)}%` : null;
  const tooltip = [
    `${d.domain} · ${d.domainType}${pct ? ` · ${pct} confidence` : ""}`,
    ...(d.domainEvidence ?? []),
  ].join("\n");
  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1 text-[8px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full max-w-[150px]"
      style={{
        background: ds.badgeBg,
        border:     `1px ${d.domainType === "EMERGENT" ? "dashed" : "solid"} ${ds.badgeBorder}`,
        color:      ds.badgeText,
      }}
    >
      <span className="truncate">{formatDomainLabel(d.domain)}</span>
      {pct && <span style={{ opacity: 0.55 }}>{pct}</span>}
    </span>
  );
}

// Small chip naming the git-blame-derived primary owner of a cluster's
// files. Shows a warning glyph when one person wrote almost all of it
// (BUS_FACTOR_THRESHOLD) — a bus-factor risk signal, not a value judgment.
function OwnershipBadge({ d }: { d: ClusterGroupData }) {
  if (!d.ownerName) return null;
  const os = getOwnerStyle(d.ownerName);
  const pct = Math.round(d.ownerPercentage ?? 0);
  const risky = pct >= BUS_FACTOR_THRESHOLD && (d.ownerCount ?? 1) <= 2;
  const tooltip = `${d.ownerName} · ${pct}% of blamed lines${
    d.ownerCount ? ` · ${d.ownerCount} contributor${d.ownerCount === 1 ? "" : "s"}` : ""
  }${risky ? "\nBus-factor risk — one person owns almost all of this cluster" : ""}`;
  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1 text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded-full max-w-[150px]"
      style={{ background: os.badgeBg, border: `1px solid ${os.badgeBorder}`, color: os.badgeText }}
    >
      <span
        className="flex items-center justify-center w-3 h-3 rounded-full shrink-0 text-[6px] font-bold"
        style={{ background: os.dot, color: "#0a0a12" }}
      >
        {initialsOf(d.ownerName)}
      </span>
      <span className="truncate">{d.ownerName}</span>
      <span style={{ opacity: 0.55 }}>{pct}%</span>
      {risky && <AlertTriangle size={8} color="rgba(251,191,36,0.90)" />}
    </span>
  );
}

function ClusterGroupNode({ data, selected }: NodeProps) {
  const d = data as ClusterGroupData;

  // Rename-in-place state — hooks must run unconditionally, before the
  // isBackground early return below. draft is only read while isEditing, so
  // it's seeded fresh from the live label at the moment editing starts rather
  // than kept in sync via an effect.
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(d.label);

  function commitTitle() {
    setIsEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== d.label) {
      d.onSaveTitle?.(d.clusterId, trimmed);
    } else {
      setDraft(d.label);
    }
  }

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
          <span style={{ pointerEvents: "auto" }} className="flex items-center gap-1">
            <DomainBadge d={d} />
            <OwnershipBadge d={d} />
          </span>
        </div>
      </div>
    );
  }

  // Overview node — clickable pill card
  const isSelected = selected || d.isMultiSelected;
  const diffCounts = d.diffCounts ?? null;
  const diffColor  = diffCounts ? dominantDiffColor(diffCounts) : null;
  return (
    <div
      className="relative w-full h-full rounded-2xl transition-all duration-200 cursor-pointer group"
      style={{
        opacity:      d.dimmed ? 0.15 : 1,
        background:   d.colorBg,
        border:       d.isMerged
          ? `1.5px dashed ${diffColor ?? (isSelected ? "rgba(255,255,255,0.6)" : d.colorBorder)}`
          : `1.5px solid ${diffColor ?? (isSelected ? "rgba(255,255,255,0.6)" : d.colorBorder)}`,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: diffColor
          ? `0 0 0 2px ${diffColor}, 0 8px 32px rgba(0,0,0,0.25)`
          : d.isMultiSelected
            ? `0 0 0 3px rgba(99,102,241,0.75), 0 8px 32px rgba(99,102,241,0.20)`
            : isSelected
              ? `0 0 0 3px ${d.colorBorder}, 0 8px 32px rgba(0,0,0,0.30)`
              : `0 2px 16px rgba(0,0,0,0.18)`,
      }}
    >
      <Handle type="target" position={Position.Top}    style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {/* Multi-select indicator */}
      {d.isMultiSelected && (
        <div className="absolute top-2 left-2 z-10 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: "rgba(99,102,241,0.90)", border: "1.5px solid rgba(165,180,252,0.6)" }}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Unmerge button — only for merged clusters */}
      {d.isMerged && d.onUnmerge && (
        <button
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center w-4 h-4 rounded-full bg-white/10 hover:bg-red-500/50"
          title="Unmerge"
          onClick={(e) => { e.stopPropagation(); (d.onUnmerge as (id: string) => void)(d.clusterId); }}
        >
          <X size={8} color="#fff" />
        </button>
      )}

      {/* Icon + title */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none select-none">
        {/* Stacked layers for merged clusters */}
        {d.isMerged ? (
          <div className="relative w-6 h-6 shrink-0">
            <div
              className="absolute top-1 left-1 flex items-center justify-center w-5 h-5 rounded-md opacity-50"
              style={{ background: d.colorBorder }}
            >
              <Layers size={10} color="#fff" />
            </div>
            <div
              className="absolute top-0 left-0 flex items-center justify-center w-5 h-5 rounded-md"
              style={{ background: d.colorBorder }}
            >
              <Layers size={10} color="#fff" />
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-center w-6 h-6 rounded-md shrink-0"
            style={{ background: d.colorBorder }}
          >
            <Layers size={12} color="#fff" />
          </div>
        )}
        {!d.hideName && (
          <div className="min-w-0">
            {isEditing ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitTitle(); }
                  if (e.key === "Escape") { setDraft(d.label); setIsEditing(false); }
                }}
                className="text-[11px] font-semibold leading-tight bg-transparent outline-none border-b truncate max-w-[150px]"
                style={{
                  color: d.colorBorder.replace("0.50", "0.95"),
                  borderColor: d.colorBorder,
                  pointerEvents: "auto",
                }}
              />
            ) : (
              <span className="flex items-center gap-1">
                <p
                  className="text-[11px] font-semibold leading-tight truncate max-w-[150px]"
                  style={{
                    color: d.colorBorder.replace("0.50", "0.95"),
                    ...(d.canEditTitle ? { pointerEvents: "auto", cursor: "text" } : {}),
                  }}
                  title={d.canEditTitle ? "Double-click to rename" : undefined}
                  onClick={d.canEditTitle ? (e) => e.stopPropagation() : undefined}
                  onDoubleClick={d.canEditTitle ? (e) => { e.stopPropagation(); setDraft(d.label); setIsEditing(true); } : undefined}
                >
                  {d.label}
                </p>
                {/* Visible-on-hover rename affordance — makes the edit permission
                    obvious instead of relying on a hidden double-click gesture. */}
                {d.canEditTitle && (
                  <button
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    style={{ pointerEvents: "auto", color: d.colorBorder.replace("0.50", "0.75") }}
                    title="Rename cluster"
                    onClick={(e) => { e.stopPropagation(); setDraft(d.label); setIsEditing(true); }}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <Pencil size={9} />
                  </button>
                )}
                {d.onOpenSummary && (
                  <button
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    style={{ pointerEvents: "auto", color: d.colorBorder.replace("0.50", "0.75") }}
                    title="View cluster summary"
                    onClick={(e) => { e.stopPropagation(); d.onOpenSummary?.(d.clusterId); }}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <Info size={9} />
                  </button>
                )}
              </span>
            )}
            <p className="text-[9px] text-white/35 mt-0.5 truncate max-w-[150px]">
              {d.isMerged ? `${d.mergedCount ?? "?"} merged clusters` : `${d.fileCount} files`}
            </p>
          </div>
        )}
        {d.hideName && (
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
            style={{
              background: d.colorBorder.replace("0.50", "0.12"),
              color:      d.colorBorder.replace("0.50", "0.70"),
            }}
          >
            {d.fileCount} files
          </span>
        )}
      </div>

      {/* Domain + ownership badges, diff counts */}
      <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 select-none">
        <DomainBadge d={d} />
        <OwnershipBadge d={d} />
        {diffCounts && (diffCounts.added + diffCounts.modified + diffCounts.deleted > 0) && (
          <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.30)", color: "rgba(255,255,255,0.75)" }}>
            {diffCounts.added > 0 && (
              <span className="flex items-center gap-0.5 text-emerald-400"><Plus size={7} />{diffCounts.added}</span>
            )}
            {diffCounts.modified > 0 && (
              <span className="text-amber-400">~{diffCounts.modified}</span>
            )}
            {diffCounts.deleted > 0 && (
              <span className="flex items-center gap-0.5 text-red-400"><Minus size={7} />{diffCounts.deleted}</span>
            )}
          </span>
        )}
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
