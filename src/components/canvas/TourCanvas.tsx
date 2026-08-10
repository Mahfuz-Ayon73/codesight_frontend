"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow, Background, Controls, BackgroundVariant,
  ReactFlowProvider, useReactFlow,
  type Node, type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft, ChevronRight, RotateCcw, Lock, Globe, Server, Play, Filter,
} from "lucide-react";

import type { Blueprint } from "@/types/project/project.schema";
import { useJourney, LINK_LABELS, type JourneyStep } from "./useJourney";
import { CLUSTER_COLORS, EDGE_TYPE_COLORS, INFERRED_EDGE_TYPES } from "./useD3Layout";
import TourNode, { type TourNodeData } from "./TourNode";

const NODE_TYPES = { tourNode: TourNode };

// A hop can reveal 30+ files at once. Stacking those in one column produces a
// ribbon far taller than the viewport, so each hop is laid out as a grid:
// files fill down to MAX_ROWS, then wrap into another sub-column within the
// same hop band. Bands are spaced by their own width so they never overlap.
// One card per cluster per hop, in a single column. Wrapping files into a grid
// meant edges from the previous hop had to cross the sub-columns in front of
// their target, which is what buried the relations. Aggregating to clusters
// keeps every band to ~12 cards, so a single column stays short enough to read
// and every edge runs in the clear channel between bands.
const BAND_W  = 430;
// Height of a collapsed card. Expanding one grows its reserved slot (see
// `cardHeight`) so neighbours are pushed down rather than covered.
// CARD_H is the card's own height (not the pitch) — CARD_GAP is added on top,
// so collapsed spacing stays at the ~68px that kept bands short.
const CARD_H           = 56;
const CARD_GAP         = 12;
const FILE_ROW_H       = 15;
const FILE_LIST_PAD    = 10;
// Matches the file list's own max-height in TourNode; past this the list
// scrolls inside the card instead of growing the band without limit.
const FILE_LIST_MAX_H  = 208;

const STATE_META = {
  public:    { icon: Globe, label: "Signed out", color: "rgba(52,211,153,0.9)" },
  protected: { icon: Lock,  label: "Signed in",  color: "rgba(129,140,248,0.9)" },
} as const;

function fileName(path: string) {
  return path.split("/").pop() ?? path;
}

interface Props {
  blueprint: Blueprint;
  onExit: () => void;
  onOpenFile?: (canonicalPath: string) => void;
}

function TourCanvasInner({ blueprint, onExit, onOpenFile }: Props) {
  const entryPoints = blueprint.entry_points ?? [];
  const [rootFile, setRootFile] = useState<string | null>(null);
  const [depth, setDepth] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  // Empty means "no restriction" rather than "nothing", so the tour starts
  // showing the whole flow.
  const [selectedClusters, setSelectedClusters] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const { fitView } = useReactFlow();

  const root =
    entryPoints.find((e) => e.file === rootFile) ??
    entryPoints.find((e) => e.is_landing) ??
    entryPoints[0] ??
    null;

  const clusterColor = useMemo(() => {
    const map = new Map<string, string>();
    blueprint.clusters.forEach((c, i) => {
      map.set(c.id, CLUSTER_COLORS[i % CLUSTER_COLORS.length].border);
    });
    return map;
  }, [blueprint.clusters]);

  const clusterName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of blueprint.clusters) map.set(c.id, c.suggested_title || c.id);
    return map;
  }, [blueprint.clusters]);

  // Unfiltered walk drives the filter list, so excluding a cluster never makes
  // the clusters behind it vanish from the menu and strand the user.
  const fullJourney = useJourney(blueprint, root);
  const journey     = useJourney(blueprint, root, selectedClusters);

  const clusterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const step of fullJourney?.steps ?? []) {
      if (!step.clusterId) continue;
      counts.set(step.clusterId, (counts.get(step.clusterId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, title: clusterName.get(id) ?? id }))
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
  }, [fullJourney, clusterName]);

  const toggleCluster = (id: string) => {
    setSelectedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setDepth(0);
  };

  /**
   * Files grouped by hop distance — one band per Next click.
   */
  const byDepth = useMemo(() => {
    const groups = new Map<number, JourneyStep[]>();
    for (const step of journey?.steps ?? []) {
      const list = groups.get(step.depth) ?? [];
      list.push(step);
      groups.set(step.depth, list);
    }
    return groups;
  }, [journey]);

  const maxDepth = journey?.maxDepth ?? 0;
  const safeDepth = Math.min(depth, maxDepth);

  /** Measured height of a card, so the layout can reserve real space for it. */
  const cardHeight = useCallback((cardId: string, fileCount: number) => {
    if (!expandedCards.has(cardId)) return CARD_H;
    const listHeight = Math.min(fileCount * FILE_ROW_H, FILE_LIST_MAX_H);
    return CARD_H + listHeight + FILE_LIST_PAD;
  }, [expandedCards]);

  /**
   * One card per (hop, cluster), positioned in a single column per hop.
   *
   * Cards are ordered by the average height of the cards that fed them
   * (barycenter ordering). Sorting by size instead looked reasonable but left
   * edges raking across the band — on the A2E backend that ordering produced
   * 71 edge crossings against 10 for this one, which is the difference between
   * relations you can follow and the tangle you were seeing.
   */
  const bands = useMemo(() => {
    const result: Array<Array<{
      id: string; clusterId: string; steps: JourneyStep[]; x: number; y: number;
    }>> = [];
    const cardOf = new Map<string, string>();
    const yOf = new Map<string, number>();

    for (let d = 0; d <= maxDepth; d += 1) {
      const groups = new Map<string, JourneyStep[]>();
      for (const step of byDepth.get(d) ?? []) {
        const key = step.clusterId ?? "__none__";
        const list = groups.get(key) ?? [];
        list.push(step);
        groups.set(key, list);
      }

      const barycenter = (steps: JourneyStep[]) => {
        const ys = steps
          .map((s) => (s.via ? cardOf.get(s.via) : undefined))
          .filter((id): id is string => !!id)
          .map((id) => yOf.get(id) ?? 0);
        return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0;
      };

      const ordered = [...groups.entries()]
        .map(([clusterId, steps]) => ({
          clusterId,
          steps,
          bary: barycenter(steps),
          height: cardHeight(`${d}::${clusterId}`, steps.length),
        }))
        .sort((a, b) => a.bary - b.bary || a.clusterId.localeCompare(b.clusterId));

      // Cards are stacked by their real height so an expanded one pushes its
      // neighbours down instead of covering them. The band is then centred on
      // the flow axis using its total height.
      const total = ordered.reduce((sum, e) => sum + e.height, 0)
        + Math.max(0, ordered.length - 1) * CARD_GAP;
      let cursorY = -total / 2;

      result[d] = ordered.map((entry) => {
        const id = `${d}::${entry.clusterId}`;
        const y = cursorY;
        cursorY += entry.height + CARD_GAP;
        // Anchor ordering on the card's centre, so a tall expanded card does
        // not drag the next band's barycenter toward its top edge.
        yOf.set(id, y + entry.height / 2);
        for (const s of entry.steps) cardOf.set(s.file, id);
        return { id, clusterId: entry.clusterId, steps: entry.steps, x: d * BAND_W, y };
      });
    }
    return { result, cardOf };
  }, [byDepth, maxDepth, cardHeight]);

  const cardOfFile = bands.cardOf;

  const { nodes, edges, revealedCount, newCount } = useMemo(() => {
    if (!journey) return { nodes: [], edges: [], revealedCount: 0, newCount: 0 };

    const flowNodes: Node<TourNodeData>[] = [];
    for (let d = 0; d <= safeDepth; d += 1) {
      const band = bands.result[d] ?? [];
      band.forEach((card) => {
        const color = clusterColor.get(card.clusterId) ?? "#818cf8";
        flowNodes.push({
          id: card.id,
          type: "tourNode",
          position: { x: card.x, y: card.y },
          data: {
            title:  clusterName.get(card.clusterId) ?? card.clusterId,
            color,
            domain: card.steps.find((s) => s.domain)?.domain ?? null,
            files:  card.steps.map((s) => ({
              name: fileName(s.file), path: s.file, via: s.via, linkType: s.linkType,
            })),
            isNew:   d === safeDepth && safeDepth > 0,
            isRoot:  d === 0,
            expanded: expandedCards.has(card.id),
            onToggle: () => setExpandedCards((prev) => {
              const next = new Set(prev);
              if (next.has(card.id)) next.delete(card.id); else next.add(card.id);
              return next;
            }),
            onOpenFile: (path: string) => onOpenFile?.(path),
          },
        });
      });
    }

    // File-level links collapsed onto their cards. Only edges whose target has
    // already been revealed are drawn, so nothing runs ahead of the flow.
    const agg = new Map<string, { source: string; target: string; type: string;
                                  count: number; isNew: boolean; label: string | null }>();
    for (const step of journey.steps) {
      if (step.depth > safeDepth || !step.via) continue;
      const source = cardOfFile.get(step.via);
      const target = cardOfFile.get(step.file);
      if (!source || !target || source === target) continue;
      const type = step.linkType ?? "BELONGS_TO_DOMAIN";
      const key = `${source}->${target}::${type}`;
      const existing = agg.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        agg.set(key, {
          source, target, type, count: 1,
          isNew: step.depth === safeDepth && safeDepth > 0,
          label: step.linkLabel,
        });
      }
    }

    const flowEdges: Edge[] = [...agg.entries()].map(([id, e]) => {
      const inferred = INFERRED_EDGE_TYPES.has(e.type);
      const color =
        EDGE_TYPE_COLORS[e.type as keyof typeof EDGE_TYPE_COLORS] ?? "rgba(99,102,241,0.75)";
      return {
        id,
        source: e.source,
        target: e.target,
        // Bezier: right-angled routing cut straight through neighbouring
        // cards, while a curve reads as a fan between bands.
        type: "default",
        animated: e.isNew,
        // Edges render beneath nodes by default, which is what buried them.
        zIndex: e.isNew ? 1200 : 0,
        style: {
          stroke: color,
          strokeWidth: e.isNew ? Math.min(1.6 + e.count * 0.35, 4) : 1,
          opacity: e.isNew ? 1 : 0.13,
          ...(inferred ? { strokeDasharray: "6 4" } : {}),
        },
        markerEnd: { type: "arrowclosed" as const, width: 14, height: 14, color },
        label: e.isNew ? (e.label ?? (e.count > 1 ? `${e.count} files` : undefined)) : undefined,
        labelStyle: { fill: "#c7d2fe", fontSize: 9, fontFamily: "monospace" },
        labelBgStyle: { fill: "rgba(8,12,26,0.95)" },
      };
    });

    return {
      nodes: flowNodes,
      edges: flowEdges,
      revealedCount: journey.steps.filter((s) => s.depth <= safeDepth).length,
      newCount: (byDepth.get(safeDepth) ?? []).length,
    };
  }, [journey, safeDepth, byDepth, bands, cardOfFile, expandedCards,
      clusterColor, clusterName, onOpenFile]);

  const step = (next: number) => {
    setDepth(Math.max(0, Math.min(next, maxDepth)));
    setTimeout(() => fitView({ padding: 0.15, duration: 500 }), 60);
  };

  const pickRoot = (file: string) => {
    setRootFile(file);
    setDepth(0);
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 60);
  };

  const landings = entryPoints.filter((e) => e.is_landing);
  const atEnd = safeDepth >= maxDepth;

  return (
    <div className="w-full h-full relative bg-[#08080f]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        minZoom={0.08}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        onNodeClick={(_e, node) => onOpenFile?.(node.id)}
      >
        <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="rgba(255,255,255,0.04)" />
        <Controls className="bg-zinc-900/80! border-white/10! rounded-xl!" style={{ backdropFilter: "blur(8px)" }} />
      </ReactFlow>

      {/* Header — where we started and which auth state this flow is */}
      <div className="absolute top-3 left-3 right-3 flex items-start gap-2 pointer-events-none">
        <button
          onClick={onExit}
          className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-colors hover:bg-white/10"
          style={{ background: "rgba(8,8,16,0.9)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.6)" }}
        >
          <ArrowLeft size={11} /> Back to graph
        </button>

        {landings.length > 0 && (
          <div className="pointer-events-auto flex gap-1.5">
            {landings.map((entry) => {
              const meta = STATE_META[entry.auth_state];
              const Icon = entry.kind === "server" ? Server : meta.icon;
              const active = root?.file === entry.file;
              return (
                <button
                  key={entry.file}
                  onClick={() => pickRoot(entry.file)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-colors"
                  style={{
                    background: active ? "rgba(99,102,241,0.2)" : "rgba(8,8,16,0.9)",
                    border: `1px solid ${active ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.09)"}`,
                    color: active ? "rgba(199,210,254,0.95)" : "rgba(255,255,255,0.45)",
                  }}
                >
                  <Icon size={11} style={{ color: active ? undefined : meta.color }} />
                  {entry.kind === "server" ? "Server start" : meta.label}
                  <span className="font-mono text-white/35">{entry.url ?? ""}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cluster filter — restrict which modules the flow may enter */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10">
        <button
          onClick={() => setFilterOpen((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-colors"
          style={{
            background: filterOpen || selectedClusters.size > 0
              ? "rgba(99,102,241,0.2)" : "rgba(8,8,16,0.9)",
            border: `1px solid ${filterOpen || selectedClusters.size > 0
              ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.09)"}`,
            color: filterOpen || selectedClusters.size > 0
              ? "rgba(199,210,254,0.95)" : "rgba(255,255,255,0.45)",
          }}
        >
          <Filter size={10} />
          {selectedClusters.size > 0 ? `${selectedClusters.size} module(s)` : "All modules"}
        </button>

        {filterOpen && (
          <div
            className="rounded-xl px-3 py-2.5 flex flex-col gap-1.5 w-[250px] overflow-y-auto"
            style={{
              background: "rgba(8,8,16,0.95)",
              border: "1px solid rgba(255,255,255,0.09)",
              backdropFilter: "blur(14px)",
              maxHeight: "min(56vh, 460px)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[8px] uppercase tracking-widest text-white/35">
                Walk only these modules
              </span>
              {selectedClusters.size > 0 && (
                <button
                  onClick={() => { setSelectedClusters(new Set()); setDepth(0); }}
                  className="text-[9px] text-indigo-400/80 hover:text-indigo-300"
                >
                  clear
                </button>
              )}
            </div>
            <p className="text-[8px] text-white/25 leading-snug">
              The flow stops at anything unselected, so later modules only
              appear if they are reachable through the ones you pick.
            </p>
            {clusterOptions.map((opt) => {
              const on = selectedClusters.has(opt.id);
              return (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                  <span
                    onClick={() => toggleCluster(opt.id)}
                    className="w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-all"
                    style={{
                      background:  on ? (clusterColor.get(opt.id) ?? "rgba(99,102,241,0.85)") : "transparent",
                      borderColor: clusterColor.get(opt.id) ?? "rgba(99,102,241,0.85)",
                    }}
                  >
                    {on && (
                      <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                        <path d="M1 2.5L2.8 4.2L6 1" stroke="white" strokeWidth="1.4"
                              strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span
                    onClick={() => toggleCluster(opt.id)}
                    className="text-[10px] text-white/55 group-hover:text-white/80 transition-colors flex-1 truncate"
                  >
                    {opt.title}
                  </span>
                  <span className="text-[9px] font-mono text-white/25">{opt.count}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Stepper */}
      {journey && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-3 py-2 rounded-2xl"
          style={{ background: "rgba(8,8,16,0.94)", border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(14px)" }}
        >
          <button
            onClick={() => step(safeDepth - 1)}
            disabled={safeDepth === 0}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-20 hover:bg-white/10"
          >
            <ChevronRight size={13} className="text-white/60 rotate-180" />
          </button>

          <div className="flex flex-col items-center min-w-[190px]">
            <span className="text-[10px] font-semibold text-white/80">
              {safeDepth === 0
                ? `Start · ${fileName(journey.steps[0]?.file ?? "")}`
                : `Hop ${safeDepth} of ${maxDepth} · +${newCount} file(s)`}
            </span>
            <span className="text-[9px] text-white/35">
              {revealedCount} of {journey.steps.length} files revealed
            </span>
          </div>

          <button
            onClick={() => step(safeDepth + 1)}
            disabled={atEnd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-25"
            style={{
              background: atEnd ? "rgba(255,255,255,0.05)" : "rgba(99,102,241,0.85)",
              color: atEnd ? "rgba(255,255,255,0.4)" : "#fff",
            }}
          >
            {safeDepth === 0 ? <Play size={11} /> : null}
            {atEnd ? "End of flow" : "Next"}
          </button>

          <button
            onClick={() => step(0)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            title="Restart"
          >
            <RotateCcw size={12} className="text-white/45" />
          </button>
        </div>
      )}

      {/* What just happened, in words */}
      {journey && safeDepth > 0 && (
        <div
          className="absolute bottom-4 right-4 max-w-[260px] px-3 py-2 rounded-xl flex flex-col gap-1"
          style={{ background: "rgba(8,8,16,0.92)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <span className="text-[8px] uppercase tracking-widest text-indigo-300/70">
            This hop
          </span>
          {(byDepth.get(safeDepth) ?? []).slice(0, 5).map((s) => (
            <span key={s.file} className="text-[9px] font-mono text-white/55 truncate">
              {fileName(s.file)}
              <span className="text-white/25">
                {" "}{LINK_LABELS[s.linkType ?? ""] ?? "from"} ← {fileName(s.via ?? "")}
              </span>
            </span>
          ))}
          {(byDepth.get(safeDepth)?.length ?? 0) > 5 && (
            <span className="text-[9px] text-white/25">
              +{(byDepth.get(safeDepth)?.length ?? 0) - 5} more
            </span>
          )}
        </div>
      )}

      {entryPoints.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-[11px] text-white/35 max-w-xs text-center">
            No entry points found for this analysis. Re-analyze the project, or
            it may be a library with no screen a user lands on.
          </p>
        </div>
      )}
    </div>
  );
}

export default function TourCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <TourCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
