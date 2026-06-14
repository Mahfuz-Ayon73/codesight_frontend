"use client";

import type { Edge } from "@xyflow/react";
import type { Blueprint } from "@/types/project/project.schema";

/**
 * Per-node connectivity summary for a cluster.
 * Computed on-demand when a cluster is opened — not pre-computed upfront.
 */
export interface NodeConnectivity {
  nodeId:       string;
  /** Files this node directly imports within the cluster */
  dependsOn:    string[];   // canonical paths
  /** Files that import this node within the cluster */
  importedBy:   string[];   // canonical paths
  /** Total intra-cluster edge connections (in + out) */
  edgeCount:    number;
  /** True if zero edges connect this node to any other cluster member */
  isOrphan:     boolean;
  isFlowOrphan: boolean;
}

export interface ClusterRelationshipResult {
  /** Edge objects ready for React Flow — intra-cluster deps only */
  edges:        Edge[];
  /** Per-node connectivity map keyed by node id string */
  connectivity: Map<string, NodeConnectivity>;
  /** Number of nodes with at least one intra-cluster edge */
  connectedCount: number;
  /** Number of nodes with no intra-cluster edges */
  orphanCount:  number;
  /** Nodes sorted by total edge count descending (most connected first) */
  rankedNodes:  string[];
}

/**
 * Computes intra-cluster dependency relationships for the selected cluster.
 * Called on-demand when user opens a cluster detail view.
 *
 * @param clusterId   - The cluster being opened
 * @param blueprint   - Full blueprint (contains all edges and node metadata)
 * @param edgeColor   - Border color of the cluster (for edge styling)
 * @param flowActive  - Whether Flow Mode is active (filtering non-dead calls)
 */
export function computeClusterRelationships(
  clusterId:  string,
  blueprint:  Blueprint,
  edgeColor:  string,
  flowActive: boolean = false,
): ClusterRelationshipResult {
  const cluster = blueprint.clusters.find((c) => c.cluster_id === clusterId);
  if (!cluster) {
    return { edges: [], connectivity: new Map(), connectedCount: 0, orphanCount: 0, rankedNodes: [] };
  }

  const memberSet  = new Set(cluster.node_ids.map(String));
  const nodeById   = new Map(blueprint.nodes.map((n) => [n.id, n]));

  // Filter blueprint edges to intra-cluster only
  const intraEdges = blueprint.edges.filter(
    (e) => memberSet.has(String(e.source_id)) && memberSet.has(String(e.target_id))
  );

  // Build connectivity map
  const connectivity = new Map<string, NodeConnectivity>(
    cluster.node_ids.map((id) => [
      String(id),
      {
        nodeId:    String(id),
        dependsOn: [],
        importedBy: [],
        edgeCount: 0,
        isOrphan:  true,
        isFlowOrphan: true,
      },
    ])
  );

  // Populate structural dependencies
  for (const e of intraEdges) {
    const srcKey = String(e.source_id);
    const tgtKey = String(e.target_id);
    const srcNode = nodeById.get(e.source_id);
    const tgtNode = nodeById.get(e.target_id);

    const src = connectivity.get(srcKey)!;
    const tgt = connectivity.get(tgtKey)!;

    if (src && tgt) {
      if (tgtNode) src.dependsOn.push(tgtNode.canonical_path);
      if (srcNode) tgt.importedBy.push(srcNode.canonical_path);

      if (!flowActive) {
        src.edgeCount++;
        tgt.edgeCount++;
      }
      src.isOrphan = false;
      tgt.isOrphan = false;
    }
  }

  // Populate execution flow connectivity (only non-dead calls)
  const activeIntraEdges = intraEdges.filter((e) => e.is_dead_import !== true);
  for (const e of activeIntraEdges) {
    const srcKey = String(e.source_id);
    const tgtKey = String(e.target_id);
    const src = connectivity.get(srcKey);
    const tgt = connectivity.get(tgtKey);

    if (src && tgt) {
      if (flowActive) {
        src.edgeCount++;
        tgt.edgeCount++;
      }
      src.isFlowOrphan = false;
      tgt.isFlowOrphan = false;
    }
  }

  const targetEdges = flowActive ? activeIntraEdges : intraEdges;

  // Build React Flow edge objects
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const rfEdges: Edge[] = targetEdges.map((e) => {
    let label: string | undefined = undefined;
    if (flowActive && e.called_names && e.called_names.length > 0) {
      label = e.called_names.join(", ");
      if (label.length > 30) {
        label = label.substring(0, 27) + "...";
      }
    }

    return {
      id:       `e-${e.source_id}-${e.target_id}`,
      source:   String(e.source_id),
      target:   String(e.target_id),
      animated: flowActive,
      style: {
        stroke:      flowActive ? "rgba(6,182,212,0.85)" : edgeColor,
        strokeWidth: flowActive ? 2 : clamp(e.weight * 0.6, 0.8, 3),
        opacity:     flowActive ? 1.0 : 0.8,
      },
      markerEnd: {
        type: "arrowclosed" as const,
        width: 14,
        height: 14,
        color: flowActive ? "rgba(6,182,212,0.85)" : edgeColor,
      },
      label,
      labelStyle: { fill: "#22d3ee", fontSize: 9, fontWeight: 600, fontFamily: "monospace" },
      labelBgStyle: { fill: "rgba(15,15,25,0.9)", stroke: "rgba(6,182,212,0.3)", strokeWidth: 1 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
      data: { weight: e.weight, isIntraCluster: true },
    };
  });

  // Stats based on currently active mode
  const connectedCount = [...connectivity.values()].filter((c) => flowActive ? !c.isFlowOrphan : !c.isOrphan).length;
  const orphanCount    = connectivity.size - connectedCount;

  // Rank nodes by edge count (most connected hub first)
  const rankedNodes = [...connectivity.entries()]
    .sort((a, b) => b[1].edgeCount - a[1].edgeCount)
    .map(([id]) => id);

  return { edges: rfEdges, connectivity, connectedCount, orphanCount, rankedNodes };
}
