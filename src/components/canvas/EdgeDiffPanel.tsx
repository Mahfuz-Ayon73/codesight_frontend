"use client";

import { useEffect, useRef, useState } from "react";
import { Prism as SyntaxHighlighter, createElement } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
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

const HIGHLIGHT_ID = "edge-diff-highlight-line";

// react-syntax-highlighter's internal AST node shape (hast-like) — not exported
// by its type package beyond the `renderer` prop's callback signature.
interface CodeNode {
  type:        "element" | "text";
  value?:      string | number;
  tagName?:    keyof React.JSX.IntrinsicElements | React.ComponentType<unknown>;
  properties?: { className: string[]; [key: string]: unknown };
  children?:   CodeNode[];
}

const DARK_RELATION_HIGHLIGHT_STYLE = {
  color: "#67e8f9", background: "rgba(6,182,212,0.18)", borderRadius: 2, fontWeight: 700,
} as const;

const LIGHT_RELATION_HIGHLIGHT_STYLE = {
  color: "#0e7490", background: "#cffafe", borderRadius: 2, fontWeight: 700,
} as const;

function isWordChar(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z0-9_$]/.test(ch);
}

// Finds every whole-word occurrence of any `terms` entry in `text`, longest
// term first (so a longer name always wins over a shorter one it contains),
// and skips overlaps with an already-found range.
function findMatchRanges(text: string, terms: string[]): [number, number][] {
  const ranges: [number, number][] = [];
  const sorted = [...terms].filter(Boolean).sort((a, b) => b.length - a.length);
  for (const term of sorted) {
    let from = 0;
    while (from <= text.length) {
      const idx = text.indexOf(term, from);
      if (idx === -1) break;
      const end = idx + term.length;
      from = idx + 1;
      if (isWordChar(text[idx - 1]) || isWordChar(text[end])) continue;
      if (ranges.some(([s, e]) => idx < e && end > s)) continue;
      ranges.push([idx, end]);
    }
  }
  return ranges.sort((a, b) => a[0] - b[0]);
}

// Splits a text leaf around every whole-word match, wrapping each match in a
// cyan span (an empty className skips the Prism stylesheet lookup in
// create-element.js, so this color can't be overridden by token coloring).
function splitTextWithHighlights(text: string, terms: string[], isLight: boolean): CodeNode[] {
  const ranges = findMatchRanges(text, terms);
  if (ranges.length === 0) return [{ type: "text", value: text }];
  const out: CodeNode[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) out.push({ type: "text", value: text.slice(cursor, start) });
    out.push({
      type: "element", tagName: "span",
      properties: {
        className: [],
        style: isLight ? LIGHT_RELATION_HIGHLIGHT_STYLE : DARK_RELATION_HIGHLIGHT_STYLE,
      },
      children: [{ type: "text", value: text.slice(start, end) }],
    });
    cursor = end;
  }
  if (cursor < text.length) out.push({ type: "text", value: text.slice(cursor) });
  return out;
}

// Recursively expands a node into one-or-more nodes with every relation-term
// occurrence highlighted — used across the whole file (not just the
// import/definition line) so every usage site is visible at a glance.
function expandHighlights(node: CodeNode, terms: string[], isLight: boolean): CodeNode[] {
  if (node.type === "text" && typeof node.value === "string") {
    return splitTextWithHighlights(node.value, terms, isLight);
  }
  if (node.children) {
    return [{ ...node, children: node.children.flatMap((c) => expandHighlights(c, terms, isLight)) }];
  }
  return [node];
}

function DiffPane({
  node, highlightLine, relationTerms, organizationId, projectId, side, theme,
}: {
  node: BlueprintNode;
  highlightLine: number | null;
  relationTerms: string[];
  organizationId?: string;
  projectId: string;
  side: "source" | "target";
  theme: "dark" | "light";
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<FileContentResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const isLight = theme === "light";

  useEffect(() => {
    let cancelled = false;

    async function loadFile() {
      await Promise.resolve();
      if (cancelled) return;
      if (!organizationId) {
        setStatus("error");
        setErrorMessage("Organization context unavailable");
        return;
      }

      setStatus("loading");
      setErrorMessage(null);
      setData(null);

      try {
        const params = new URLSearchParams({ organizationId, projectId, path: node.canonical_path });
        const response = await fetch(`/api/project/file-content?${params.toString()}`);
        if (cancelled) return;
        if (!response.ok) {
          const body = await response.json().catch(() => ({ message: response.statusText }));
          setStatus("error");
          setErrorMessage(body.message ?? "Failed to load file");
          return;
        }
        const json = await response.json() as FileContentResponse;
        if (cancelled) return;
        setData(json);
        setStatus("loaded");
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Failed to load file");
      }
    }

    void loadFile();

    return () => { cancelled = true; };
  }, [node.id, node.canonical_path, organizationId, projectId]);

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
      <div className={`flex items-center gap-2 px-3 py-2 border-b shrink-0 ${isLight ? "border-slate-200 bg-white" : "border-white/[0.06]"}`}>
        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${side === "source"
          ? (isLight ? "bg-cyan-100 text-cyan-800" : "bg-cyan-500/15 text-cyan-300")
          : (isLight ? "bg-indigo-100 text-indigo-800" : "bg-indigo-500/15 text-indigo-300")}`}>
          {side}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-semibold truncate leading-tight ${isLight ? "text-slate-900" : "text-zinc-200"}`}>{fileName}</p>
          {dirLabel && <p className={`text-[9px] truncate leading-tight ${isLight ? "text-slate-500" : "text-zinc-500"}`}>{dirLabel}</p>}
        </div>
        {highlightLine != null && (
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${isLight ? "bg-slate-100 text-slate-600" : "bg-white/5 text-zinc-400"}`}>L{highlightLine}</span>
        )}
      </div>

      <div
        ref={paneRef}
        className={`flex-1 overflow-auto ${isLight ? "bg-slate-50" : "bg-transparent"}`}
        style={{ colorScheme: isLight ? "light" : "dark" }}
      >
        {status === "loading" && (
          <div className="flex items-center justify-center h-full">
            <div className="w-4 h-4 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
            <AlertTriangle size={16} className="text-amber-400/70" />
            <p className={`text-[11px] ${isLight ? "text-slate-700" : "text-zinc-400"}`}>{errorMessage}</p>
          </div>
        )}

        {status === "loaded" && data?.binary && (
          <div className="flex items-center justify-center h-full px-6 text-center">
            <p className={`text-[11px] ${isLight ? "text-slate-600" : "text-zinc-500"}`}>Binary file — preview not available</p>
          </div>
        )}

        {status === "loaded" && data && !data.binary && (
          <SyntaxHighlighter
            language={detectLanguage(node.canonical_path)}
            style={isLight ? oneLight : oneDark}
            showLineNumbers
            wrapLines
            wrapLongLines={false}
            lineNumberStyle={{ color: isLight ? "#94a3b8" : "#52525b", minWidth: "2.75em" }}
            lineProps={(lineNumber: number) => (lineNumber === highlightLine ? { id: `${HIGHLIGHT_ID}-${side}` } : {})}
            renderer={({ rows, stylesheet, useInlineStyles }) => rows.map((row, i) => {
              if (relationTerms.length > 0 && row.children) {
                const expanded: CodeNode = { ...row, children: row.children.flatMap((c) => expandHighlights(c, relationTerms, isLight)) };
                return createElement({ node: expanded, stylesheet, useInlineStyles, key: `code-segment-${i}` });
              }
              return createElement({ node: row, stylesheet, useInlineStyles, key: `code-segment-${i}` });
            })}
            codeTagProps={{
              style: {
                ...(isLight ? oneLight : oneDark)['code[class*="language-"]'],
                background: "transparent",
              },
            }}
            customStyle={{
              background: isLight ? "#f8fafc" : "transparent",
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
  selection, organizationId, projectId, onClose, theme = "dark",
}: EdgeDiffPanelProps) {
  const isOpen = selection !== null;
  const containerRef = useRef<HTMLDivElement>(null);
  const isLight = theme === "light";

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
  const relationTerms = selection?.calledNames?.length
    ? selection.calledNames
    : selection?.binding ? [selection.binding] : [];

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
          background:     isLight ? "rgba(255,255,255,0.98)" : "rgba(8,8,16,0.97)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border:         isLight ? "1px solid rgba(148,163,184,0.45)" : "1px solid rgba(255,255,255,0.08)",
          boxShadow:      isLight ? "0 12px 32px rgba(15,23,42,0.10)" : "0 12px 32px rgba(0,0,0,0.18)",
        }}
      >
        {isOpen && selection && (
          <>
            {/* Header */}
            <div className={`flex items-center gap-2 px-4 py-2 border-b shrink-0 ${isLight ? "border-slate-200 bg-white" : "border-white/[0.07]"}`}>
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
                {relationLabel && <span className={`truncate ${isLight ? "text-slate-600" : "text-zinc-400"}`}>{relationLabel}</span>}
              </div>
              <button
                onClick={onClose}
                className={`shrink-0 p-1 rounded-md transition-colors ${isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/10"}`}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {!hasLineData && (
              <div className={`px-4 py-1 border-b shrink-0 ${isLight ? "bg-amber-50 border-amber-200" : "bg-amber-900/15 border-amber-600/20"}`}>
                <p className={`text-[10px] ${isLight ? "text-amber-800" : "text-amber-400"}`}>
                  Line info unavailable for this relation — re-run analysis to enable line highlighting.
                </p>
              </div>
            )}

            {/* Side-by-side body */}
            <div className={`flex-1 grid grid-cols-2 divide-x overflow-hidden ${isLight ? "divide-slate-200" : "divide-white/[0.06]"}`}>
              <DiffPane
                node={selection.sourceNode} highlightLine={selection.sourceLine} relationTerms={relationTerms}
                organizationId={organizationId} projectId={projectId} side="source" theme={theme}
              />
              <DiffPane
                node={selection.targetNode} highlightLine={selection.targetLine} relationTerms={relationTerms}
                organizationId={organizationId} projectId={projectId} side="target" theme={theme}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
