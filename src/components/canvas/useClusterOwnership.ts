"use client";

import { useCallback, useRef, useState } from "react";
import type { FileOwnership, OwnershipResponse } from "@/types/project/project.schema";

// ---------------------------------------------------------------------------
// useClusterOwnership — fetches git-blame ownership for a set of canonical
// paths on demand (git blame is comparatively expensive, so unlike domain
// data — which ships pre-computed on the blueprint — this is not fetched on
// canvas mount). Result is a Map<canonical_path, FileOwnership>; the caller
// aggregates it up to cluster level itself, the same split used for the
// commit-diff overlay (see useDiffOverlay.ts).
// ---------------------------------------------------------------------------

export function useClusterOwnership(orgId: string, projectId: string) {
  const [ownership, setOwnership] = useState<Map<string, FileOwnership>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const inFlightPaths = useRef<string | null>(null);

  const load = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;
    const key = paths.slice().sort().join("|");
    if (inFlightPaths.current === key) return;
    inFlightPaths.current = key;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/project/ownership?organizationId=${orgId}&projectId=${projectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths }),
        }
      );
      if (!res.ok) {
        setError("Failed to load ownership data.");
        return;
      }
      const data: OwnershipResponse = await res.json();
      setOwnership(new Map(data.files.map((f) => [f.path, f])));
      setLoaded(true);
    } catch {
      setError("Failed to load ownership data.");
    } finally {
      setLoading(false);
      inFlightPaths.current = null;
    }
  }, [orgId, projectId]);

  return { ownership, load, loading, error, loaded };
}
