"use client";

import { useEffect, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FileCode, X, AlertTriangle, ArrowRightLeft, Gauge, Loader2 } from "lucide-react";
import type { BlueprintNode, MoveMetricDelta, NodeMoveEvaluation } from "@/types/project/project.schema";

interface FileContentResponse {
  canonicalPath: string;
  content:       string;
  truncated:     boolean;
  binary:        boolean;
  sizeBytes:     number;
}

interface CodeViewerPanelProps {
  node:           BlueprintNode | null;
  organizationId?: string;
  projectId:      string;
  onClose:        () => void;
  canMove?:       boolean;
  clusterOptions?: { id: string; label: string }[];
  onPreviewMove?: (filePath: string, targetClusterId: string) => Promise<NodeMoveEvaluation>;
  onApplyMove?:   (filePath: string, targetClusterId: string, currentClusterId: string) => Promise<unknown>;
  theme?:          "dark" | "light";
}

type Status = "idle" | "loading" | "loaded" | "error";

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "ts":  return "typescript";
    case "tsx": return "tsx";
    case "js":  return "javascript";
    case "jsx": return "jsx";
    case "mjs": return "javascript";
    default:    return "text";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CodeViewerPanel({
  node, organizationId, projectId, onClose,
  canMove = false, clusterOptions = [], onPreviewMove, onApplyMove,
  theme = "dark",
}: CodeViewerPanelProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<FileContentResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [targetClusterId, setTargetClusterId] = useState("");
  const [evaluation, setEvaluation] = useState<NodeMoveEvaluation | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [applying, setApplying] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const isLight = theme === "light";

  useEffect(() => {
    let cancelled = false;
    async function loadFile() {
      await Promise.resolve();
      if (cancelled || !node) return;
      if (!organizationId) {
        setStatus("error");
        setErrorMessage("Organization context unavailable");
        setData(null);
        return;
      }

      setStatus("loading");
      setErrorMessage(null);
      setData(null);
      const params = new URLSearchParams({
        organizationId,
        projectId,
        path: node.canonical_path,
      });

      try {
        const res = await fetch(`/api/project/file-content?${params.toString()}`);
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: res.statusText }));
          setStatus("error");
          setErrorMessage(body.message ?? "Failed to load file");
          return;
        }
        const json = (await res.json()) as FileContentResponse;
        setData(json);
        setStatus("loaded");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load file");
      }
    }

    void loadFile();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id, organizationId, projectId]);

  useEffect(() => {
    if (!node) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [node, onClose]);

  const isOpen = node !== null;
  const parts    = node ? node.canonical_path.split("/") : [];
  const fileName = parts.length ? parts[parts.length - 1] : "";
  const dirLabel = parts.slice(0, -1).slice(-2).join("/");
  const currentCluster = clusterOptions.find((cluster) => cluster.id === node?.cluster_id);

  const evaluateMove = async () => {
    if (!node || !targetClusterId || !onPreviewMove) return;
    setEvaluating(true);
    setMoveError(null);
    setEvaluation(null);
    try {
      setEvaluation(await onPreviewMove(node.canonical_path, targetClusterId));
    } catch (error) {
      setMoveError(error instanceof Error ? error.message : "Could not evaluate this move.");
    } finally {
      setEvaluating(false);
    }
  };

  const applyMove = async () => {
    if (!node || !targetClusterId || !evaluation || !onApplyMove) return;
    setApplying(true);
    setMoveError(null);
    try {
      await onApplyMove(node.canonical_path, targetClusterId, node.cluster_id);
    } catch (error) {
      setMoveError(error instanceof Error ? error.message : "Could not apply this move.");
      setApplying(false);
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute top-0 right-0 h-full z-40 pointer-events-none flex justify-end"
    >
      <div
        className="flex flex-col h-full overflow-hidden transition-all duration-300 pointer-events-auto"
        style={{
          width:          isOpen ? "min(560px, 92vw)" : 0,
          opacity:        isOpen ? 1 : 0,
          background:     isLight ? "rgba(255,255,255,0.98)" : "rgba(8,8,16,0.96)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderLeft:     isLight ? "1px solid rgba(148,163,184,0.42)" : "1px solid rgba(255,255,255,0.08)",
          boxShadow:      isLight ? "-12px 0 32px rgba(15,23,42,0.10)" : "-12px 0 32px rgba(0,0,0,0.18)",
        }}
      >
        {isOpen && node && (
          <>
            {/* Header */}
            <div className={`flex items-start gap-2 px-4 py-3 border-b shrink-0 ${isLight ? "border-slate-200 bg-white/80" : "border-white/[0.07]"}`}>
              <div className={`mt-0.5 flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${isLight ? "bg-indigo-50" : "bg-indigo-500/10"}`}>
                <FileCode size={13} className={isLight ? "text-indigo-600" : "text-indigo-400"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[12px] font-semibold truncate leading-tight ${isLight ? "text-black" : "text-zinc-100"}`}>{fileName}</p>
                {dirLabel && <p className={`text-[10px] truncate mt-0.5 leading-tight ${isLight ? "text-slate-600" : "text-zinc-500"}`}>{dirLabel}</p>}
              </div>
              <button
                onClick={onClose}
                className={`shrink-0 p-1 rounded-md transition-colors ${isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/10"}`}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Meta row */}
            {data && (
              <div className={`flex items-center gap-2 px-4 py-1.5 border-b shrink-0 ${isLight ? "border-slate-200 bg-slate-50/80" : "border-white/[0.05]"}`}>
                <span className={`text-[9px] font-mono px-1.5 py-px rounded uppercase ${isLight ? "bg-slate-200 text-slate-700" : "bg-zinc-700/60 text-zinc-400"}`}>
                  {fileName.split(".").pop() ?? ""}
                </span>
                <span className={`text-[9px] tabular-nums ${isLight ? "text-slate-600" : "text-zinc-500"}`}>{formatBytes(data.sizeBytes)}</span>
              </div>
            )}

            {canMove && clusterOptions.length > 1 && (
              <div className={`shrink-0 border-b px-4 py-3 flex flex-col gap-2.5 ${isLight ? "border-slate-200 bg-indigo-50/50" : "border-white/[0.07] bg-indigo-500/[0.025]"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ArrowRightLeft size={11} className={`${isLight ? "text-indigo-600" : "text-indigo-400"} shrink-0`} />
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? "text-slate-700" : "text-zinc-400"}`}>
                      Architecture placement
                    </span>
                  </div>
                  <span className={`text-[9px] truncate ${isLight ? "text-slate-600" : "text-zinc-500"}`} title={currentCluster?.label ?? node.cluster_id}>
                    Current: {currentCluster?.label ?? node.cluster_id}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={targetClusterId}
                    onChange={(event) => {
                      setTargetClusterId(event.target.value);
                      setEvaluation(null);
                      setMoveError(null);
                    }}
                    className={`min-w-0 flex-1 rounded-md border px-2 py-1.5 text-[10px] outline-none transition-colors ${isLight ? "bg-white border-slate-300 text-slate-900 focus:border-indigo-500" : "bg-zinc-900 border-white/10 text-zinc-200 focus:border-indigo-400/60"}`}
                  >
                    <option value="">Choose destination cluster…</option>
                    {clusterOptions.map((cluster) => (
                      <option key={cluster.id} value={cluster.id} disabled={cluster.id === node.cluster_id}>
                        {cluster.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={evaluateMove}
                    disabled={!targetClusterId || evaluating || applying}
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[10px] font-semibold disabled:opacity-40 disabled:pointer-events-none transition-colors ${isLight ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700" : "bg-indigo-500/20 border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/30"}`}
                  >
                    {evaluating ? <Loader2 size={10} className="animate-spin" /> : <Gauge size={10} />}
                    {evaluating ? "Evaluating…" : "Evaluate"}
                  </button>
                </div>

                {moveError && (
                  <p className={`text-[10px] ${isLight ? "text-rose-700" : "text-rose-400"}`}>{moveError}</p>
                )}

                {evaluation && (
                  <MoveEvaluationCard
                    evaluation={evaluation}
                    applying={applying}
                    onApply={applyMove}
                    isLight={isLight}
                  />
                )}
              </div>
            )}

            {/* Body */}
            <div className={`flex-1 overflow-auto ${isLight ? "bg-slate-50" : "bg-transparent"}`}>
              {status === "loading" && (
                <div className="flex items-center justify-center h-full">
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
                </div>
              )}

              {status === "error" && (
                <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
                  <AlertTriangle size={18} className="text-amber-400/70" />
                  <p className={`text-[11px] ${isLight ? "text-slate-700" : "text-zinc-400"}`}>{errorMessage}</p>
                </div>
              )}

              {status === "loaded" && data?.binary && (
                <div className="flex items-center justify-center h-full px-6 text-center">
                  <p className={`text-[11px] ${isLight ? "text-slate-600" : "text-zinc-500"}`}>Binary file — preview not available</p>
                </div>
              )}

              {status === "loaded" && data && !data.binary && (
                <>
                  {data.truncated && (
                    <div className={`px-4 py-1.5 border-b ${isLight ? "bg-amber-50 border-amber-200" : "bg-amber-900/20 border-amber-600/20"}`}>
                      <p className={`text-[10px] ${isLight ? "text-amber-800" : "text-amber-400"}`}>Showing first 2 MB of a larger file</p>
                    </div>
                  )}
                  <SyntaxHighlighter
                    language={detectLanguage(node.canonical_path)}
                    style={isLight ? oneLight : oneDark}
                    showLineNumbers
                    wrapLongLines={false}
                    lineNumberStyle={{ color: isLight ? "#94a3b8" : "#52525b", minWidth: "2.75em" }}
                    customStyle={{
                      background: isLight ? "#f8fafc" : "transparent",
                      fontSize:   11,
                      margin:     0,
                      padding:    "12px 8px",
                      minHeight:  "100%",
                    }}
                  >
                    {data.content}
                  </SyntaxHighlighter>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MoveEvaluationCard({
  evaluation,
  applying,
  onApply,
  isLight,
}: {
  evaluation: NodeMoveEvaluation;
  applying: boolean;
  onApply: () => void;
  isLight: boolean;
}) {
  const tone = evaluation.verdict === "IMPROVES"
    ? { text: isLight ? "text-emerald-800" : "text-emerald-300", bg: isLight ? "bg-emerald-50" : "bg-emerald-500/10", border: isLight ? "border-emerald-200" : "border-emerald-400/25" }
    : evaluation.verdict === "WORSENS"
      ? { text: isLight ? "text-rose-800" : "text-rose-300", bg: isLight ? "bg-rose-50" : "bg-rose-500/10", border: isLight ? "border-rose-200" : "border-rose-400/25" }
      : { text: isLight ? "text-amber-800" : "text-amber-300", bg: isLight ? "bg-amber-50" : "bg-amber-500/10", border: isLight ? "border-amber-200" : "border-amber-400/25" };

  return (
    <div className={`rounded-lg border ${tone.border} ${tone.bg} px-3 py-2.5 flex flex-col gap-2`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-semibold ${tone.text}`}>
          {evaluation.verdict === "IMPROVES" ? "Likely improvement" :
            evaluation.verdict === "WORSENS" ? "Likely regression" : "Mostly neutral"}
        </span>
        <span className={`text-[11px] font-mono font-semibold ${tone.text}`}>
          {evaluation.qualityScore.before.toFixed(2)} → {evaluation.qualityScore.after.toFixed(2)}
          {` (${signed(evaluation.qualityScore.delta)} pts)`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <Metric label="File fit" metric={evaluation.filePlacement} isLight={isLight} />
        <Metric label="Modularity" metric={evaluation.modularity} digits={4} isLight={isLight} />
        <Metric label="Cohesion" metric={evaluation.cohesion} isLight={isLight} />
        <Metric label="Coupling" metric={evaluation.coupling} lowerIsBetter isLight={isLight} />
        <Metric label="Size balance" metric={evaluation.sizeBalance} isLight={isLight} />
      </div>

      <p className={`text-[9px] leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-500"}`}>
        {evaluation.reasons[0]}
      </p>

      <button
        type="button"
        onClick={onApply}
        disabled={applying}
        className="self-end inline-flex items-center gap-1 rounded-md bg-indigo-500 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
      >
        {applying && <Loader2 size={10} className="animate-spin" />}
        {applying ? "Applying…" : "Apply move"}
      </button>
    </div>
  );
}

function Metric({
  label,
  metric,
  digits = 2,
  lowerIsBetter = false,
  isLight,
}: {
  label: string;
  metric: MoveMetricDelta;
  digits?: number;
  lowerIsBetter?: boolean;
  isLight: boolean;
}) {
  const benefitDelta = lowerIsBetter ? -metric.delta : metric.delta;
  const color = benefitDelta > 0
    ? (isLight ? "text-emerald-700" : "text-emerald-400")
    : benefitDelta < 0
      ? (isLight ? "text-rose-700" : "text-rose-400")
      : (isLight ? "text-slate-600" : "text-zinc-500");
  return (
    <div className="flex items-center justify-between gap-2 text-[9px]">
      <span className={isLight ? "text-slate-600" : "text-zinc-500"}>{label}</span>
      <span className={`font-mono ${color}`}>
        {metric.before.toFixed(digits)}→{metric.after.toFixed(digits)} ({signed(benefitDelta, digits)})
      </span>
    </div>
  );
}

function signed(value: number, digits = 2): string {
  const rounded = Math.abs(value) < Math.pow(10, -digits) / 2 ? 0 : value;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(digits)}`;
}
