"use client";

import { useEffect, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { GitBranch, X, AlertTriangle } from "lucide-react";
import type { BlueprintNode } from "@/types/project/project.schema";
import { EDGE_TYPE_COLORS } from "./useD3Layout";

interface FileContentResponse {
  canonicalPath: string;
  content:       string;
  truncated:     boolean;
  binary:        boolean;
  sizeBytes:     number;
}

export interface EdgeDiffSelection {
  sourceNode:   BlueprintNode;
  targetNode:   BlueprintNode;
  sourceLine:   number | null;
  targetLine:   number | null;
  edgeType:     string;
  binding?:     string;
  calledNames?: string[];
}

interface EdgeDiffPanelProps {
  selection:      EdgeDiffSelection | null;
  organizationId?: string;
  projectId:      string;
  onClose:        () => void;
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

const HIGHLIGHT_ID = "edge-diff-highlight-line";

function DiffPane({
  node, highlightLine, organizationId, projectId, side,
}: {
  node: BlueprintNode;
  highlightLine: number | null;
  organizationId?: string;
  projectId: string;
  side: "source" | "target";
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<FileContentResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const paneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!organizationId) {
      setStatus("error");
      setErrorMessage("Organization context unavailable");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setErrorMessage(null);
    setData(null);

    const params = new URLSearchParams({ organizationId, projectId, path: node.canonical_path });
    fetch(`/api/project/file-content?${params.toString()}`)
      .then(async (res) => {
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
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load file");
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id, organizationId, projectId]);

  useEffect(() => {
    if (status !== "loaded" || highlightLine == null) return;
    const id = window.setTimeout(() => {
      paneRef.current?.querySelector(`#${HIGHLIGHT_ID}-${side}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
    return () => window.clearTimeout(id);
  }, [status, highlightLine, side]);

  const parts    = node.canonical_path.split("/");
  const fileName = parts[parts.length - 1] ?? "";
  const dirLabel = parts.slice(0, -1).slice(-2).join("/");

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] shrink-0">
        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${side === "source" ? "bg-cyan-500/15 text-cyan-300" : "bg-indigo-500/15 text-indigo-300"}`}>
          {side}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-zinc-200 truncate leading-tight">{fileName}</p>
          {dirLabel && <p className="text-[9px] text-zinc-500 truncate leading-tight">{dirLabel}</p>}
        </div>
        {highlightLine != null && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 shrink-0">L{highlightLine}</span>
        )}
      </div>

      <div ref={paneRef} className="flex-1 overflow-auto">
        {status === "loading" && (
          <div className="flex items-center justify-center h-full">
            <div className="w-4 h-4 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
            <AlertTriangle size={16} className="text-amber-400/70" />
            <p className="text-[11px] text-zinc-400">{errorMessage}</p>
          </div>
        )}

        {status === "loaded" && data?.binary && (
          <div className="flex items-center justify-center h-full px-6 text-center">
            <p className="text-[11px] text-zinc-500">Binary file — preview not available</p>
          </div>
        )}

        {status === "loaded" && data && !data.binary && (
          <SyntaxHighlighter
            language={detectLanguage(node.canonical_path)}
            style={oneDark}
            showLineNumbers
            wrapLines
            wrapLongLines={false}
            lineProps={(lineNumber: number) => {
              if (lineNumber !== highlightLine) return {};
              return {
                id: `${HIGHLIGHT_ID}-${side}`,
                style: {
                  display:     "block",
                  borderLeft:  "2px solid rgba(6,182,212,0.9)",
                  marginLeft:  -2,
                  paddingLeft: 2,
                },
              };
            }}
            customStyle={{
              background: "transparent",
              fontSize:   11,
              margin:     0,
              padding:    "10px 6px",
              minHeight:  "100%",
            }}
          >
            {data.content}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}

export default function EdgeDiffPanel({
  selection, organizationId, projectId, onClose,
}: EdgeDiffPanelProps) {
  const isOpen = selection !== null;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selection) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selection, onClose]);

  // This section lives below the (near-full-viewport-height) canvas in normal
  // page flow, so opening it happens well outside the visible scroll area —
  // without this it silently opens off-screen. Delay matches the height/opacity
  // transition so we scroll once the panel has actually expanded.
  useEffect(() => {
    if (!selection) return;
    const id = window.setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 320);
    return () => window.clearTimeout(id);
  }, [selection]);

  const edgeColor = selection
    ? (EDGE_TYPE_COLORS[selection.edgeType as keyof typeof EDGE_TYPE_COLORS] ?? "rgba(99,102,241,0.85)")
    : "rgba(99,102,241,0.85)";
  const relationLabel = selection?.calledNames?.length
    ? selection.calledNames.join(", ")
    : selection?.binding || selection?.edgeType;
  const hasLineData = selection ? (selection.sourceLine != null || selection.targetLine != null) : false;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden transition-all duration-300"
      style={{
        // A standalone section below the canvas card — not part of its flex layout,
        // so opening this never changes the graph's size. Fixed height (not a
        // percentage of anything), since it's independent of the canvas now. The
        // host page's flex `gap` supplies the spacing from the canvas above.
        height:         isOpen ? 560 : 0,
        opacity:        isOpen ? 1 : 0,
      }}
    >
      <div
        className="flex flex-col w-full h-full overflow-hidden rounded-2xl"
        style={{
          background:     "rgba(8,8,16,0.97)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border:         "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {isOpen && selection && (
          <>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.07] shrink-0">
              <div
                className="flex items-center justify-center w-6 h-6 rounded-md shrink-0"
                style={{ background: edgeColor.replace("0.85", "0.12") }}
              >
                <GitBranch size={12} style={{ color: edgeColor }} />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[11px]">
                <span
                  className="font-mono px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: edgeColor.replace("0.85", "0.12"), color: edgeColor }}
                >
                  {selection.edgeType}
                </span>
                {relationLabel && <span className="text-zinc-400 truncate">{relationLabel}</span>}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {!hasLineData && (
              <div className="px-4 py-1 bg-amber-900/15 border-b border-amber-600/20 shrink-0">
                <p className="text-[10px] text-amber-400">
                  Line info unavailable for this relation — re-run analysis to enable line highlighting.
                </p>
              </div>
            )}

            {/* Side-by-side body */}
            <div className="flex-1 grid grid-cols-2 divide-x divide-white/[0.06] overflow-hidden">
              <DiffPane
                node={selection.sourceNode} highlightLine={selection.sourceLine}
                organizationId={organizationId} projectId={projectId} side="source"
              />
              <DiffPane
                node={selection.targetNode} highlightLine={selection.targetLine}
                organizationId={organizationId} projectId={projectId} side="target"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
