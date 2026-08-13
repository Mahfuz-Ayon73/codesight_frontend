"use client";

import { useEffect, useState } from "react";
import { Layers, X } from "lucide-react";
import type { BlueprintCluster, ClusterOverride } from "@/types/project/project.schema";

interface ClusterSummaryPanelProps {
  cluster:  BlueprintCluster | null;
  override: ClusterOverride | undefined;
  canEdit:  boolean;
  saving:   boolean;
  onSave:   (clusterId: string, summary: string) => void;
  onClose:  () => void;
}

export default function ClusterSummaryPanel({
  cluster, override, canEdit, saving, onSave, onClose,
}: ClusterSummaryPanelProps) {
  const suggested = cluster?.functional_summary ?? "";
  const current = override?.overrideSummary ?? suggested;
  const [draft, setDraft] = useState(current);

  // Reseed the draft whenever a different cluster is opened.
  useEffect(() => { setDraft(current); }, [cluster?.id, current]);

  useEffect(() => {
    if (!cluster) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cluster, onClose]);

  const isOpen = cluster !== null;
  const isDirty = draft.trim() !== current.trim();
  const title = override?.overrideTitle ?? cluster?.suggested_title ?? cluster?.name ?? "";

  return (
    <div className="absolute top-0 right-0 h-full z-40 pointer-events-none flex justify-end">
      <div
        className="flex flex-col h-full overflow-hidden transition-all duration-300 pointer-events-auto"
        style={{
          width:          isOpen ? "min(480px, 92vw)" : 0,
          opacity:        isOpen ? 1 : 0,
          background:     "rgba(8,8,16,0.96)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderLeft:     "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {isOpen && cluster && (
          <>
            <div className="flex items-start gap-2 px-4 py-3 border-b border-white/[0.07] shrink-0">
              <div className="mt-0.5 flex items-center justify-center w-7 h-7 rounded-md shrink-0 bg-indigo-500/10">
                <Layers size={13} className="text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-zinc-100 truncate leading-tight">{title}</p>
                <p className="text-[10px] text-zinc-500 truncate mt-0.5 leading-tight">Cluster summary</p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-4 py-3 flex flex-col gap-2">
              {canEdit ? (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={suggested || "No summary generated for this cluster yet."}
                  rows={8}
                  className="w-full flex-1 resize-none rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-[11px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-indigo-400/50"
                />
              ) : (
                <p className="text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
                  {current || "No summary generated for this cluster yet."}
                </p>
              )}

              {canEdit && override?.overrideSummary && suggested && (
                <p className="text-[9px] text-zinc-600 leading-relaxed">
                  Originally suggested: <span className="italic">{suggested}</span>
                </p>
              )}
            </div>

            {canEdit && (
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/[0.07] shrink-0">
                <button
                  disabled={!isDirty || saving}
                  onClick={() => setDraft(current)}
                  className="text-[11px] px-2.5 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  Reset
                </button>
                <button
                  disabled={!isDirty || saving}
                  onClick={() => onSave(cluster.id, draft.trim())}
                  className="text-[11px] font-medium px-3 py-1.5 rounded-md bg-indigo-500 text-white hover:bg-indigo-400 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
