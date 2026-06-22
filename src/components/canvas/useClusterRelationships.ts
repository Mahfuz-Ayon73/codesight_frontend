"use client";

import type { Edge } from "@xyflow/react";
import type { Blueprint } from "@/types/project/project.schema";

export interface NodeConnectivity {
  nodeId:       string;
  dependsOn:    string[];   // canonical paths of nodes this one imports
  importedBy:   string[];   // canonical paths of nodes that import this one
  edgeCount:    number;
  isOrphan:     boolean;
  isFlowOrphan: boolean;
}

export interface ClusterRelationshipResult {
  edges:          Edge[];
  connectivity:   Map<string, NodeConnectivity>;
  connectedCount: number;
  orphanCount:    number;
  rankedNodes:    string[];
}

/**
 * Computes intra-cluster dependency relationships for the selected cluster.
 * Uses v2 schema: cluster.id, node.id (canonical path), edge.source/target.
 */
export function computeClusterRelationships(
  clusterId:  string,
  blueprint:  Blueprint,
  edgeColor:  string,
  flowActive: boolean = false,
): ClusterRelationshipResult {
  // Build cluster → member nodes via node.cluster_id foreign key
  const memberNodes = blueprint.nodes.filter((n) => n.cluster_id === clusterId);
  if (memberNodes.length === 0) {
    return { edges: [], connectivity: new Map(), connectedCount: 0, orphanCount: 0, rankedNodes: [] };
  }

  const memberSet = new Set(memberNodes.map((n) => n.id));

  // Filter to intra-cluster edges only (source and target both in this cluster)
  const intraEdges = blueprint.edges.filter(
    (e) => memberSet.has(e.source) && memberSet.has(e.target)
  );

  // Initialise connectivity map keyed by canonical path
  const connectivity = new Map<string, NodeConnectivity>(
    memberNodes.map((n) => [
      n.id,
      { nodeId: n.id, dependsOn: [], importedBy: [], edgeCount: 0, isOrphan: true, isFlowOrphan: true },
    ])
  );

  // Populate structural dependencies
  for (const e of intraEdges) {
    const src = connectivity.get(e.source);
    const tgt = connectivity.get(e.target);
    if (!src || !tgt) continue;

    src.dependsOn.push(e.target);
    tgt.importedBy.push(e.source);
    src.isOrphan = false;
    tgt.isOrphan = false;
    if (!flowActive) {
      src.edgeCount++;
      tgt.edgeCount++;
    }
  }

  // Populate flow connectivity (non-dead edges only)
  const activeIntraEdges = intraEdges.filter((e) => e.is_dead_import !== true);
  for (const e of activeIntraEdges) {
    const src = connectivity.get(e.source);
    const tgt = connectivity.get(e.target);
    if (!src || !tgt) continue;

    src.isFlowOrphan = false;
    tgt.isFlowOrphan = false;
    if (flowActive) {
      src.edgeCount++;
      tgt.edgeCount++;
    }
  }

  const targetEdges = flowActive ? activeIntraEdges : intraEdges;

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const rfEdges: Edge[] = targetEdges.map((e) => {
    let label: string | undefined;
    if (flowActive && e.called_names && e.called_names.length > 0) {
      label = e.called_names.join(", ");
      if (label.length > 30) label = label.substring(0, 27) + "...";
    }
    return {
      id:       `e-${e.source}-${e.target}`,
      source:   e.source,
      target:   e.target,
      animated: flowActive,
      style: {
        stroke:      flowActive ? "rgba(6,182,212,0.85)" : edgeColor,
        strokeWidth: flowActive ? 2 : clamp(e.weight * 0.6, 0.8, 3),
        opacity:     flowActive ? 1.0 : 0.8,
      },
      markerEnd: {
        type:   "arrowclosed" as const,
        width:  14,
        height: 14,
        color:  flowActive ? "rgba(6,182,212,0.85)" : edgeColor,
      },
      label,
      labelStyle:          { fill: "#22d3ee", fontSize: 9, fontWeight: 600, fontFamily: "monospace" },
      labelBgStyle:        { fill: "rgba(15,15,25,0.9)", stroke: "rgba(6,182,212,0.3)", strokeWidth: 1 },
      labelBgPadding:      [4, 2] as [number, number],
      labelBgBorderRadius: 4,
      data: { weight: e.weight, isIntraCluster: true },
    };
  });

  const connectedCount = [...connectivity.values()].filter(
    (c) => flowActive ? !c.isFlowOrphan : !c.isOrphan
  ).length;
  const orphanCount = connectivity.size - connectedCount;
  const rankedNodes = [...connectivity.entries()]
    .sort((a, b) => b[1].edgeCount - a[1].edgeCount)
    .map(([id]) => id);

  return { edges: rfEdges, connectivity, connectedCount, orphanCount, rankedNodes };
}
