"use client";

import { useEffect, useRef, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import * as d3 from "d3";
import type { Blueprint } from "@/types/project/project.schema";

export interface LayoutResult {
  /** Cluster-level (overview) nodes — one per cluster */
  overviewNodes: Node[];
  /** Inter-cluster edges for overview */
  overviewEdges: Edge[];
  /**
   * Per-cluster detail layout.
   * Key = cluster_id, value = { nodes, edges } ready to render in drill-down mode.
   * Pre-computed so switching clusters is instant with no layout delay.
   * Execution flows will be added here in a future pass.
   */
  clusterDetails: Map<string, { nodes: Node[]; edges: Edge[] }>;
  ready: boolean;
}

export const CLUSTER_COLORS = [
  { bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.50)"  }, // indigo
  { bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.50)"  }, // emerald
  { bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.50)"  }, // amber
  { bg: "rgba(236,72,153,0.10)",  border: "rgba(236,72,153,0.50)"  }, // pink
  { bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.50)"  }, // blue
  { bg: "rgba(168,85,247,0.10)",  border: "rgba(168,85,247,0.50)"  }, // purple
  { bg: "rgba(20,184,166,0.10)",  border: "rgba(20,184,166,0.50)"  }, // teal
  { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.50)"   }, // red
];

// Overview cluster node dimensions — fixed pill cards
const OV_NODE_W = 260;
const OV_NODE_H = 100;
const OV_GAP    = 120;

// Detail layout constants
const FILE_NODE_W   = 224;
const FILE_NODE_H   = 76;
const DETAIL_PAD    = 60;
const DETAIL_SPACING = 20;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function useD3Layout(blueprint: Blueprint | null): LayoutResult {
  const [result, setResult] = useState<LayoutResult>({
    overviewNodes: [],
    overviewEdges: [],
    clusterDetails: new Map(),
    ready: false,
  });
  const computedRef = useRef(false);

  useEffect(() => {
    if (!blueprint || computedRef.current) return;
    computedRef.current = true;

    Promise.resolve().then(() => {
      setResult({ ...compute(blueprint), ready: true });
    });
  }, [blueprint]);

  return result;
}

function compute(blueprint: Blueprint): Omit<LayoutResult, "ready"> {
  const bpNodeMap = new Map(blueprint.nodes.map((n) => [n.id, n]));
  const appClusters = blueprint.clusters.filter(
    (c) => !c.cluster_id.startsWith("shared_dep_")
  );

  // Map cluster_id → color index
  const colorOf = new Map(appClusters.map((c, i) => [c.cluster_id, i % CLUSTER_COLORS.length]));

  // ------------------------------------------------------------------
  // Overview layout — D3-Force on cluster pills
  // ------------------------------------------------------------------
  interface SimNode extends d3.SimulationNodeDatum {
    id: string;
    w:  number;
    h:  number;
  }
  const simNodes: SimNode[] = appClusters.map((c, i) => ({
    id: c.cluster_id,
    x:  (i % 4) * (OV_NODE_W + OV_GAP),
    y:  Math.floor(i / 4) * (OV_NODE_H + OV_GAP),
    w:  OV_NODE_W,
    h:  OV_NODE_H,
  }));

  const ovSim = d3
    .forceSimulation<SimNode>(simNodes)
    .force("charge", d3.forceManyBody().strength(-320))
    .force("center", d3.forceCenter(0, 0))
    .force("collision", d3.forceCollide<SimNode>().radius(() => Math.max(OV_NODE_W, OV_NODE_H) / 2 + OV_GAP / 2))
    .stop();
  for (let i = 0; i < 300; i++) ovSim.tick();

  const posOf = new Map(simNodes.map((s) => [s.id, { x: s.x!, y: s.y! }]));

  const overviewNodes: Node[] = appClusters.map((cluster) => {
    const ci    = colorOf.get(cluster.cluster_id)!;
    const color = CLUSTER_COLORS[ci];
    const pos   = posOf.get(cluster.cluster_id)!;
    return {
      id:       cluster.cluster_id,
      type:     "clusterGroup",
      position: { x: pos.x - OV_NODE_W / 2, y: pos.y - OV_NODE_H / 2 },
      style:    { width: OV_NODE_W, height: OV_NODE_H },
      data: {
        label:       cluster.suggested_title || cluster.cluster_id,
        summary:     cluster.functional_summary,
        fileCount:   cluster.node_ids.length,
        colorBg:     color.bg,
        colorBorder: color.border,
        // used by canvas to open drill-down
        clusterId:   cluster.cluster_id,
      },
    };
  });

  // Inter-cluster macro edges (overview only)
  const clusterIdOf = new Map<number, string>();
  for (const c of appClusters) {
    for (const nid of c.node_ids) clusterIdOf.set(nid, c.cluster_id);
  }
  const interPairs = new Map<string, number>();
  for (const e of blueprint.edges) {
    const sc = clusterIdOf.get(e.source_id);
    const tc = clusterIdOf.get(e.target_id);
    if (sc && tc && sc !== tc) {
      const key = `${sc}||${tc}`;
      interPairs.set(key, (interPairs.get(key) ?? 0) + e.weight);
    }
  }
  const overviewEdges: Edge[] = [];
  for (const [key, weight] of interPairs) {
    const [sc, tc] = key.split("||");
    overviewEdges.push({
      id:       `macro-${sc}-${tc}`,
      source:   sc,
      target:   tc,
      animated: false,
      style: {
        stroke:      "rgba(99,102,241,0.45)",
        strokeWidth: clamp(weight * 0.15, 1.5, 6),
      },
      data: { weight, isMacro: true },
    });
  }

  // ------------------------------------------------------------------
  // Detail layout — pre-compute per cluster
  // ------------------------------------------------------------------
  const clusterDetails = new Map<string, { nodes: Node[]; edges: Edge[] }>();

  for (const cluster of appClusters) {
    const ci    = colorOf.get(cluster.cluster_id)!;
    const color = CLUSTER_COLORS[ci];

    const children = cluster.node_ids
      .map((id) => bpNodeMap.get(id))
      .filter(Boolean) as Blueprint["nodes"];

    // Grid seed positions → refine with D3 collision
    const cols = Math.max(1, Math.ceil(Math.sqrt(children.length)));
    interface ChildSim extends d3.SimulationNodeDatum { bpId: number }
    const childSims: ChildSim[] = children.map((n, i) => ({
      bpId: n.id,
      x:    (i % cols) * (FILE_NODE_W + DETAIL_SPACING) + DETAIL_PAD,
      y:    Math.floor(i / cols) * (FILE_NODE_H + DETAIL_SPACING) + DETAIL_PAD,
    }));

    const childSim = d3
      .forceSimulation<ChildSim>(childSims)
      .force("collision", d3.forceCollide(Math.max(FILE_NODE_W, FILE_NODE_H) / 2 + 10))
      .stop();
    for (let i = 0; i < 100; i++) childSim.tick();

    // Canvas size for this detail view
    const xs = childSims.map((c) => c.x!);
    const ys = childSims.map((c) => c.y!);
    const canvasW = Math.max(...xs) + FILE_NODE_W + DETAIL_PAD * 2;
    const canvasH = Math.max(...ys) + FILE_NODE_H + DETAIL_PAD * 2;

    // Background "stage" node so the cluster has a visible bounds card
    const detailNodes: Node[] = [
      {
        id:       `${cluster.cluster_id}__bg`,
        type:     "clusterGroup",
        position: { x: 0, y: 0 },
        style:    { width: canvasW, height: canvasH, pointerEvents: "none" },
        selectable: false,
        draggable:  false,
        data: {
          label:       cluster.suggested_title || cluster.cluster_id,
          summary:     cluster.functional_summary,
          fileCount:   children.length,
          colorBg:     color.bg,
          colorBorder: color.border,
          clusterId:   cluster.cluster_id,
          isBackground: true,
        },
      },
    ];

    for (const cs of childSims) {
      const bpNode = bpNodeMap.get(cs.bpId)!;
      detailNodes.push({
        id:       String(bpNode.id),
        type:     "fileCard",
        position: {
          x: clamp(cs.x! - FILE_NODE_W / 2, DETAIL_PAD, canvasW - FILE_NODE_W - DETAIL_PAD),
          y: clamp(cs.y! - FILE_NODE_H / 2, DETAIL_PAD, canvasH - FILE_NODE_H - DETAIL_PAD),
        },
        style: { width: FILE_NODE_W },
        data: {
          ...bpNode,
          clusterId:    cluster.cluster_id,
          clusterColor: color.border,
        },
      });
    }

    // Intra-cluster edges only
    // Future: execution flow edges will be injected here from blueprint.execution_sequences
    const memberSet = new Set(cluster.node_ids.map(String));
    const detailEdges: Edge[] = blueprint.edges
      .filter((e) => memberSet.has(String(e.source_id)) && memberSet.has(String(e.target_id)))
      .map((e) => ({
        id:       `e-${e.source_id}-${e.target_id}`,
        source:   String(e.source_id),
        target:   String(e.target_id),
        animated: false,
        style: {
          stroke:      color.border,
          strokeWidth: clamp(e.weight * 0.6, 0.8, 3),
        },
        data: { weight: e.weight },
      }));

    clusterDetails.set(cluster.cluster_id, { nodes: detailNodes, edges: detailEdges });
  }

  return { overviewNodes, overviewEdges, clusterDetails };
}
