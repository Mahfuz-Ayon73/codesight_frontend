"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, HelpCircle, Layers, Trash2, X, XCircle } from "lucide-react";
import type { BlueprintCluster, ClusterNote, ClusterOverride } from "@/types/project/project.schema";
import { getDomainStyle, formatDomainLabel } from "./domainStyles";

interface ClusterSummaryPanelProps {
  cluster:  BlueprintCluster | null;
  override: ClusterOverride | undefined;
  canEdit:  boolean;
  saving:   boolean;
  onSave:   (clusterId: string, summary: string) => void;
  onClose:  () => void;
  /** Collaborative notes (SRS 2.2.9) for the open cluster, oldest first. */
  notes?: ClusterNote[];
  /** MEMBER/ADMIN/OWNER — enables the add-note control; VIEWER sees notes read-only. */
  canAddNotes?: boolean;
  currentUserId?: string | null;
  savingNote?: boolean;
  onAddNote?: (clusterId: string, content: string) => void;
  onDeleteNote?: (clusterId: string, noteId: number) => void;
}

export default function ClusterSummaryPanel({
  cluster, override, canEdit, saving, onSave, onClose,
  notes = [], canAddNotes = false, currentUserId = null, savingNote = false, onAddNote, onDeleteNote,
}: ClusterSummaryPanelProps) {
  const suggested = cluster?.functional_summary ?? "";
  const current = override?.overrideSummary ?? suggested;
  const [draft, setDraft] = useState(current);
  const [noteDraft, setNoteDraft] = useState("");

  // Reseed the draft whenever a different cluster is opened.
  useEffect(() => { setDraft(current); }, [cluster?.id, current]);
  useEffect(() => { setNoteDraft(""); }, [cluster?.id]);

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
              {cluster.domain && cluster.domain_type !== "UNCLASSIFIED" && (() => {
                const ds = getDomainStyle(cluster.domain);
                const validated = cluster.domain_llm_validated;
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[8px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      title={cluster.domain_evidence?.join("\n")}
                      style={{
                        background: ds.badgeBg,
                        border:     `1px ${cluster.domain_type === "EMERGENT" ? "dashed" : "solid"} ${ds.badgeBorder}`,
                        color:      ds.badgeText,
                      }}
                    >
                      {formatDomainLabel(cluster.domain)}
                    </span>
                    {validated === true && (
                      <span
                        className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                        title={cluster.domain_llm_reason ?? undefined}
                        style={{ background: "rgba(16,185,129,0.10)", color: "rgba(52,211,153,0.90)" }}
                      >
                        <CheckCircle2 size={10} />
                        LLM confirmed
                        {typeof cluster.domain_llm_confidence === "number" &&
                          ` · ${Math.round(cluster.domain_llm_confidence * 100)}%`}
                      </span>
                    )}
                    {validated === false && (
                      <span
                        className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                        title={cluster.domain_llm_reason ?? undefined}
                        style={{ background: "rgba(244,63,94,0.10)", color: "rgba(251,113,133,0.90)" }}
                      >
                        <XCircle size={10} />
                        LLM disagrees
                        {typeof cluster.domain_llm_confidence === "number" &&
                          ` · ${Math.round(cluster.domain_llm_confidence * 100)}%`}
                      </span>
                    )}
                    {validated == null && (
                      <span
                        className="inline-flex items-center gap-1 text-[9px]"
                        title="No LLM configured, or the validation call failed for this cluster."
                        style={{ color: "rgba(255,255,255,0.30)" }}
                      >
                        <HelpCircle size={10} />
                        Not LLM-validated
                      </span>
                    )}
                  </div>
                );
              })()}

              {cluster.domain_llm_reason && (
                <p className="text-[10px] leading-relaxed text-zinc-500 italic">
                  “{cluster.domain_llm_reason}”
                </p>
              )}

              {canEdit ? (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={suggested || "No summary generated for this cluster yet."}
                  rows={8}
                  style={{ color: "#f4f4f5" }}
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

              <div className="mt-3 pt-3 border-t border-white/[0.07] flex flex-col gap-2">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                  Notes {notes.length > 0 && `(${notes.length})`}
                </p>

                {notes.length === 0 ? (
                  <p className="text-[11px] text-zinc-600 italic">No notes yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-medium text-zinc-400 truncate">
                            {note.authorName}
                            <span className="text-zinc-600 font-normal"> · {formatNoteDate(note.createdAt)}</span>
                          </span>
                          {(note.authorId === currentUserId || canEdit) && onDeleteNote && cluster && (
                            <button
                              onClick={() => onDeleteNote(cluster.id, note.id)}
                              className="shrink-0 p-0.5 rounded text-zinc-600 hover:text-red-400 hover:bg-white/5 transition-colors"
                              aria-label="Delete note"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {canAddNotes && onAddNote && cluster && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Add a note for the team…"
                      rows={2}
                      maxLength={2000}
                      style={{ color: "#f4f4f5" }}
                      className="w-full resize-none rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-[11px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-indigo-400/50"
                    />
                    <button
                      disabled={!noteDraft.trim() || savingNote}
                      onClick={() => {
                        onAddNote(cluster.id, noteDraft.trim());
                        setNoteDraft("");
                      }}
                      className="self-end text-[11px] font-medium px-3 py-1.5 rounded-md bg-indigo-500 text-white hover:bg-indigo-400 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      {savingNote ? "Adding…" : "Add note"}
                    </button>
                  </div>
                )}
              </div>
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

function formatNoteDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
