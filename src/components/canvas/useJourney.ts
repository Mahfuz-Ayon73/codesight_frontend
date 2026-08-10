"use client";

import { useMemo } from "react";
import type {
  Blueprint, BlueprintCluster, BlueprintEntryPoint, BlueprintNode,
} from "@/types/project/project.schema";

/**
 * Edges a reader can follow. SEMANTIC_SIMILARITY is a placement artifact, not
 * a path. Convention edges (synthetic on an import type) are guesses about
 * sibling files and are excluded so a tour never presents an invented hop as
 * real — they are what made `app/global-error.tsx` look like it imports 24
 * files it never touches.
 */
const IMPORT_LIKE   = new Set(["BELONGS_TO_DOMAIN", "RENDERS"]);
const RUNTIME_LINKS = new Set(["CALLS_API", "EMITS_EVENT", "PROVIDES_STATE"]);

export const LINK_LABELS: Record<string, string> = {
  BELONGS_TO_DOMAIN: "imports",
  RENDERS:           "renders",
  CALLS_API:         "calls",
  EMITS_EVENT:       "emits",
  PROVIDES_STATE:    "provides state to",
};

export interface JourneyStep {
  file:      string;
  depth:     number;
  /** The already-visited file that pulled this one in. Null at the root. */
  via:       string | null;
  linkType:  string | null;
  /** URL or event name carried on a contract edge, when there is one. */
  linkLabel: string | null;
  node:      BlueprintNode | null;
  clusterId: string | null;
  domain:    string | null;
}

export interface JourneyStop {
  clusterId: string;
  cluster:   BlueprintCluster | null;
  /** Depth at which the tour first arrives here — defines the visit order. */
  firstDepth: number;
  steps:     JourneyStep[];
}

export interface Journey {
  root:   BlueprintEntryPoint;
  steps:  JourneyStep[];
  /** Clusters in the order the tour reaches them. */
  stops:  JourneyStop[];
  maxDepth: number;
}

/**
 * Breadth-first walk from an entry point. BFS (not DFS) because depth is the
 * reading order: everything at depth 1 is what the landing screen directly
 * needs, and so on outward.
 *
 * Note that depth alone does not order files *within* a cluster — a flowless
 * cluster can have every member sitting at the same depth. `via` does, which
 * is why each step records the file that introduced it.
 */
export function useJourney(
  blueprint: Blueprint,
  root: BlueprintEntryPoint | null,
  /**
   * When set, the walk only enters files in these clusters. The flow is
   * genuinely restricted rather than merely hidden — a file behind an excluded
   * cluster is not reachable, which is what makes "show only these modules"
   * mean something. The entry point is always kept so the tour has a start.
   */
  allowedClusters?: Set<string> | null,
): Journey | null {
  return useMemo(() => {
    if (!root) return null;

    const nodeByPath = new Map(blueprint.nodes.map((n) => [n.canonical_path, n]));
    if (!nodeByPath.has(root.file)) return null;

    const adjacency = new Map<string, Array<{ to: string; type: string; label: string | null }>>();
    for (const edge of blueprint.edges) {
      const type = edge.type ?? "BELONGS_TO_DOMAIN";
      const followable =
        RUNTIME_LINKS.has(type) || (IMPORT_LIKE.has(type) && !edge.is_synthetic);
      if (!followable) continue;
      const list = adjacency.get(edge.source) ?? [];
      list.push({
        to:    edge.target,
        type,
        label: edge.called_names?.length ? edge.called_names.join(", ") : (edge.binding || null),
      });
      adjacency.set(edge.source, list);
    }

    // The render chain is the layouts that wrap this screen, outermost first,
    // then the page. A page never imports its layouts — the framework composes
    // them — so without this the tour would skip the files that actually run
    // first, including whichever layout holds the auth guard.
    const chain = root.render_chain?.length ? root.render_chain : [root.file];
    const steps: JourneyStep[] = [];
    const seen = new Set<string>();

    chain.forEach((file, i) => {
      if (!nodeByPath.has(file) || seen.has(file)) return;
      seen.add(file);
      const node = nodeByPath.get(file) ?? null;
      steps.push({
        file, depth: 0,
        via: i === 0 ? null : chain[i - 1],
        linkType: i === 0 ? null : "RENDERS",
        linkLabel: null,
        node,
        clusterId: node?.cluster_id ?? null,
        domain: node?.domain ?? null,
      });
    });
    if (!steps.length) return null;

    let frontier = [...seen];
    let depth = 0;

    while (frontier.length) {
      const next: string[] = [];
      depth += 1;
      for (const current of frontier) {
        for (const { to, type, label } of adjacency.get(current) ?? []) {
          if (seen.has(to)) continue;
          const node = nodeByPath.get(to) ?? null;
          if (allowedClusters && allowedClusters.size > 0) {
            const cid = node?.cluster_id;
            if (!cid || !allowedClusters.has(cid)) continue;
          }
          seen.add(to);
          next.push(to);
          steps.push({
            file: to, depth, via: current, linkType: type, linkLabel: label,
            node,
            clusterId: node?.cluster_id ?? null,
            domain: node?.domain ?? null,
          });
        }
      }
      frontier = next;
    }

    const clusterById = new Map(blueprint.clusters.map((c) => [c.id, c]));
    const stopOrder: string[] = [];
    const grouped = new Map<string, JourneyStep[]>();
    for (const step of steps) {
      if (!step.clusterId) continue;
      if (!grouped.has(step.clusterId)) {
        grouped.set(step.clusterId, []);
        stopOrder.push(step.clusterId);
      }
      grouped.get(step.clusterId)!.push(step);
    }

    const stops: JourneyStop[] = stopOrder.map((clusterId) => {
      const clusterSteps = grouped.get(clusterId)!;
      return {
        clusterId,
        cluster: clusterById.get(clusterId) ?? null,
        firstDepth: clusterSteps[0].depth,
        // Within a stop, order by the step that introduced each file rather
        // than by depth — in a cluster with no internal edges every member can
        // share one depth, and only `via` separates them.
        steps: [...clusterSteps].sort(
          (a, b) => a.depth - b.depth || (a.via ?? "").localeCompare(b.via ?? ""),
        ),
      };
    });

    return {
      root,
      steps,
      stops,
      maxDepth: steps.reduce((m, s) => Math.max(m, s.depth), 0),
    };
  }, [blueprint, root, allowedClusters]);
}
