"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, GitBranch, FolderOpen, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Button from "@/components/Button/Button";

type UploadMethod = "folder" | "zip" | "github";

type Props = {
  organizationId: string;
  projectId: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB per chunk — stays under Next.js proxy limits

export default function UploadCodebase({ organizationId, projectId }: Props) {
  const router = useRouter();
  const zipRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const [method, setMethod] = useState<UploadMethod>("zip");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedZip, setSelectedZip] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const base = `${API_BASE}/api/v1/organizations/${organizationId}/projects/${projectId}`;

  function getToken() {
    return document.cookie
      .split("; ")
      .find((c) => c.startsWith("codesight_token="))
      ?.split("=")[1];
  }

  async function uploadZipChunked(file: File) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = crypto.randomUUID();
    console.log(`[CHUNK] Starting chunked upload: ${file.name}, ${totalChunks} chunks of ${CHUNK_SIZE / 1024 / 1024}MB each`);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const form = new FormData();
      form.append("chunk", chunk);
      form.append("uploadId", uploadId);
      form.append("chunkIndex", String(chunkIndex));
      form.append("totalChunks", String(totalChunks));
      form.append("fileName", file.name);

      // Route through Next.js API proxy — token is read server-side from HttpOnly cookie
      const url = `/api/upload/zip-chunk?organizationId=${organizationId}&projectId=${projectId}`;
      console.log(`[CHUNK] Sending chunk ${chunkIndex + 1}/${totalChunks} (${(chunk.size / 1024).toFixed(0)}KB) to ${url}`);

      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          body: form,
        });
      } catch (networkErr) {
        console.error(`[CHUNK] Network error on chunk ${chunkIndex + 1}:`, networkErr);
        throw new Error(`Network error on chunk ${chunkIndex + 1}/${totalChunks}: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`);
      }

      console.log(`[CHUNK] Response for chunk ${chunkIndex + 1}: status=${res.status}`);

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        console.error(`[CHUNK] Server error on chunk ${chunkIndex + 1}:`, res.status, body);
        throw new Error(`Server error on chunk ${chunkIndex + 1}/${totalChunks}: ${res.status} — ${body?.message ?? res.statusText}`);
      }

      setProgress(Math.round(((chunkIndex + 1) / totalChunks) * 100));
    }
  }

  async function handleUpload() {
    setStatus("uploading");
    setErrorMsg(null);
    setProgress(0);
    const token = getToken();

    try {
      if (method === "folder") {
        if (!selectedFiles || selectedFiles.length === 0) {
          setErrorMsg("Please select a folder.");
          setStatus("error");
          return;
        }
        const form = new FormData();
        Array.from(selectedFiles).forEach((file) => form.append("files", file));
        const res = await fetch(`${base}/upload/folder`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message ?? "Folder upload failed");
        }

      } else if (method === "zip") {
        if (!selectedZip) { setErrorMsg("Please select a ZIP file."); setStatus("error"); return; }
        await uploadZipChunked(selectedZip);

      } else {
        if (!githubUrl.trim()) { setErrorMsg("Please enter a GitHub URL."); setStatus("error"); return; }
        const res = await fetch(`${base}/upload/github`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            githubUrl: githubUrl.trim(),
            ...(githubToken.trim() ? { accessToken: githubToken.trim() } : {}),
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message ?? "GitHub upload failed");
        }
      }

      setStatus("success");
      setTimeout(() => router.refresh(), 1200);
    } catch (err) {
      const message = err instanceof Error
        ? `${err.name}: ${err.message}\n${err.stack ?? ""}`
        : String(err);
      console.error("[UPLOAD] Full error:", err);
      setErrorMsg(message);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-green-200 bg-green-50 py-12 text-center px-6">
        <CheckCircle size={32} className="text-green-500 mb-3" />
        <p className="text-sm font-semibold text-green-700">Upload successful</p>
        <p className="text-xs text-green-600 mt-1">Your codebase is being processed…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-6 flex flex-col gap-5">
      <div>
        <p className="text-base font-semibold text-zinc-800">Upload your codebase</p>
        <p className="text-sm text-zinc-400 mt-0.5">
          GitHub URL works best for large projects. ZIP handles any size locally. Folder upload works for small projects only.
        </p>
      </div>

      {/* Method tabs */}
      <div className="flex gap-2">
        {(
          [
            { key: "folder", label: "Folder", icon: <FolderOpen size={14} /> },
            { key: "zip", label: "ZIP file", icon: <Upload size={14} /> },
            { key: "github", label: "GitHub URL", icon: <GitBranch size={14} /> },
          ] as { key: UploadMethod; label: string; icon: React.ReactNode }[]
        ).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => { setMethod(key); setStatus("idle"); setErrorMsg(null); }}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
              method === key
                ? "border-cyan-400 bg-cyan-50 text-cyan-700 font-medium"
                : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Folder input */}
      {method === "folder" && (
        <div
          onClick={() => folderRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 py-10 text-sm text-zinc-400 hover:border-cyan-300 hover:text-cyan-500 transition"
        >
          <FolderOpen size={24} className="mb-2" />
          {selectedFiles && selectedFiles.length > 0 ? (
            <>
              <span className="font-medium text-zinc-600">{selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected</span>
              <span className="text-xs mt-0.5 text-zinc-400">Click to change</span>
            </>
          ) : (
            <>
              <span>Click to select a folder</span>
              <span className="text-xs mt-0.5">All files inside will be uploaded</span>
            </>
          )}
          <input
            ref={folderRef}
            type="file"
            // @ts-expect-error — webkitdirectory is non-standard
            webkitdirectory=""
            directory=""
            multiple
            className="hidden"
            onChange={(e) => { setSelectedFiles(e.target.files); setStatus("idle"); }}
          />
        </div>
      )}

      {/* ZIP input */}
      {method === "zip" && (
        <div
          onClick={() => zipRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 py-10 text-sm text-zinc-400 hover:border-cyan-300 hover:text-cyan-500 transition"
        >
          <Upload size={24} className="mb-2" />
          {selectedZip ? (
            <>
              <span className="font-medium text-zinc-600">{selectedZip.name}</span>
              <span className="text-xs mt-0.5 text-zinc-400">
                {selectedZip.size >= 1024 * 1024
                  ? (selectedZip.size / 1024 / 1024).toFixed(1) + " MB"
                  : (selectedZip.size / 1024).toFixed(1) + " KB"
                } · Click to change
              </span>
            </>
          ) : (
            <span>Click to select a ZIP file</span>
          )}
          <input
            ref={zipRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setSelectedZip(file);
              setStatus("idle");
              setErrorMsg(null);
            }}
          />
        </div>
      )}

      {/* GitHub input */}
      {method === "github" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">GitHub repository URL</label>
            <input
              value={githubUrl}
              onChange={(e) => { setGithubUrl(e.target.value); setStatus("idle"); }}
              placeholder="https://github.com/user/repo"
              className="rounded-lg border border-zinc-300/60 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">
              Personal Access Token
              <span className="ml-1.5 text-xs font-normal text-zinc-400">(only required for private repos)</span>
            </label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => { setGithubToken(e.target.value); setStatus("idle"); }}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="rounded-lg border border-zinc-300/60 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition font-mono"
            />
            <p className="text-xs text-zinc-400">
              Generate at GitHub → Settings → Developer settings → Personal access tokens. Needs <code className="bg-zinc-100 px-1 rounded">repo</code> scope.
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {status === "uploading" && method === "zip" && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === "error" && errorMsg && (
        <div className="flex flex-col gap-1 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span className="font-medium">Upload failed</span>
          </div>
          <pre className="text-xs whitespace-pre-wrap break-all mt-1">{errorMsg}</pre>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={status === "uploading"}
        className="self-start flex items-center gap-2"
      >
        {status === "uploading"
          ? <><Loader2 size={14} className="animate-spin" /> {method === "zip" ? `${progress}%` : "Uploading…"}</>
          : "Upload"
        }
      </Button>
    </div>
  );
}
