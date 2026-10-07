"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, HelpCircle, Layers, Lightbulb, Trash2, X, XCircle } from "lucide-react";
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
  noteError?: string | null;
  onAddNote?: (clusterId: string, content: string) => Promise<boolean>;
  onDeleteNote?: (clusterId: string, noteId: number) => void;
  theme?: "dark" | "light";
}

export default function ClusterSummaryPanel({
  cluster, override, canEdit, saving, onSave, onClose,
  notes = [], canAddNotes = false, currentUserId = null, savingNote = false, noteError = null,
  onAddNote, onDeleteNote,
  theme = "dark",
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
  const isLight = theme === "light";
  const isDirty = draft.trim() !== current.trim();
  const title = override?.overrideTitle ?? cluster?.suggested_title ?? cluster?.name ?? "";

  return (
    <div className="absolute top-0 right-0 h-full z-40 pointer-events-none flex justify-end">
      <div
        className="flex flex-col h-full overflow-hidden transition-all duration-300 pointer-events-auto"
        style={{
          width:          isOpen ? "min(480px, 92vw)" : 0,
          opacity:        isOpen ? 1 : 0,
          background:     isLight ? "rgba(255,255,255,0.98)" : "rgba(8,8,16,0.96)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderLeft:     isLight ? "1px solid rgba(148,163,184,0.42)" : "1px solid rgba(255,255,255,0.08)",
          boxShadow:      isLight ? "-12px 0 32px rgba(15,23,42,0.10)" : "-12px 0 32px rgba(0,0,0,0.18)",
        }}
      >
        {isOpen && cluster && (
          <>
            <div className={`flex items-start gap-2 px-4 py-3 border-b shrink-0 ${isLight ? "border-slate-200 bg-white/80" : "border-white/[0.07]"}`}>
              <div className={`mt-0.5 flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${isLight ? "bg-indigo-50" : "bg-indigo-500/10"}`}>
                <Layers size={13} className={isLight ? "text-indigo-600" : "text-indigo-400"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[12px] font-semibold truncate leading-tight ${isLight ? "text-black" : "text-zinc-100"}`}>{title}</p>
                <p className={`text-[10px] truncate mt-0.5 leading-tight ${isLight ? "text-slate-600" : "text-zinc-500"}`}>Cluster summary</p>
              </div>
              <button
                onClick={onClose}
                className={`shrink-0 p-1 rounded-md transition-colors ${isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/10"}`}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            <div className={`flex-1 overflow-auto px-4 py-3 flex flex-col gap-2 ${isLight ? "bg-slate-50/60" : "bg-transparent"}`}>
              {cluster.domain && cluster.domain_type !== "UNCLASSIFIED" && (() => {
                const ds = getDomainStyle(cluster.domain);
                const validated = cluster.domain_llm_validated;
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[8px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      title={cluster.domain_evidence?.join("\n")}
                      style={{
                        background: isLight ? "rgba(255,255,255,0.92)" : ds.badgeBg,
                        border:     `1px ${cluster.domain_type === "EMERGENT" ? "dashed" : "solid"} ${isLight ? "rgba(15,23,42,0.28)" : ds.badgeBorder}`,
                        color:      isLight ? "#0f172a" : ds.badgeText,
                      }}
                    >
                      {formatDomainLabel(cluster.domain)}
                    </span>
                    {validated === true && (
                      <span
                        className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                        title={cluster.domain_llm_reason ?? undefined}
                        style={{ background: isLight ? "#dcfce7" : "rgba(16,185,129,0.10)", color: isLight ? "#166534" : "rgba(52,211,153,0.90)" }}
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
                        style={{ background: isLight ? "#ffe4e6" : "rgba(244,63,94,0.10)", color: isLight ? "#9f1239" : "rgba(251,113,133,0.90)" }}
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
                        style={{ color: isLight ? "#475569" : "rgba(255,255,255,0.30)" }}
                      >
                        <HelpCircle size={10} />
                        Not LLM-validated
                      </span>
                    )}
                  </div>
                );
              })()}

              {cluster.domain_llm_reason && (
                <p className={`text-[10px] leading-relaxed italic ${isLight ? "text-slate-600" : "text-zinc-500"}`}>
                  “{cluster.domain_llm_reason}”
                </p>
              )}

              {cluster.domain_llm_suggested_name && (
                <div
                  className="rounded-lg px-3 py-2 flex flex-col gap-1"
                  style={{
                    background: isLight ? "#eef2ff" : "rgba(99,102,241,0.06)",
                    border: `1px solid ${isLight ? "#c7d2fe" : "rgba(99,102,241,0.18)"}`,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <Lightbulb size={11} className={`${isLight ? "text-indigo-700" : "text-indigo-400"} shrink-0`} />
                    <span className={`text-[9px] font-semibold uppercase tracking-wide ${isLight ? "text-indigo-800" : "text-indigo-300"}`}>
                      LLM-suggested domain
                    </span>
                  </div>
                  <p className={`text-[11px] font-medium ${isLight ? "text-slate-950" : "text-zinc-200"}`}>{cluster.domain_llm_suggested_name}</p>
                  {cluster.domain_llm_suggested_reason && (
                    <p className={`text-[10px] leading-relaxed italic ${isLight ? "text-slate-600" : "text-zinc-500"}`}>
                      “{cluster.domain_llm_suggested_reason}”
                    </p>
                  )}
                </div>
              )}

              {canEdit ? (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={suggested || "No summary generated for this cluster yet."}
                  rows={8}
                  style={{ color: isLight ? "#0f172a" : "#f4f4f5" }}
                  className={`w-full flex-1 resize-none rounded-lg border px-3 py-2 text-[11px] leading-relaxed outline-none transition-colors ${isLight ? "bg-white border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" : "bg-white/[0.04] border-white/[0.08] text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-400/50"}`}
                />
              ) : (
                <p className={`text-[11px] leading-relaxed whitespace-pre-wrap ${isLight ? "text-slate-900" : "text-zinc-300"}`}>
                  {current || "No summary generated for this cluster yet."}
                </p>
              )}

              {canEdit && override?.overrideSummary && suggested && (
                <p className={`text-[9px] leading-relaxed ${isLight ? "text-slate-500" : "text-zinc-600"}`}>
                  Originally suggested: <span className="italic">{suggested}</span>
                </p>
              )}

              <div className={`mt-3 pt-3 border-t flex flex-col gap-2 ${isLight ? "border-slate-200" : "border-white/[0.07]"}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? "text-slate-700" : "text-zinc-500"}`}>
                  Notes {notes.length > 0 && `(${notes.length})`}
                </p>

                {notes.length === 0 ? (
                  <p className={`text-[11px] italic ${isLight ? "text-slate-500" : "text-zinc-600"}`}>No notes yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className={`rounded-lg border px-3 py-2 flex flex-col gap-1 ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-white/[0.03] border-white/[0.06]"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-medium truncate ${isLight ? "text-slate-700" : "text-zinc-400"}`}>
                            {note.authorName}
                            <span className={`${isLight ? "text-slate-500" : "text-zinc-600"} font-normal`}> · {formatNoteDate(note.createdAt)}</span>
                          </span>
                          {(note.authorId === currentUserId || canEdit) && onDeleteNote && cluster && (
                            <button
                              onClick={() => onDeleteNote(cluster.id, note.id)}
                              className={`shrink-0 p-1 rounded transition-colors ${isLight ? "text-slate-500 hover:text-red-700 hover:bg-red-50" : "text-zinc-600 hover:text-red-400 hover:bg-white/5"}`}
                              aria-label="Delete note"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                        <p className={`text-[11px] leading-relaxed whitespace-pre-wrap ${isLight ? "text-slate-900" : "text-zinc-300"}`}>
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
                      style={{ color: isLight ? "#0f172a" : "#f4f4f5" }}
                      className={`w-full resize-none rounded-lg border px-3 py-2 text-[11px] leading-relaxed outline-none transition-colors ${isLight ? "bg-white border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" : "bg-white/[0.04] border-white/[0.08] text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-400/50"}`}
                    />
                    <button
                      disabled={!noteDraft.trim() || savingNote}
                      onClick={async () => {
                        const saved = await onAddNote(cluster.id, noteDraft.trim());
                        if (saved) setNoteDraft("");
                      }}
                      className={`self-end text-[11px] font-medium px-3 py-1.5 rounded-md text-white transition-colors disabled:opacity-30 disabled:pointer-events-none ${isLight ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-500 hover:bg-indigo-400"}`}
                    >
                      {savingNote ? "Adding…" : "Add note"}
                    </button>
                  </div>
                )}
                {noteError && (
                  <p role="alert" className={`text-[10px] ${isLight ? "text-red-700" : "text-red-400"}`}>
                    {noteError}
                  </p>
                )}
              </div>
            </div>

            {canEdit && (
              <div className={`flex items-center justify-end gap-2 px-4 py-3 border-t shrink-0 ${isLight ? "border-slate-200 bg-white/90" : "border-white/[0.07]"}`}>
                <button
                  disabled={!isDirty || saving}
                  onClick={() => setDraft(current)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none ${isLight ? "text-slate-700 hover:text-slate-950 hover:bg-slate-100" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"}`}
                >
                  Reset
                </button>
                <button
                  disabled={!isDirty || saving}
                  onClick={() => onSave(cluster.id, draft.trim())}
                  className={`text-[11px] font-medium px-3 py-1.5 rounded-md text-white transition-colors disabled:opacity-30 disabled:pointer-events-none ${isLight ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-500 hover:bg-indigo-400"}`}
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
