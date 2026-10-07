"use client";

import { useCallback, useEffect, useState } from "react";
import type { NodeClusterOverride, NodeMoveEvaluation } from "@/types/project/project.schema";

export function useNodeClusterMoves(orgId: string, projectId: string) {
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Map<string, NodeClusterOverride>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadOverrides() {
      await Promise.resolve();
      if (cancelled) return;
      setSnapshotId(null);
      setOverrides(new Map());
      setError(null);
      if (!orgId || !projectId) return;

      try {
        const snapshotResponse = await fetch(
          `/api/project/snapshot-latest?organizationId=${orgId}&projectId=${projectId}`,
        );
        const snapshot = snapshotResponse.ok
          ? await snapshotResponse.json() as { snapshotId?: string }
          : null;
        if (cancelled || !snapshot?.snapshotId) return;
        setSnapshotId(snapshot.snapshotId);
        const overridesResponse = await fetch(
          `/api/project/node-cluster-overrides?organizationId=${orgId}&projectId=${projectId}&snapshotId=${snapshot.snapshotId}`,
        );
        const list = overridesResponse.ok
          ? await overridesResponse.json() as NodeClusterOverride[]
          : [];
        if (!cancelled) {
          setOverrides(new Map(list.map((item) => [item.filePath, item])));
        }
      } catch {
        if (!cancelled) setError("Could not load manual file placements.");
      }
    }

    void loadOverrides();

    return () => { cancelled = true; };
  }, [orgId, projectId]);

  const request = useCallback(async (
    method: "POST" | "PUT",
    filePath: string,
    targetClusterId: string,
  ) => {
    if (!snapshotId) throw new Error("The latest graph snapshot is not ready.");
    const existing = overrides.get(filePath);
    const body = method === "POST"
      ? { snapshotId, filePath, targetClusterId }
      : {
          snapshotId,
          filePath,
          overrideClusterId: targetClusterId,
          expectedVersion: existing?.version ?? null,
        };
    const response = await fetch(
      `/api/project/node-cluster-overrides?organizationId=${orgId}&projectId=${projectId}`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(payload?.message ?? "The file move could not be processed.");
    }
    return response.json();
  }, [orgId, projectId, snapshotId, overrides]);

  const previewMove = useCallback(
    (filePath: string, targetClusterId: string) =>
      request("POST", filePath, targetClusterId) as Promise<NodeMoveEvaluation>,
    [request],
  );

  const applyMove = useCallback(async (
    filePath: string,
    targetClusterId: string,
    currentClusterId: string,
  ) => {
    const existing = overrides.get(filePath);
    const saved = await request("PUT", filePath, targetClusterId) as { version: number };
    const nextOverride: NodeClusterOverride = {
      filePath,
      originalClusterId: existing?.originalClusterId ?? currentClusterId,
      overrideClusterId: targetClusterId,
      version: saved.version,
    };
    setOverrides((current) => {
      const next = new Map(current);
      next.set(filePath, nextOverride);
      return next;
    });
    setError(null);
    return nextOverride;
  }, [overrides, request]);

  return {
    overrides,
    previewMove,
    applyMove,
    error,
    snapshotReady: snapshotId !== null,
  };
}
