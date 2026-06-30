"use client";

import type { Node, Edge } from "@xyflow/react";
import * as d3 from "d3";
import type { Blueprint, BlueprintCluster, BlueprintNode } from "@/types/project/project.schema";

export const EDGE_TYPE_COLORS = {
  RENDERS:             "rgba(6,182,212,0.85)",
  BELONGS_TO_DOMAIN:   "rgba(99,102,241,0.85)",
  SEMANTIC_SIMILARITY: "rgba(16,185,129,0.85)",
} as const;

export interface EdgeFilterOptions {
  showRenders:            boolean;
  showBelongsToDomain:    boolean;
  showSemanticSimilarity: boolean;
  showDeadImports:        boolean;
  overviewMaxEdges:       number;
}

export const CLUSTER_COLORS = [
  { bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.50)"  },
  { bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.50)"  },
  { bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.50)"  },
  { bg: "rgba(236,72,153,0.10)",  border: "rgba(236,72,153,0.50)"  },
  { bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.50)"  },
  { bg: "rgba(168,85,247,0.10)",  border: "rgba(168,85,247,0.50)"  },
  { bg: "rgba(20,184,166,0.10)",  border: "rgba(20,184,166,0.50)"  },
  { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.50)"   },
];

const OV_NODE_W = 260;
const OV_NODE_H = 100;
const OV_GAP    = 120;
const FILE_NODE_W    = 224;
const FILE_NODE_H    = 76;
const DETAIL_PAD     = 60;
const DETAIL_SPACING = 20;
const FLOW_NODE_W = 224;
const FLOW_NODE_H = 80;
const FLOW_H_GAP  = 60;
const FLOW_V_GAP  = 90;
const FLOW_PAD    = 80;

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ---------------------------------------------------------------------------
// Helpers — build cluster-to-nodes and child lookups from blueprint
// ---------------------------------------------------------------------------

export function buildClusterIndex(blueprint: Blueprint) {
  // cluster.id → direct child clusters
  const childrenOf = new Map<string | null, BlueprintCluster[]>();
  for (const c of blueprint.clusters) {
    const key = c.parent_cluster_id ?? null;
    const arr = childrenOf.get(key) ?? [];
    arr.push(c);
    childrenOf.set(key, arr);
  }

  // cluster.id → member leaf nodes (via node.cluster_id)
  const nodesOf = new Map<string, BlueprintNode[]>();
  for (const n of blueprint.nodes) {
    if (!n.cluster_id) continue;
    const arr = nodesOf.get(n.cluster_id) ?? [];
    arr.push(n);
    nodesOf.set(n.cluster_id, arr);
  }

  // cluster.id → total descendant file count (recursive)
  const descendantCount = new Map<string, number>();
  function countDescendants(id: string): number {
    if (descendantCount.has(id)) return descendantCount.get(id)!;
    const directFiles = nodesOf.get(id)?.length ?? 0;
    const childCount  = (childrenOf.get(id) ?? []).reduce((s, c) => s + countDescendants(c.id), 0);
    const total = directFiles + childCount;
    descendantCount.set(id, total);
    return total;
  }
  for (const c of blueprint.clusters) countDescendants(c.id);

  // cluster.id → lookup
  const clusterById = new Map(blueprint.clusters.map((c) => [c.id, c]));

  return { childrenOf, nodesOf, descendantCount, clusterById };
}

export type ClusterIndex = ReturnType<typeof buildClusterIndex>;

// ---------------------------------------------------------------------------
// Layout for a set of cluster pills (overview / sub-level)
// ---------------------------------------------------------------------------

export function layoutClusterPills(
  clusters: BlueprintCluster[],
  index: ClusterIndex,
  colorOffset: number = 0,
  fileCountOverride?: Map<string, number>,
): { nodes: Node[]; edges: Edge[] } {
  if (clusters.length === 0) return { nodes: [], edges: [] };

  interface SimNode extends d3.SimulationNodeDatum { id: string }
  const simNodes: SimNode[] = clusters.map((c, i) => ({
    id: c.id,
    x:  (i % 5) * (OV_NODE_W + OV_GAP),
    y:  Math.floor(i / 5) * (OV_NODE_H + OV_GAP),
  }));

  d3.forceSimulation<SimNode>(simNodes)
    .force("charge", d3.forceManyBody().strength(-320))
    .force("center", d3.forceCenter(0, 0))
    .force("collision", d3.forceCollide(Math.max(OV_NODE_W, OV_NODE_H) / 2 + OV_GAP / 2))
    .stop()
    .tick(300);

  const posOf = new Map(simNodes.map((s) => [s.id, { x: s.x!, y: s.y! }]));

  const nodes: Node[] = clusters.map((cluster, i) => {
    const ci    = ((i + colorOffset) % CLUSTER_COLORS.length + CLUSTER_COLORS.length) % CLUSTER_COLORS.length;
    const color = CLUSTER_COLORS[ci];
    const pos   = posOf.get(cluster.id)!;
    const fileCount = fileCountOverride?.get(cluster.id) ?? index.descendantCount.get(cluster.id) ?? 0;
    const childCount = (index.childrenOf.get(cluster.id) ?? []).length;
    const hasChildren = childCount > 0 || (fileCountOverride?.has(cluster.id) ?? false);

    return {
      id:       cluster.id,
      type:     "clusterGroup",
      position: { x: pos.x - OV_NODE_W / 2, y: pos.y - OV_NODE_H / 2 },
      style:    { width: OV_NODE_W, height: OV_NODE_H },
      data: {
        label:       cluster.suggested_title ?? cluster.name ?? cluster.id,
        summary:     cluster.functional_summary,
        fileCount,
        childCount,
        hasChildren,
        colorBg:     color.bg,
        colorBorder: color.border,
        clusterId:   cluster.id,
      },
    };
  });

  // Inter-cluster edges at this level (cross-edges between siblings)
  // Use descendant node sets to find cross-cluster edges
  const clusterOfNode = new Map<string, string>();
  function collectNodes(cid: string) {
    for (const n of (index.nodesOf.get(cid) ?? [])) clusterOfNode.set(n.id, cid);
    for (const child of (index.childrenOf.get(cid) ?? [])) collectNodes(child.id);
  }
  const clusterSet = new Set(clusters.map((c) => c.id));
  for (const c of clusters) collectNodes(c.id);

  // We don't have blueprint.edges here — edges are passed separately.
  // Return nodes only; caller adds edges.
  return { nodes, edges: [] };
}

// ---------------------------------------------------------------------------
// Layout for leaf-cluster files (structure mode)
// ---------------------------------------------------------------------------

export function layoutFileDetail(
  cluster: BlueprintCluster,
  members: BlueprintNode[],
  edges: Blueprint["edges"],
  colorIndex: number,
): { nodes: Node[]; edges: Edge[] } {
  const color = CLUSTER_COLORS[colorIndex % CLUSTER_COLORS.length];

  const cols = Math.max(1, Math.ceil(Math.sqrt(members.length)));
  interface ChildSim extends d3.SimulationNodeDatum { bpId: string }
  const childSims: ChildSim[] = members.map((n, i) => ({
    bpId: n.id,
    x: (i % cols) * (FILE_NODE_W + DETAIL_SPACING) + DETAIL_PAD,
    y: Math.floor(i / cols) * (FILE_NODE_H + DETAIL_SPACING) + DETAIL_PAD,
  }));

  d3.forceSimulation<ChildSim>(childSims)
    .force("collision", d3.forceCollide(Math.max(FILE_NODE_W, FILE_NODE_H) / 2 + 10))
    .stop()
    .tick(100);

  const xs = childSims.map((c) => c.x!);
  const ys = childSims.map((c) => c.y!);
  const canvasW = (xs.length ? Math.max(...xs) : 0) + FILE_NODE_W + DETAIL_PAD * 2;
  const canvasH = (ys.length ? Math.max(...ys) : 0) + FILE_NODE_H + DETAIL_PAD * 2;

  const detailNodes: Node[] = [
    {
      id: `${cluster.id}__bg`, type: "clusterGroup",
      position: { x: 0, y: 0 },
      style: { width: canvasW, height: canvasH, pointerEvents: "none" },
      selectable: false, draggable: false,
      data: {
        label: cluster.suggested_title ?? cluster.name ?? cluster.id,
        summary: cluster.functional_summary,
        fileCount: members.length, colorBg: color.bg, colorBorder: color.border,
        clusterId: cluster.id, isBackground: true,
      },
    },
  ];

  const memberMap = new Map(members.map((n) => [n.id, n]));
  for (const cs of childSims) {
    const n = memberMap.get(cs.bpId)!;
    detailNodes.push({
      id: n.id, type: "fileCard",
      position: {
        x: clamp(cs.x! - FILE_NODE_W / 2, DETAIL_PAD, canvasW - FILE_NODE_W - DETAIL_PAD),
        y: clamp(cs.y! - FILE_NODE_H / 2, DETAIL_PAD, canvasH - FILE_NODE_H - DETAIL_PAD),
      },
      style: { width: FILE_NODE_W },
      data: { ...n, clusterId: cluster.id, clusterColor: color.border },
    });
  }

  const memberSet = new Set(members.map((n) => n.id));
  const detailEdges: Edge[] = edges
    .filter((e) => memberSet.has(e.source) && memberSet.has(e.target))
    .map((e) => ({
      id: `e-${e.source}-${e.target}`, source: e.source, target: e.target,
      animated: false,
      style: { stroke: color.border, strokeWidth: clamp(e.weight * 0.6, 0.8, 3) },
      data: { weight: e.weight },
    }));

  return { nodes: detailNodes, edges: detailEdges };
}

// ---------------------------------------------------------------------------
// Layout for leaf-cluster files (flow mode)
// ---------------------------------------------------------------------------

export function layoutFileFlow(
  cluster: BlueprintCluster,
  members: BlueprintNode[],
  edges: Blueprint["edges"],
  colorIndex: number,
): { nodes: Node[]; edges: Edge[] } {
  const color = CLUSTER_COLORS[colorIndex % CLUSTER_COLORS.length];
  const memberSet = new Set(members.map((n) => n.id));
  const bpNodeMap = new Map(members.map((n) => [n.id, n]));

  const activeEdges = edges.filter(
    (e) => memberSet.has(e.source) && memberSet.has(e.target) && e.is_dead_import !== true
  );
  const participants = new Set<string>();
  for (const e of activeEdges) { participants.add(e.source); participants.add(e.target); }

  const useAll = participants.size === 0;
  const flowChildren  = useAll ? members : members.filter((n) => participants.has(n.id));
  const orphans       = useAll ? [] : members.filter((n) => !participants.has(n.id));

  const roleLayer: Record<string, number> = {
    ENTRY_POINT: 0, INTERNAL: 1, SHARED_DEPENDENCY: 1, TERMINAL_SINK: 2,
  };
  const inDegree = new Map<string, number>();
  const adjList  = new Map<string, string[]>();
  for (const c of flowChildren) { inDegree.set(c.id, 0); adjList.set(c.id, []); }
  for (const e of activeEdges) {
    adjList.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }
  const depthOf = new Map<string, number>();
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    depthOf.set(id, roleLayer[bpNodeMap.get(id)?.execution_role ?? "INTERNAL"] ?? 1);
    if (deg === 0) queue.push(id);
  }
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of (adjList.get(cur) ?? [])) {
      depthOf.set(next, Math.max(depthOf.get(next) ?? 0, (depthOf.get(cur) ?? 1) + 1));
      inDegree.set(next, (inDegree.get(next) ?? 1) - 1);
      if ((inDegree.get(next) ?? 0) <= 0) queue.push(next);
    }
  }

  const layerMap = new Map<number, string[]>();
  for (const [id, depth] of depthOf) {
    const arr = layerMap.get(depth) ?? []; arr.push(id); layerMap.set(depth, arr);
  }
  const sortedLayers = [...layerMap.keys()].sort((a, b) => a - b);
  let totalW = 0;
  for (const layer of sortedLayers) {
    const ids = layerMap.get(layer)!;
    totalW = Math.max(totalW, ids.length * FLOW_NODE_W + (ids.length - 1) * FLOW_H_GAP);
  }
  const posMap = new Map<string, { x: number; y: number }>();
  let y = FLOW_PAD;
  for (const layer of sortedLayers) {
    const ids = layerMap.get(layer)!;
    const rowW = ids.length * FLOW_NODE_W + (ids.length - 1) * FLOW_H_GAP;
    const startX = (totalW - rowW) / 2 + FLOW_PAD;
    ids.forEach((id, idx) => posMap.set(id, { x: startX + idx * (FLOW_NODE_W + FLOW_H_GAP), y }));
    y += FLOW_NODE_H + FLOW_V_GAP;
  }

  const canvasW = Math.max(totalW + FLOW_PAD * 2, orphans.length * (FLOW_NODE_W + FLOW_H_GAP) + FLOW_PAD * 2);
  const orphanY = y + (orphans.length > 0 ? 50 : 0);
  const orphanStartX = (canvasW - (orphans.length * FLOW_NODE_W + (orphans.length - 1) * FLOW_H_GAP)) / 2;
  const canvasH = orphans.length > 0 ? orphanY + FLOW_NODE_H + FLOW_PAD : y + FLOW_PAD;

  const flowNodes: Node[] = [
    {
      id: `${cluster.id}__bg`, type: "clusterGroup",
      position: { x: 0, y: 0 },
      style: { width: canvasW, height: canvasH, pointerEvents: "none" },
      selectable: false, draggable: false,
      data: {
        label: cluster.suggested_title ?? cluster.name ?? cluster.id,
        summary: cluster.functional_summary,
        fileCount: members.length, colorBg: color.bg, colorBorder: color.border,
        clusterId: cluster.id, isBackground: true,
      },
    },
  ];

  for (const child of flowChildren) {
    flowNodes.push({
      id: child.id, type: "fileCard",
      position: posMap.get(child.id) ?? { x: FLOW_PAD, y: FLOW_PAD },
      style: { width: FLOW_NODE_W },
      data: { ...child, clusterId: cluster.id, clusterColor: color.border, flowActive: true, isFlowOrphan: false },
    });
  }
  orphans.forEach((child, idx) => {
    flowNodes.push({
      id: child.id, type: "fileCard",
      position: { x: orphanStartX + idx * (FLOW_NODE_W + FLOW_H_GAP), y: orphanY },
      style: { width: FLOW_NODE_W },
      data: { ...child, clusterId: cluster.id, clusterColor: color.border, flowActive: true, isFlowOrphan: true },
    });
  });

  const flowEdges: Edge[] = activeEdges.map((e) => {
    let label: string | undefined;
    if (e.called_names?.length) {
      const j = e.called_names.join(", ");
      label = j.length > 32 ? j.substring(0, 29) + "…" : j;
    } else if (e.binding) {
      label = e.binding.length > 32 ? e.binding.substring(0, 29) + "…" : e.binding;
    }
    return {
      id: `flow-${e.source}-${e.target}`, source: e.source, target: e.target,
      animated: true, type: "smoothstep",
      style: { stroke: "rgba(6,182,212,0.9)", strokeWidth: 2 },
      markerEnd: { type: "arrowclosed" as const, width: 16, height: 16, color: "rgba(6,182,212,0.9)" },
      label,
      labelStyle: { fill: "#67e8f9", fontSize: 10, fontWeight: 700, fontFamily: "monospace" },
      labelBgStyle: { fill: "rgba(8,20,30,0.95)", stroke: "rgba(6,182,212,0.4)", strokeWidth: 1 },
      labelBgPadding: [5, 3] as [number, number],
      labelBgBorderRadius: 4,
      data: { weight: e.weight },
    };
  });

  return { nodes: flowNodes, edges: flowEdges };
}
