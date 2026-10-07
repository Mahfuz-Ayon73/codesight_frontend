"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClusterNote } from "@/types/project/project.schema";

const NOTE_REFRESH_INTERVAL_MS = 10_000;

function groupByCluster(list: ClusterNote[]) {
  const map = new Map<string, ClusterNote[]>();
  for (const note of list) {
    const bucket = map.get(note.clusterId);
    if (bucket) bucket.push(note);
    else map.set(note.clusterId, [note]);
  }
  return map;
}

/** Loads and mutates the notes shared by every member viewing this project. */
export function useClusterNotes(orgId: string, projectId: string) {
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [notesByCluster, setNotesByCluster] = useState<Map<string, ClusterNote[]>>(new Map());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setInterval> | undefined;
    let resolvedSnapshotId: string | null = null;

    const loadNotes = async () => {
      if (!resolvedSnapshotId) return;
      const response = await fetch(
        `/api/project/cluster-notes?organizationId=${orgId}&projectId=${projectId}&snapshotId=${resolvedSnapshotId}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Could not load cluster notes.");
      const list = await response.json() as ClusterNote[];
      if (!cancelled && Array.isArray(list)) {
        setNotesByCluster(groupByCluster(list));
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadNotes().catch(() => {
          if (!cancelled) setError("Could not refresh cluster notes.");
        });
      }
    };

    const initialize = async () => {
      if (!orgId || !projectId) return;
      try {
        const response = await fetch(
          `/api/project/snapshot-latest?organizationId=${orgId}&projectId=${projectId}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("The graph snapshot is not ready for notes.");
        const snapshot = await response.json() as { snapshotId?: string };
        if (!snapshot.snapshotId) throw new Error("The graph snapshot is not ready for notes.");
        resolvedSnapshotId = snapshot.snapshotId;
        if (cancelled) return;
        setSnapshotId(resolvedSnapshotId);
        await loadNotes();
        if (cancelled) return;
        setError(null);
        refreshTimer = setInterval(refreshWhenVisible, NOTE_REFRESH_INTERVAL_MS);
        window.addEventListener("focus", refreshWhenVisible);
        document.addEventListener("visibilitychange", refreshWhenVisible);
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Could not load cluster notes.");
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      if (refreshTimer) clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [orgId, projectId]);

  const addNote = useCallback(async (clusterId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return false;
    if (!snapshotId) {
      setError("The graph snapshot is not ready for notes.");
      return false;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/project/cluster-notes?organizationId=${orgId}&projectId=${projectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshotId, clusterId, content: trimmed }),
        },
      );
      if (!response.ok) {
        setError("Failed to save the note.");
        return false;
      }

      const saved = await response.json() as ClusterNote;
      setNotesByCluster((previous) => {
        const next = new Map(previous);
        next.set(clusterId, [...(next.get(clusterId) ?? []), saved]);
        return next;
      });
      return true;
    } catch {
      setError("Failed to save the note.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [orgId, projectId, snapshotId]);

  const deleteNote = useCallback(async (clusterId: string, noteId: number) => {
    setError(null);
    try {
      const response = await fetch(
        `/api/project/cluster-notes?organizationId=${orgId}&projectId=${projectId}&noteId=${noteId}`,
        { method: "DELETE" },
      );
      if (!response.ok && response.status !== 204) {
        setError("Failed to delete the note.");
        return;
      }
      setNotesByCluster((previous) => {
        const next = new Map(previous);
        next.set(clusterId, (next.get(clusterId) ?? []).filter((note) => note.id !== noteId));
        return next;
      });
    } catch {
      setError("Failed to delete the note.");
    }
  }, [orgId, projectId]);

  return { notesByCluster, addNote, deleteNote, saving, error, snapshotReady: snapshotId !== null };
}
