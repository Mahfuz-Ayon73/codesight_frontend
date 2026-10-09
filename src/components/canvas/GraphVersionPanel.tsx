"use client";

import { useState } from "react";
import { GitBranch, Loader2, Plus, RotateCcw, Trash2, UserRound, X } from "lucide-react";
import type { GraphEditRevision } from "@/types/project/project.schema";

interface Props {
  revisions: GraphEditRevision[];
  activeRevision: GraphEditRevision | null;
  viewingOriginal: boolean;
  onSelectRevision: (id: string) => void;
  onSelectOriginal: () => void;
  onSelectWorkspace: () => void;
  onCreate: (copyCurrent: boolean) => Promise<GraphEditRevision | null>;
  onDelete: (id: string) => Promise<boolean>;
  canEdit: boolean;
  saving: boolean;
  error: string | null;
  theme: "dark" | "light";
}

export default function GraphVersionPanel({
  revisions, activeRevision, viewingOriginal, onSelectRevision, onSelectOriginal, onSelectWorkspace,
  onCreate, onDelete, canEdit, saving, error, theme,
}: Props) {
  const [open, setOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const isLight = theme === "light";
  const surface = isLight ? "rgba(255,255,255,0.98)" : "rgba(8,8,20,0.96)";
  const border = isLight ? "rgba(8,145,178,0.32)" : "rgba(99,102,241,0.30)";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
        style={{ background: surface, border: `1px solid ${border}`, color: isLight ? "#334155" : "rgba(255,255,255,0.72)" }}
        title="Select the immutable original map or a saved human-edited version"
      >
        <GitBranch size={10} className={activeRevision ? "text-violet-400" : "text-emerald-400"} />
        {viewingOriginal
          ? "Original map"
          : activeRevision ? `v${activeRevision.revisionNumber} · ${activeRevision.name}` : "Current workspace"}
        {saving && <Loader2 size={9} className="animate-spin" />}
      </button>

      {open && (
        <div
          className="absolute top-full mt-1.5 right-0 z-50 w-72 rounded-xl overflow-hidden"
          style={{ background: surface, border: `1px solid ${border}`, boxShadow: "0 18px 44px rgba(0,0,0,0.30)" }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
            <div>
              <p className={`text-[11px] font-semibold ${isLight ? "text-slate-800" : "text-white/80"}`}>Map versions</p>
              <p className={`text-[9px] ${isLight ? "text-slate-500" : "text-white/35"}`}>Human edits never change the analyzer map.</p>
            </div>
            <button onClick={() => setOpen(false)} className={isLight ? "text-slate-400" : "text-white/30"}><X size={12} /></button>
          </div>

          <button
            onClick={onSelectOriginal}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${isLight ? "hover:bg-emerald-50" : "hover:bg-white/5"}`}
            style={{ background: viewingOriginal ? (isLight ? "#ecfdf5" : "rgba(16,185,129,0.10)") : undefined }}
          >
            <RotateCcw size={12} className="text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] font-semibold ${isLight ? "text-slate-800" : "text-white/75"}`}>Original map</p>
              <p className={`text-[9px] ${isLight ? "text-slate-500" : "text-white/35"}`}>Reset view to analyzer output</p>
            </div>
          </button>

          <button
            onClick={onSelectWorkspace}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left border-t border-white/5 transition-colors ${isLight ? "hover:bg-cyan-50" : "hover:bg-white/5"}`}
            style={{ background: !viewingOriginal && !activeRevision ? (isLight ? "#ecfeff" : "rgba(6,182,212,0.10)") : undefined }}
          >
            <GitBranch size={12} className="text-cyan-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] font-semibold ${isLight ? "text-slate-800" : "text-white/75"}`}>Current workspace</p>
              <p className={`text-[9px] ${isLight ? "text-slate-500" : "text-white/35"}`}>Existing moves, labels, merges and legacy edits</p>
            </div>
          </button>

          <div className="max-h-52 overflow-y-auto border-t border-white/5">
            {revisions.map((revision) => (
              <button
                key={revision.id}
                onClick={() => {
                  if (deleteMode) void onDelete(revision.id);
                  else onSelectRevision(revision.id);
                }}
                disabled={saving}
                className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors ${isLight ? "hover:bg-violet-50" : "hover:bg-white/5"}`}
                style={{
                  background: deleteMode
                    ? (isLight ? "#fff1f2" : "rgba(244,63,94,0.08)")
                    : activeRevision?.id === revision.id
                      ? (isLight ? "#f5f3ff" : "rgba(139,92,246,0.12)")
                      : undefined,
                }}
              >
                {deleteMode
                  ? <Trash2 size={11} className="mt-1 text-rose-500 shrink-0" />
                  : <span className="mt-0.5 rounded-md px-1.5 py-0.5 text-[8px] font-mono bg-violet-500/15 text-violet-400">v{revision.revisionNumber}</span>}
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[10px] font-semibold ${isLight ? "text-slate-800" : "text-white/75"}`}>{revision.name}</p>
                  <p className={`flex items-center gap-1 text-[8px] ${isLight ? "text-slate-500" : "text-white/35"}`}>
                    <UserRound size={8} /> {revision.editorName} · {revision.addedEdges.length} added · {revision.removedEdgeIds.length} removed
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-white/5 p-2">
            <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => { if (canEdit) void onCreate(!!activeRevision); }}
                  disabled={!canEdit || saving || deleteMode}
                  title={canEdit ? undefined : "Your project role has read-only access to relationships"}
                  className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-semibold text-violet-400 disabled:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={10} /> {activeRevision ? "Create next version" : "Create version"}
                </button>
                <button
                  onClick={() => setDeleteMode((value) => !value)}
                  disabled={!canEdit || saving || (!deleteMode && revisions.length === 0)}
                  title={canEdit ? "Toggle version deletion mode" : "Your project role has read-only access to relationships"}
                  className={`flex items-center gap-1 px-2 py-1 text-[9px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${deleteMode ? "text-rose-500" : (isLight ? "text-slate-500" : "text-white/40")}`}
                >
                  <Trash2 size={10} /> {deleteMode ? "Done" : "Delete versions"}
                </button>
            </div>
              {deleteMode && <p className="px-2 pt-1 text-[8px] text-rose-400">Select a version to delete it permanently.</p>}
              {canEdit && error && <p className="px-2 pt-1 text-[8px] text-rose-400">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
