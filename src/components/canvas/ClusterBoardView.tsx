"use client";

import { memo, useState, useMemo } from "react";
import {
  Search, Layers, FileCode, Crown, ArrowRight,
  ChevronRight, MoreHorizontal, Filter, Plus, Minus,
} from "lucide-react";
import type { BlueprintCluster, DiffStatus } from "@/types/project/project.schema";
import { CLUSTER_COLORS, type ClusterIndex } from "./useD3Layout";

interface ClusterBoardViewProps {
  clusters: BlueprintCluster[];
  index: ClusterIndex;
  colorOffset: number;
  diffOverlay: Map<string, DiffStatus> | null;
  onSelect: (clusterId: string, hasChildren: boolean, label: string) => void;
}

interface CardDiff {
  added: number;
  modified: number;
  deleted: number;
  hasChanges: boolean;
  dominantBorder: string | null;
}

function computeCardDiff(
  clusterId: string,
  index: ClusterIndex,
  diffOverlay: Map<string, DiffStatus> | null,
): CardDiff {
  if (!diffOverlay || diffOverlay.size === 0) {
    return { added: 0, modified: 0, deleted: 0, hasChanges: false, dominantBorder: null };
  }
  const members = index.nodesOf.get(clusterId) ?? [];
  let added = 0, modified = 0, deleted = 0;
  for (const m of members) {
    const s = diffOverlay.get(m.canonical_path);
    if (s === "added") added++;
    else if (s === "modified" || s === "moved") modified++;
    else if (s === "deleted") deleted++;
  }
  const hasChanges = added + modified + deleted > 0;
  let dominantBorder: string | null = null;
  if (hasChanges) {
    if (added >= modified && added >= deleted) dominantBorder = "rgba(16,185,129,0.75)";
    else if (modified >= deleted)              dominantBorder = "rgba(245,158,11,0.75)";
    else                                       dominantBorder = "rgba(239,68,68,0.75)";
  }
  return { added, modified, deleted, hasChanges, dominantBorder };
}

function getRepresentativeFiles(clusterId: string, index: ClusterIndex): string[] {
  const members = index.nodesOf.get(clusterId) ?? [];
  const sorted = [...members].sort((a, b) => {
    if (a.execution_role === "ENTRY_POINT" && b.execution_role !== "ENTRY_POINT") return -1;
    if (b.execution_role === "ENTRY_POINT" && a.execution_role !== "ENTRY_POINT") return 1;
    return b.centrality_score - a.centrality_score;
  });
  return sorted.slice(0, 3).map((n) => {
    const parts = n.canonical_path.split("/");
    return parts[parts.length - 1] ?? n.canonical_path;
  });
}

// ---------------------------------------------------------------------------
// Single card
// ---------------------------------------------------------------------------
function ClusterCard({
  cluster, colorIndex, index, diff, hasDiffActive, onSelect,
}: {
  cluster: BlueprintCluster;
  colorIndex: number;
  index: ClusterIndex;
  diff: CardDiff;
  hasDiffActive: boolean;
  onSelect: (clusterId: string, hasChildren: boolean, label: string) => void;
}) {
  const color      = CLUSTER_COLORS[colorIndex % CLUSTER_COLORS.length];
  const label      = cluster.suggested_title ?? cluster.name ?? cluster.id;
  const fileCount  = index.descendantCount.get(cluster.id) ?? 0;
  const members    = index.nodesOf.get(cluster.id) ?? [];
  const children   = index.childrenOf.get(cluster.id) ?? [];
  const hasChildren     = children.length > 0;
  const godFileCount    = members.filter((n) => n.is_god_file).length;
  const entryPointCount = members.filter((n) => n.execution_role === "ENTRY_POINT").length;
  const repFiles        = hasChildren ? [] : getRepresentativeFiles(cluster.id, index);

  const dimmed          = hasDiffActive && !diff.hasChanges;
  const activeBorder    = diff.dominantBorder ?? color.border;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(cluster.id, hasChildren, label)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(cluster.id, hasChildren, label)}
      className="relative flex flex-col gap-2 p-4 rounded-2xl cursor-pointer transition-all duration-150 hover:scale-[1.01] group select-none"
      style={{
        background:   color.bg,
        border:       `1.5px solid ${diff.hasChanges ? activeBorder : color.border}`,
        borderTop:    diff.hasChanges ? `3px solid ${activeBorder}` : `1.5px solid ${color.border}`,
        boxShadow:    diff.hasChanges
          ? `0 0 0 1px ${activeBorder}, 0 4px 20px rgba(0,0,0,0.25)`
          : "0 2px 12px rgba(0,0,0,0.15)",
        opacity: dimmed ? 0.35 : 1,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: color.border }}
          >
            <Layers size={10} color="#fff" />
          </div>
          <span
            className="text-[12px] font-semibold truncate"
            style={{ color: color.border.replace("0.50", "0.95") }}
          >
            {label}
          </span>
        </div>
        <button
          disabled
          title="Coming soon: rename, merge, move files"
          className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity p-0.5 rounded"
          style={{ color: "rgba(255,255,255,0.5)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={13} />
        </button>
      </div>

      {/* Summary */}
      {cluster.functional_summary ? (
        <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: "rgba(255,255,255,0.55)" }}>
          {cluster.functional_summary}
        </p>
      ) : (
        <p className="text-[11px] italic" style={{ color: "rgba(255,255,255,0.22)" }}>
          No summary available
        </p>
      )}

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
          style={{
            background: color.border.replace("0.50", "0.12"),
            color:      color.border.replace("0.50", "0.80"),
          }}
        >
          <FileCode size={8} />
          {fileCount} {hasChildren ? "files total" : "files"}
        </span>
        {hasChildren && (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(99,102,241,0.12)", color: "rgba(165,180,252,0.8)" }}>
            <Layers size={8} />{children.length} sub-clusters
          </span>
        )}
        {godFileCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
            <Crown size={8} />{godFileCount} god {godFileCount === 1 ? "file" : "files"}
          </span>
        )}
        {entryPointCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
            <ArrowRight size={8} />{entryPointCount} {entryPointCount === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {/* Representative files */}
      {repFiles.length > 0 && (
        <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.28)" }}>
          {repFiles.join(" · ")}
        </p>
      )}

      {/* Footer: diff counts + drill hint */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-2">
          {diff.added > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-mono text-emerald-400">
              <Plus size={9} />{diff.added}
            </span>
          )}
          {diff.modified > 0 && (
            <span className="text-[10px] font-mono text-amber-400">~{diff.modified}</span>
          )}
          {diff.deleted > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-mono text-red-400">
              <Minus size={9} />{diff.deleted}
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-70 transition-opacity"
          style={{ color: color.border.replace("0.50", "0.80") }}
        >
          <span className="text-[9px]">{hasChildren ? "explore" : "open files"}</span>
          <ChevronRight size={9} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board container
// ---------------------------------------------------------------------------
function ClusterBoardView({ clusters, index, colorOffset, diffOverlay, onSelect }: ClusterBoardViewProps) {
  const [search, setSearch]               = useState("");
  const [showChangedOnly, setShowChangedOnly] = useState(false);

  const hasDiffActive = diffOverlay !== null && diffOverlay.size > 0;

  const diffs = useMemo(
    () => new Map(clusters.map((c) => [c.id, computeCardDiff(c.id, index, diffOverlay)])),
    [clusters, index, diffOverlay],
  );

  const filtered = useMemo(() => {
    let result = clusters;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const title   = (c.suggested_title ?? c.name ?? c.id).toLowerCase();
        const summary = (c.functional_summary ?? "").toLowerCase();
        return title.includes(q) || summary.includes(q);
      });
    }
    if (showChangedOnly && hasDiffActive) {
      result = result.filter((c) => diffs.get(c.id)?.hasChanges);
    }
    if (hasDiffActive) {
      result = [...result].sort((a, b) => {
        const aC = diffs.get(a.id)?.hasChanges ? 1 : 0;
        const bC = diffs.get(b.id)?.hasChanges ? 1 : 0;
        if (aC !== bC) return bC - aC;
        return (a.suggested_title ?? a.name ?? a.id)
          .localeCompare(b.suggested_title ?? b.name ?? b.id);
      });
    }
    return result;
  }, [clusters, search, showChangedOnly, hasDiffActive, diffs]);

  const changedCount = useMemo(
    () => (hasDiffActive ? clusters.filter((c) => diffs.get(c.id)?.hasChanges).length : 0),
    [clusters, hasDiffActive, diffs],
  );

  return (
    <div
      className="flex flex-col w-full h-full overflow-y-auto"
      style={{ background: "#080810", padding: "0 24px 24px" }}
    >
      {/* Sticky toolbar */}
      <div
        className="sticky top-0 z-10 flex items-center gap-2 py-3"
        style={{ background: "rgba(8,8,16,0.97)", backdropFilter: "blur(12px)" }}
      >
        <div className="relative flex-1">
          <Search
            size={12}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "rgba(255,255,255,0.3)" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clusters by name or description…"
            className="w-full pl-8 pr-3 py-2 rounded-xl text-[12px] outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.8)",
            }}
          />
        </div>

        {hasDiffActive && (
          <button
            onClick={() => setShowChangedOnly((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium transition-all flex-shrink-0"
            style={{
              background: showChangedOnly ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${showChangedOnly ? "rgba(245,158,11,0.40)" : "rgba(255,255,255,0.08)"}`,
              color: showChangedOnly ? "rgba(253,186,116,0.9)" : "rgba(255,255,255,0.45)",
            }}
          >
            <Filter size={10} />
            Changed only
            {changedCount > 0 && (
              <span
                className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono"
                style={{ background: "rgba(245,158,11,0.20)", color: "rgba(253,186,116,0.9)" }}
              >
                {changedCount}
              </span>
            )}
          </button>
        )}

        <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
          {filtered.length} / {clusters.length}
        </span>
      </div>

      {/* Card grid */}
      {filtered.length > 0 ? (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
        >
          {filtered.map((cluster) => {
            const globalIdx  = clusters.indexOf(cluster);
            const colorIndex = ((globalIdx + colorOffset) % CLUSTER_COLORS.length + CLUSTER_COLORS.length) % CLUSTER_COLORS.length;
            return (
              <ClusterCard
                key={cluster.id}
                cluster={cluster}
                colorIndex={colorIndex}
                index={index}
                diff={diffs.get(cluster.id)!}
                hasDiffActive={hasDiffActive}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Search size={24} style={{ color: "rgba(255,255,255,0.12)" }} />
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            No clusters match your search
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(ClusterBoardView);
