"use client";

import { useEffect, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FileCode, X, AlertTriangle } from "lucide-react";
import type { BlueprintNode } from "@/types/project/project.schema";

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
}: CodeViewerPanelProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<FileContentResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!node) return;

    if (!organizationId) {
      setStatus("error");
      setErrorMessage("Organization context unavailable");
      setData(null);
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setErrorMessage(null);
    setData(null);

    const params = new URLSearchParams({
      organizationId,
      projectId,
      path: node.canonical_path,
    });

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
          background:     "rgba(8,8,16,0.96)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderLeft:     "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {isOpen && node && (
          <>
            {/* Header */}
            <div className="flex items-start gap-2 px-4 py-3 border-b border-white/[0.07] shrink-0">
              <div className="mt-0.5 flex items-center justify-center w-7 h-7 rounded-md shrink-0 bg-indigo-500/10">
                <FileCode size={13} className="text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-zinc-100 truncate leading-tight">{fileName}</p>
                {dirLabel && <p className="text-[10px] text-zinc-500 truncate mt-0.5 leading-tight">{dirLabel}</p>}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Meta row */}
            {data && (
              <div className="flex items-center gap-2 px-4 py-1.5 border-b border-white/[0.05] shrink-0">
                <span className="text-[9px] font-mono px-1.5 py-px rounded bg-zinc-700/60 text-zinc-400 uppercase">
                  {fileName.split(".").pop() ?? ""}
                </span>
                <span className="text-[9px] text-zinc-500 tabular-nums">{formatBytes(data.sizeBytes)}</span>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-auto">
              {status === "loading" && (
                <div className="flex items-center justify-center h-full">
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
                </div>
              )}

              {status === "error" && (
                <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
                  <AlertTriangle size={18} className="text-amber-400/70" />
                  <p className="text-[11px] text-zinc-400">{errorMessage}</p>
                </div>
              )}

              {status === "loaded" && data?.binary && (
                <div className="flex items-center justify-center h-full px-6 text-center">
                  <p className="text-[11px] text-zinc-500">Binary file — preview not available</p>
                </div>
              )}

              {status === "loaded" && data && !data.binary && (
                <>
                  {data.truncated && (
                    <div className="px-4 py-1.5 bg-amber-900/20 border-b border-amber-600/20">
                      <p className="text-[10px] text-amber-400">Showing first 2 MB of a larger file</p>
                    </div>
                  )}
                  <SyntaxHighlighter
                    language={detectLanguage(node.canonical_path)}
                    style={oneDark}
                    showLineNumbers
                    wrapLongLines={false}
                    customStyle={{
                      background: "transparent",
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
