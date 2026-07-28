"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Edge } from "@xyflow/react";
import type { BlueprintCluster } from "@/types/project/project.schema";
import type { ClusterIndex } from "./useD3Layout";
import { clamp } from "./useD3Layout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClusterMerge {
  id: string;          // "__merge__<uuid>"
  label: string;
  sourceIds: string[];
}

export interface ApplyMergesResult {
  virtualClusters: BlueprintCluster[];
  virtualEdges: Edge[];
  fileCountOverride: Map<string, number>;
}

// ---------------------------------------------------------------------------
// applyMerges — transforms visible clusters + inter-cluster edges
// ---------------------------------------------------------------------------

export function applyMerges(
  clusters: BlueprintCluster[],
  levelEdges: Edge[],
  merges: ClusterMerge[],
  index: ClusterIndex,
): ApplyMergesResult {
  if (merges.length === 0) {
    return { virtualClusters: clusters, virtualEdges: levelEdges, fileCountOverride: new Map() };
  }

  // Build sourceId → merge lookup
  const sourceToMerge = new Map<string, ClusterMerge>();
  for (const m of merges) {
    for (const sid of m.sourceIds) sourceToMerge.set(sid, m);
  }

  const fileCountOverride = new Map<string, number>();
  const emittedMergeIds = new Set<string>();
  const virtualClusters: BlueprintCluster[] = [];

  for (const cluster of clusters) {
    const merge = sourceToMerge.get(cluster.id);
    if (!merge) {
      virtualClusters.push(cluster);
      continue;
    }
    if (!emittedMergeIds.has(merge.id)) {
      emittedMergeIds.add(merge.id);
      // The merged group keeps a domain only when every source agrees on one —
      // a mixed-domain merge is honestly UNCLASSIFIED, not a guess.
      const sources = merge.sourceIds
        .map((sid) => index.clusterById.get(sid))
        .filter((c): c is BlueprintCluster => c != null);
      const firstDomain = sources[0]?.domain ?? null;
      const sharedDomain = firstDomain && sources.every((c) => c.domain === firstDomain)
        ? firstDomain : null;
      const sharedSource = sharedDomain ? sources[0] : null;
      // Synthetic BlueprintCluster for the merged group
      virtualClusters.push({
        id: merge.id,
        name: merge.label,
        suggested_title: merge.label,
        functional_summary: `Merged: ${merge.sourceIds.length} clusters`,
        parent_cluster_id: null,
        domain: sharedDomain,
        domain_type: sharedSource?.domain_type ?? "UNCLASSIFIED",
        domain_confidence: sharedDomain
          ? Math.min(...sources.map((c) => c.domain_confidence ?? 0))
          : 0,
        domain_evidence: [],
      });
      // Aggregate file counts from all source clusters
      const totalFiles = merge.sourceIds.reduce(
        (sum, sid) => sum + (index.descendantCount.get(sid) ?? 0), 0
      );
      fileCountOverride.set(merge.id, totalFiles);
    }
  }

  // Remap edges: map source/target to merged ID if applicable, drop intra-merge edges
  const edgeWeightMap = new Map<string, number>();
  for (const edge of levelEdges) {
    const src = sourceToMerge.get(edge.source)?.id ?? edge.source;
    const tgt = sourceToMerge.get(edge.target)?.id ?? edge.target;
    if (src === tgt) continue; // intra-merge edge — drop
    const key = `${src}||${tgt}`;
    const existingWeight = (edge.data?.weight as number | undefined) ?? 1;
    edgeWeightMap.set(key, (edgeWeightMap.get(key) ?? 0) + existingWeight);
  }

  const virtualEdges: Edge[] = [];
  for (const [key, weight] of edgeWeightMap) {
    const [src, tgt] = key.split("||");
    // Find the original edge style to preserve it; fall back to a default
    const sample = levelEdges.find(
      (e) => (sourceToMerge.get(e.source)?.id ?? e.source) === src &&
              (sourceToMerge.get(e.target)?.id ?? e.target) === tgt
    );
    virtualEdges.push({
      ...(sample ?? {}),
      id: `vmerge-${src}-${tgt}`,
      source: src,
      target: tgt,
      style: {
        stroke: "rgba(99,102,241,0.45)",
        strokeWidth: clamp(weight * 0.15, 1.5, 6),
      },
      data: { weight, isMacro: true },
    });
  }

  return { virtualClusters, virtualEdges, fileCountOverride };
}

// ---------------------------------------------------------------------------
// suggestMerges — auto-suggest high-connectivity cluster pairs
// ---------------------------------------------------------------------------

export function suggestMerges(
  levelEdges: Edge[],
  visibleClusters: BlueprintCluster[],
  threshold = 0.30,
): ClusterMerge[] {
  if (visibleClusters.length < 2 || levelEdges.length === 0) return [];

  const clusterIds = new Set(visibleClusters.map((c) => c.id));

  // Build weight matrix
  const weight = new Map<string, number>();
  const totalWeight = new Map<string, number>();

  for (const edge of levelEdges) {
    if (!clusterIds.has(edge.source) || !clusterIds.has(edge.target)) continue;
    const w = (edge.data?.weight as number | undefined) ?? 1;
    const fwd = `${edge.source}||${edge.target}`;
    const bwd = `${edge.target}||${edge.source}`;
    weight.set(fwd, (weight.get(fwd) ?? 0) + w);
    weight.set(bwd, (weight.get(bwd) ?? 0) + w);
    totalWeight.set(edge.source, (totalWeight.get(edge.source) ?? 0) + w);
    totalWeight.set(edge.target, (totalWeight.get(edge.target) ?? 0) + w);
  }

  // Union-Find
  const parent = new Map<string, string>();
  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  }
  function union(a: string, b: string) {
    parent.set(find(a), find(b));
  }

  const ids = [...clusterIds];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i], b = ids[j];
      const w = weight.get(`${a}||${b}`) ?? 0;
      if (w === 0) continue;
      const minTotal = Math.min(totalWeight.get(a) ?? 0, totalWeight.get(b) ?? 0);
      if (minTotal === 0) continue;
      const density = w / minTotal;
      if (density >= threshold) union(a, b);
    }
  }

  // Group by root
  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const root = find(id);
    const arr = groups.get(root) ?? [];
    arr.push(id);
    groups.set(root, arr);
  }

  const suggestions: ClusterMerge[] = [];
  const clusterById = new Map(visibleClusters.map((c) => [c.id, c]));

  for (const [, members] of groups) {
    if (members.length < 2) continue;
    const label = members
      .map((id) => clusterById.get(id)?.suggested_title ?? clusterById.get(id)?.name ?? id)
      .join(" + ");
    suggestions.push({
      id: `__merge__${crypto.randomUUID()}`,
      label,
      sourceIds: members,
    });
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// useClusterMerges hook — loads/saves merges from/to backend
// ---------------------------------------------------------------------------

export function useClusterMerges(orgId: string, projectId: string) {
  const [merges, setMerges] = useState<ClusterMerge[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load on mount
  useEffect(() => {
    fetch(`/api/project/canvas-merges?organizationId=${orgId}&projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMerges(data);
      })
      .catch(() => { /* non-fatal */ });
  }, [orgId, projectId]);

  // Debounced save
  const persistMerges = useCallback((next: ClusterMerge[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch(
        `/api/project/canvas-merges?organizationId=${orgId}&projectId=${projectId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        }
      ).catch(() => { /* non-fatal */ });
    }, 800);
  }, [orgId, projectId]);

  const addMerge = useCallback((merge: ClusterMerge) => {
    setMerges((prev) => {
      const next = [...prev, merge];
      persistMerges(next);
      return next;
    });
  }, [persistMerges]);

  const removeMerge = useCallback((mergeId: string) => {
    setMerges((prev) => {
      const next = prev.filter((m) => m.id !== mergeId);
      persistMerges(next);
      return next;
    });
  }, [persistMerges]);

  return { merges, addMerge, removeMerge };
}
