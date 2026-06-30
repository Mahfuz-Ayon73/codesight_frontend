"use client";

import { memo } from "react";
import { GitCommit, Plus, Minus, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import type { CommitDiff, SnapshotSummary } from "@/types/project/project.schema";

interface CommitTimelineProps {
  commits: CommitDiff[];
  snapshots: SnapshotSummary[];
  activeShortSha: string | null;
  onCommitSelect: (commit: CommitDiff) => void;
  onLiveClick: () => void;
  onRequestAnalysis: () => void;
  isAnalyzing: boolean;
  isLoading?: boolean;
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function CommitTimeline({
  commits,
  snapshots,
  activeShortSha,
  onCommitSelect,
  onLiveClick,
  onRequestAnalysis,
  isAnalyzing,
  isLoading = false,
}: CommitTimelineProps) {
  const snapshotBySha = new Map(snapshots.map((s) => [s.commitSha, s]));
  const isLive = activeShortSha === null;

  return (
    <div
      className="flex flex-col gap-2"
      style={{ background: "rgba(8,8,16,0.96)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "12px 16px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <GitCommit size={12} className="text-indigo-400" />
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">Commit History</span>
          {commits.length > 0 && (
            <span className="text-[10px] font-mono text-white/30">last {commits.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRequestAnalysis}
            disabled={isAnalyzing}
            title="Run deep graph analysis on all commits"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40"
            style={{
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.25)",
              color: "rgba(165,180,252,0.9)",
            }}
          >
            {isAnalyzing ? <Loader2 size={9} className="animate-spin" /> : <RefreshCw size={9} />}
            {isAnalyzing ? "Analysing…" : "Deep analysis"}
          </button>
        </div>
      </div>

      {/* Scrollable commit strip */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
        {/* Live (HEAD) pill — hidden while loading */}
        {!isLoading && (
          <button
            onClick={onLiveClick}
            className="flex-shrink-0 flex flex-col gap-1 px-3 py-2 rounded-xl transition-all duration-150 text-left"
            style={{
              minWidth: 120,
              border: `1px solid ${isLive ? "rgba(16,185,129,0.6)" : "rgba(255,255,255,0.08)"}`,
              background: isLive ? "rgba(16,185,129,0.10)" : "rgba(255,255,255,0.03)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-400">LIVE · HEAD</span>
            </div>
            <span className="text-[9px] text-white/35">Current state</span>
          </button>
        )}

        {/* Commit pills */}
        {commits.map((commit) => {
          const isActive = activeShortSha === commit.shortSha;
          const snapshot = snapshotBySha.get(commit.sha);
          const hasDeepAnalysis = !!snapshot;

          return (
            <button
              key={commit.sha}
              onClick={() => onCommitSelect(commit)}
              className="flex-shrink-0 flex flex-col gap-1.5 px-3 py-2 rounded-xl transition-all duration-150 text-left"
              style={{
                minWidth: 160,
                maxWidth: 200,
                border: `1px solid ${isActive ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.07)"}`,
                background: isActive ? "rgba(99,102,241,0.10)" : "rgba(255,255,255,0.025)",
              }}
            >
              {/* SHA + deep analysis indicator */}
              <div className="flex items-center justify-between gap-1">
                <span
                  className="text-[10px] font-mono font-bold"
                  style={{ color: isActive ? "rgba(165,180,252,1)" : "rgba(165,180,252,0.6)" }}
                >
                  {commit.shortSha}
                </span>
                <div className="flex items-center gap-1">
                  {hasDeepAnalysis && (
                    <span title="Deep analysis available"><CheckCircle2 size={9} className="text-emerald-400" /></span>
                  )}
                  {isActive && (
                    <span className="text-[8px] font-bold text-indigo-400 uppercase">viewing</span>
                  )}
                </div>
              </div>

              {/* Commit message */}
              <p
                className="text-[10px] leading-tight line-clamp-2"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                {commit.message}
              </p>

              {/* Author + date */}
              <p className="text-[9px] text-white/30 truncate">
                {commit.author} · {formatRelativeTime(commit.timestamp)}
              </p>

              {/* Diff stats */}
              {commit.totalChanges > 0 && (
                <div className="flex items-center gap-2 mt-0.5">
                  {commit.addedFiles.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] text-emerald-400">
                      <Plus size={8} />{commit.addedFiles.length}
                    </span>
                  )}
                  {commit.modifiedFiles.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] text-amber-400">
                      ~{commit.modifiedFiles.length}
                    </span>
                  )}
                  {commit.deletedFiles.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] text-red-400">
                      <Minus size={8} />{commit.deletedFiles.length}
                    </span>
                  )}
                  <span className="text-[9px] text-white/20">
                    {commit.totalChanges} file{commit.totalChanges !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </button>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 px-3 py-4 text-[10px] text-white/25">
            <Loader2 size={12} className="animate-spin" />
            <span>Loading commit history…</span>
          </div>
        )}
        {!isLoading && commits.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-4 text-[10px] text-white/25">
            <GitCommit size={12} />
            <span>No git history — upload a GitHub repository to enable commit timeline</span>
          </div>
        )}
      </div>

      {/* Diff legend */}
      {activeShortSha !== null && (
        <div className="flex items-center gap-3 mt-1 pt-2 border-t border-white/5">
          <span className="text-[9px] text-white/30 uppercase tracking-wider">Diff legend:</span>
          <span className="flex items-center gap-1 text-[9px] text-emerald-400"><div className="w-2 h-2 rounded-sm bg-emerald-500/40 border border-emerald-500/60" />added</span>
          <span className="flex items-center gap-1 text-[9px] text-amber-400"><div className="w-2 h-2 rounded-sm bg-amber-500/40 border border-amber-500/60" />modified</span>
          <span className="flex items-center gap-1 text-[9px] text-red-400"><div className="w-2 h-2 rounded-sm bg-red-500/40 border border-red-500/60" />deleted</span>
          <span className="flex items-center gap-1 text-[9px] text-purple-400"><div className="w-2 h-2 rounded-sm bg-purple-500/40 border border-purple-500/60" />moved cluster</span>
        </div>
      )}
    </div>
  );
}

export default memo(CommitTimeline);
