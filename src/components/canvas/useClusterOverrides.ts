"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClusterOverride } from "@/types/project/project.schema";

// ---------------------------------------------------------------------------
// useClusterOverrides — resolves the project's latest snapshot, loads any
// cluster name/summary overrides recorded against it, and saves new edits.
// Mirrors useClusterMerges's load-on-mount shape; unlike merges (which are
// canvas-local and don't need a snapshot), overrides are keyed by snapshotId,
// so this hook resolves that first and silently no-ops until it has one —
// e.g. for a project analyzed before this feature shipped, until it's
// re-analyzed.
// ---------------------------------------------------------------------------

export function useClusterOverrides(orgId: string, projectId: string) {
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Map<string, ClusterOverride>>(new Map());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Resolve the latest snapshot, then load overrides recorded against it.
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/project/snapshot-latest?organizationId=${orgId}&projectId=${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((snap: { snapshotId?: string } | null) => {
        if (cancelled || !snap?.snapshotId) return;
        setSnapshotId(snap.snapshotId);
        return fetch(
          `/api/project/cluster-overrides?organizationId=${orgId}&projectId=${projectId}&snapshotId=${snap.snapshotId}`
        ).then((r) => (r.ok ? r.json() : []));
      })
      .then((list: ClusterOverride[] | undefined) => {
        if (cancelled || !Array.isArray(list)) return;
        setOverrides(new Map(list.map((o) => [o.clusterId, o])));
      })
      .catch(() => { /* non-fatal — canvas still works with suggested titles */ });

    return () => { cancelled = true; };
  }, [orgId, projectId]);

  // Shared PUT logic for both the title (double-click on the pill) and the
  // summary (detail panel) editors — same endpoint, same optimistic-lock
  // handling, differing only in which field is being replaced.
  const saveField = useCallback(async (
    clusterId: string, field: "title" | "summary", value: string
  ) => {
    if (!snapshotId) return;
    const existing = overrides.get(clusterId);
    const nextTitle   = field === "title"   ? value : existing?.overrideTitle ?? null;
    const nextSummary = field === "summary" ? value : existing?.overrideSummary ?? null;

    setSavingIds((prev) => new Set(prev).add(clusterId));
    setError(null);
    try {
      const res = await fetch(
        `/api/project/cluster-overrides?organizationId=${orgId}&projectId=${projectId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            snapshotId,
            clusterId,
            overrideTitle: nextTitle,
            overrideSummary: nextSummary,
            expectedVersion: existing?.version ?? null,
          }),
        }
      );

      if (res.status === 409) {
        setError(field === "title"
          ? "This cluster was renamed elsewhere — reload the page to see the latest name."
          : "This cluster's summary was edited elsewhere — reload the page to see the latest version.");
        return;
      }
      if (!res.ok) {
        setError(field === "title" ? "Failed to save the new name." : "Failed to save the new summary.");
        return;
      }

      const saved: { version: number } = await res.json();
      setOverrides((prev) => {
        const next = new Map(prev);
        next.set(clusterId, { clusterId, overrideTitle: nextTitle, overrideSummary: nextSummary, version: saved.version });
        return next;
      });
    } catch {
      setError(field === "title" ? "Failed to save the new name." : "Failed to save the new summary.");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(clusterId);
        return next;
      });
    }
  }, [orgId, projectId, snapshotId, overrides]);

  const saveTitle   = useCallback((clusterId: string, title: string)   => saveField(clusterId, "title", title),     [saveField]);
  const saveSummary = useCallback((clusterId: string, summary: string) => saveField(clusterId, "summary", summary), [saveField]);

  return { overrides, saveTitle, saveSummary, savingIds, error, snapshotReady: snapshotId !== null };
}
