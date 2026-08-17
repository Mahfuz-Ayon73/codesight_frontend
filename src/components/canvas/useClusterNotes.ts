"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClusterNote } from "@/types/project/project.schema";

// ---------------------------------------------------------------------------
// useClusterNotes — resolves the project's latest snapshot, loads every
// collaborative note recorded against it, and adds/removes notes. Same
// snapshot-resolution shape as useClusterOverrides, but notes are additive
// (a Map<clusterId, ClusterNote[]>) rather than one-per-cluster, since
// multiple team members can each leave their own note on the same cluster.
// ---------------------------------------------------------------------------

export function useClusterNotes(orgId: string, projectId: string) {
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [notesByCluster, setNotesByCluster] = useState<Map<string, ClusterNote[]>>(new Map());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupByCluster = (list: ClusterNote[]) => {
    const map = new Map<string, ClusterNote[]>();
    for (const note of list) {
      const bucket = map.get(note.clusterId);
      if (bucket) bucket.push(note);
      else map.set(note.clusterId, [note]);
    }
    return map;
  };

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/project/snapshot-latest?organizationId=${orgId}&projectId=${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((snap: { snapshotId?: string } | null) => {
        if (cancelled || !snap?.snapshotId) return;
        setSnapshotId(snap.snapshotId);
        return fetch(
          `/api/project/cluster-notes?organizationId=${orgId}&projectId=${projectId}&snapshotId=${snap.snapshotId}`
        ).then((r) => (r.ok ? r.json() : []));
      })
      .then((list: ClusterNote[] | undefined) => {
        if (cancelled || !Array.isArray(list)) return;
        setNotesByCluster(groupByCluster(list));
      })
      .catch(() => { /* non-fatal — canvas still works without notes */ });

    return () => { cancelled = true; };
  }, [orgId, projectId]);

  const addNote = useCallback(async (clusterId: string, content: string) => {
    const trimmed = content.trim();
    if (!snapshotId || !trimmed) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/project/cluster-notes?organizationId=${orgId}&projectId=${projectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshotId, clusterId, content: trimmed }),
        }
      );

      if (!res.ok) {
        setError("Failed to save the note.");
        return;
      }

      const saved: ClusterNote = await res.json();
      setNotesByCluster((prev) => {
        const next = new Map(prev);
        next.set(clusterId, [...(next.get(clusterId) ?? []), saved]);
        return next;
      });
    } catch {
      setError("Failed to save the note.");
    } finally {
      setSaving(false);
    }
  }, [orgId, projectId, snapshotId]);

  const deleteNote = useCallback(async (clusterId: string, noteId: number) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/project/cluster-notes?organizationId=${orgId}&projectId=${projectId}&noteId=${noteId}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204) {
        setError("Failed to delete the note.");
        return;
      }
      setNotesByCluster((prev) => {
        const next = new Map(prev);
        next.set(clusterId, (next.get(clusterId) ?? []).filter((n) => n.id !== noteId));
        return next;
      });
    } catch {
      setError("Failed to delete the note.");
    }
  }, [orgId, projectId]);

  return { notesByCluster, addNote, deleteNote, saving, error, snapshotReady: snapshotId !== null };
}
