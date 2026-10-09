"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GraphEditRevision, ManualGraphEdge } from "@/types/project/project.schema";

export function useGraphEditRevisions(orgId: string, projectId: string) {
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<GraphEditRevision[]>([]);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const snapshotResponse = await fetch(
          `/api/project/snapshot-latest?organizationId=${orgId}&projectId=${projectId}`,
          { cache: "no-store" },
        );
        if (!snapshotResponse.ok) return;
        const snapshot = await snapshotResponse.json() as { snapshotId?: string };
        if (cancelled || !snapshot.snapshotId) return;
        setSnapshotId(snapshot.snapshotId);
        const response = await fetch(
          `/api/project/graph-edit-revisions?organizationId=${orgId}&projectId=${projectId}&snapshotId=${snapshot.snapshotId}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("Map versions could not be loaded.");
        const loaded = await response.json() as GraphEditRevision[];
        if (!cancelled) setRevisions(loaded);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Map versions could not be loaded.");
      }
    })();
    return () => { cancelled = true; };
  }, [orgId, projectId]);

  const activeRevision = useMemo(
    () => revisions.find((revision) => revision.id === activeRevisionId) ?? null,
    [revisions, activeRevisionId],
  );

  const createRevision = useCallback(async (copyCurrent = false) => {
    if (!snapshotId) return null;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/project/graph-edit-revisions?organizationId=${orgId}&projectId=${projectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            snapshotId,
            copyFromRevisionId: copyCurrent ? activeRevisionId : null,
          }),
        },
      );
      if (!response.ok) throw new Error("The map version could not be created.");
      const created = await response.json() as GraphEditRevision;
      setRevisions((current) => [...current, created]);
      setActiveRevisionId(created.id);
      return created;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The map version could not be created.");
      return null;
    } finally {
      setSaving(false);
    }
  }, [snapshotId, orgId, projectId, activeRevisionId]);

  const deleteRevision = useCallback(async (revisionId: string) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/project/graph-edit-revisions?organizationId=${orgId}&projectId=${projectId}&revisionId=${revisionId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("The map version could not be deleted.");
      setRevisions((current) => current.filter((revision) => revision.id !== revisionId));
      setActiveRevisionId((current) => current === revisionId ? null : current);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The map version could not be deleted.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [orgId, projectId]);

  const saveRevision = useCallback(async (
    revision: GraphEditRevision,
    changes: { addedEdges?: ManualGraphEdge[]; removedEdgeIds?: string[]; name?: string; description?: string | null },
  ) => {
    const optimistic: GraphEditRevision = { ...revision, ...changes };
    setRevisions((current) => current.map((item) => item.id === revision.id ? optimistic : item));
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/project/graph-edit-revisions?organizationId=${orgId}&projectId=${projectId}&revisionId=${revision.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: optimistic.name,
            description: optimistic.description ?? null,
            addedEdges: optimistic.addedEdges,
            removedEdgeIds: optimistic.removedEdgeIds,
            expectedVersion: revision.version,
          }),
        },
      );
      if (!response.ok) throw new Error(response.status === 409
        ? "Someone else edited this version. Reload before trying again."
        : "The map changes could not be saved.");
      const saved = await response.json() as GraphEditRevision;
      setRevisions((current) => current.map((item) => item.id === saved.id ? saved : item));
      return saved;
    } catch (cause) {
      setRevisions((current) => current.map((item) => item.id === revision.id ? revision : item));
      setError(cause instanceof Error ? cause.message : "The map changes could not be saved.");
      return null;
    } finally {
      setSaving(false);
    }
  }, [orgId, projectId]);

  return {
    snapshotReady: snapshotId !== null,
    revisions,
    activeRevision,
    activeRevisionId,
    selectRevision: setActiveRevisionId,
    createRevision,
    deleteRevision,
    saveRevision,
    saving,
    error,
  };
}
