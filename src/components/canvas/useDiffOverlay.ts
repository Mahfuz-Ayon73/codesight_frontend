import { useMemo } from "react";
import type { Blueprint, CommitDiff, DiffStatus, GraphDelta } from "@/types/project/project.schema";

/**
 * Maps a CommitDiff (file-level git diff) or a GraphDelta (structural diff from
 * full historical analysis) onto the current blueprint's nodes.
 *
 * Returns a Map<canonicalPath, DiffStatus> that the canvas uses to colour nodes.
 * Returns an empty map when no diff is active (activeDiff === null).
 *
 * Performance: runs in O(N) where N is the number of changed files. The result
 * is memoized — React only recomputes when blueprint nodes or activeDiff changes.
 */
export function useDiffOverlay(
  blueprint: Blueprint | null,
  activeDiff: CommitDiff | null,
  activeDelta: GraphDelta | null
): Map<string, DiffStatus> {
  return useMemo(() => {
    const overlay = new Map<string, DiffStatus>();
    if (!blueprint || (!activeDiff && !activeDelta)) return overlay;

    if (activeDelta) {
      // Phase 2: full structural diff — use deltaJson for precise cluster-aware diff
      const addedSet    = new Set(activeDelta.added_nodes);
      const removedSet  = new Set(activeDelta.removed_nodes);
      const movedSet    = new Set(activeDelta.moved_nodes.map((m) => m.file));

      for (const node of blueprint.nodes) {
        const path = node.canonical_path;
        if (removedSet.has(path)) {
          overlay.set(path, "deleted");
        } else if (movedSet.has(path)) {
          overlay.set(path, "moved");
        } else if (addedSet.has(path)) {
          overlay.set(path, "added");
        }
      }
      return overlay;
    }

    if (activeDiff) {
      // Phase 1: file-level git diff — match against current blueprint nodes by path
      const addedSet    = new Set(activeDiff.addedFiles);
      const modifiedSet = new Set(activeDiff.modifiedFiles);
      const deletedSet  = new Set(activeDiff.deletedFiles);

      // Build a quick lookup of all node canonical paths in the current blueprint
      for (const node of blueprint.nodes) {
        const path = node.canonical_path;
        if (deletedSet.has(path)) {
          // File deleted in this commit — still show it as it exists in current HEAD
          overlay.set(path, "deleted");
        } else if (modifiedSet.has(path)) {
          overlay.set(path, "modified");
        } else if (addedSet.has(path)) {
          overlay.set(path, "added");
        }
      }
    }

    return overlay;
  }, [blueprint, activeDiff, activeDelta]);
}
