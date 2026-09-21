"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Moon, Sun } from "lucide-react";
import type { Blueprint, CommitDiff, CommitHistoryResponse, GraphDelta, SnapshotSummary } from "@/types/project/project.schema";
import type { EdgeDiffSelection } from "@/components/canvas/EdgeDiffPanel";
import CommitTimeline from "@/components/canvas/CommitTimeline";
import { useDiffOverlay } from "@/components/canvas/useDiffOverlay";

const CodeSightCanvas = dynamic(() => import("@/components/canvas/CodeSightCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a14]">
      <Loader2 size={20} className="animate-spin text-indigo-400" />
    </div>
  ),
});
const EdgeDiffPanel = dynamic(() => import("@/components/canvas/EdgeDiffPanel"), { ssr: false });
const TourCanvas = dynamic(() => import("@/components/canvas/TourCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#08080f]">
      <Loader2 size={20} className="animate-spin text-indigo-400" />
    </div>
  ),
});

// How long to keep polling /commits for freshly-materialized snapshots after
// a deep re-analysis is triggered, and how often.
const HISTORY_POLL_INTERVAL_MS = 4000;
const HISTORY_POLL_MAX_TICKS = 20; // ~80s
const VISUAL_THEME_STORAGE_KEY = "codesight_visualization_theme";
type VisualizationTheme = "dark" | "light";

export default function DashboardGraphPreview({
  blueprint,
  projectId,
  orgId,
  canEditClusters,
  canAddNotes,
  currentUserId,
}: {
  blueprint: Blueprint;
  projectId: string;
  orgId?: string;
  canEditClusters?: boolean;
  canAddNotes?: boolean;
  currentUserId?: string | null;
}) {
  const [edgeSelection, setEdgeSelection] = useState<EdgeDiffSelection | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [visualTheme, setVisualTheme] = useState<VisualizationTheme>("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
      Promise.resolve().then(() => setVisualTheme(savedTheme));
    }
  }, []);

  const toggleVisualTheme = useCallback(() => {
    setVisualTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem(VISUAL_THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Commit history — Phase 1 (git-only diff) + Phase 2 (deep re-analysis) trigger
  // ---------------------------------------------------------------------------
  const [commits, setCommits] = useState<CommitDiff[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(true);
  const [activeCommit, setActiveCommit] = useState<CommitDiff | null>(null); // null = live/HEAD
  const [isAnalyzingHistory, setIsAnalyzingHistory] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCommits = useCallback(async () => {
    if (!orgId) return null;
    const res = await fetch(`/api/project/commits?organizationId=${orgId}&projectId=${projectId}&count=10`);
    if (!res.ok) return null;
    const data: CommitHistoryResponse = await res.json();
    setCommits(data.commits ?? []);
    setSnapshots(data.snapshots ?? []);
    return data;
  }, [orgId, projectId]);

  useEffect(() => {
    // CommitTimeline is only rendered when orgId is present (below), so the
    // loading flag is simply unused in that case — no need to reset it.
    if (!orgId) return;
    let cancelled = false;
    fetch(`/api/project/commits?organizationId=${orgId}&projectId=${projectId}&count=10`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CommitHistoryResponse | null) => {
        if (cancelled) return;
        if (data) { setCommits(data.commits ?? []); setSnapshots(data.snapshots ?? []); }
        setCommitsLoading(false);
      })
      .catch(() => { if (!cancelled) setCommitsLoading(false); });
    return () => { cancelled = true; };
  }, [orgId, projectId]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleRequestAnalysis = useCallback(async () => {
    if (!orgId || isAnalyzingHistory) return;
    setIsAnalyzingHistory(true);
    try {
      await fetch(`/api/project/analyze-history?organizationId=${orgId}&projectId=${projectId}&count=10`, {
        method: "POST",
      });
    } catch {
      // best-effort — the poll below will simply find nothing new
    }

    let ticks = 0;
    pollRef.current = setInterval(async () => {
      ticks++;
      const data = await fetchCommits();
      const allAnalyzed = data
        ? data.commits.every((c) => data.snapshots.some((s) => s.commitSha === c.sha))
        : false;
      if (allAnalyzed || ticks >= HISTORY_POLL_MAX_TICKS) {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        setIsAnalyzingHistory(false);
      }
    }, HISTORY_POLL_INTERVAL_MS);
  }, [orgId, projectId, isAnalyzingHistory, fetchCommits]);

  // Richer structural delta for the active commit, when a deep-analysis snapshot exists for it.
  const activeDelta: GraphDelta | null = (() => {
    if (!activeCommit) return null;
    const snapshot = snapshots.find((s) => s.commitSha === activeCommit.sha);
    if (!snapshot?.deltaJson) return null;
    try {
      return JSON.parse(snapshot.deltaJson) as GraphDelta;
    } catch {
      return null;
    }
  })();

  const diffOverlay = useDiffOverlay(blueprint, activeCommit, activeDelta);

  const hasTour = (blueprint.entry_points?.length ?? 0) > 0;
  const isLight = visualTheme === "light";

  return (
    <>
      <div className="flex justify-end pt-3">
        <button
          type="button"
          onClick={toggleVisualTheme}
          aria-pressed={isLight}
          aria-label={`Switch visualization to ${isLight ? "dark" : "light"} mode`}
          title={`Switch canvas and commit history to ${isLight ? "dark" : "light"} mode`}
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors"
          style={{
            background: isLight ? "#ffffff" : "rgba(8,8,16,0.96)",
            border: `1px solid ${isLight ? "rgba(6,182,212,0.72)" : "rgba(255,255,255,0.10)"}`,
            color: isLight ? "#0e7490" : "rgba(255,255,255,0.72)",
          }}
        >
          {isLight ? <Sun size={13} /> : <Moon size={13} />}
          {isLight ? "Light mode" : "Dark mode"}
        </button>
      </div>

      {orgId && (
        // No horizontal padding — the canvas div right below has none either
        // (full-bleed to the white card's edges), so this must match its width
        // exactly rather than the header's inset title text.
        <div className="pt-4 pb-2">
          <CommitTimeline
            commits={commits}
            snapshots={snapshots}
            activeShortSha={activeCommit?.shortSha ?? null}
            onCommitSelect={setActiveCommit}
            onLiveClick={() => setActiveCommit(null)}
            onRequestAnalysis={handleRequestAnalysis}
            isAnalyzing={isAnalyzingHistory}
            isLoading={commitsLoading}
            canAnalyze={canEditClusters}
            theme={visualTheme}
          />
        </div>
      )}

      {/* Viewport-relative rather than a fixed 420px: the overlay controls
          stack from the bottom edge and were being clipped by a canvas
          shorter than the panels themselves. Floor keeps it usable on short
          screens; ceiling stops it running away on very tall ones. */}
      <div style={{ height: "clamp(520px, 78vh, 900px)" }} className="relative">
        {tourOpen ? (
          <TourCanvas blueprint={blueprint} onExit={() => setTourOpen(false)} />
        ) : (
          <CodeSightCanvas
            blueprint={blueprint} projectId={projectId} orgId={orgId}
            onEdgeSelect={setEdgeSelection}
            // Rendered inside the canvas's own top-right control stack so it
            // aligns with Export instead of overlapping the breadcrumb.
            onStartTour={hasTour ? () => setTourOpen(true) : undefined}
            canEditClusters={canEditClusters}
            canAddNotes={canAddNotes}
            currentUserId={currentUserId}
            diffOverlay={diffOverlay}
            theme={visualTheme}
          />
        )}
      </div>

      {/* Edge relation code view — a separate section below the preview canvas,
          never overlapping or resizing the graph above it. */}
      <EdgeDiffPanel
        selection={edgeSelection}
        organizationId={orgId}
        projectId={projectId}
        onClose={() => setEdgeSelection(null)}
      />
    </>
  );
}
