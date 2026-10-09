import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClusterNote } from "@/types/project/project.schema";
import { useClusterNotes } from "./useClusterNotes";

const firstNote: ClusterNote = {
  id: 1,
  clusterId: "cluster-a",
  content: "First note",
  authorId: "user-a",
  authorName: "User A",
  createdAt: "2026-10-07T09:00:00",
};

const secondNote: ClusterNote = {
  ...firstNote,
  id: 2,
  content: "A collaborator added this",
  authorId: "user-b",
  authorName: "User B",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useClusterNotes", () => {
  it("reloads persisted notes when a collaborator returns to the window", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ snapshotId: "snapshot-1" }))
      .mockResolvedValueOnce(jsonResponse([firstNote]))
      .mockResolvedValueOnce(jsonResponse([firstNote, secondNote]));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useClusterNotes("org-1", "project-1"));

    await waitFor(() => expect(result.current.notesByCluster.get("cluster-a")).toEqual([firstNote]));
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(result.current.notesByCluster.get("cluster-a")).toEqual([firstNote, secondNote]));

    expect(fetchMock.mock.calls[1][1]).toMatchObject({ cache: "no-store" });
  });

  it("returns save success only after the backend has persisted the note", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ snapshotId: "snapshot-1" }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(firstNote));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useClusterNotes("org-1", "project-1"));
    await waitFor(() => expect(result.current.snapshotReady).toBe(true));

    let saved = false;
    await act(async () => {
      saved = await result.current.addNote("cluster-a", " First note ");
    });

    expect(saved).toBe(true);
    expect(result.current.notesByCluster.get("cluster-a")).toEqual([firstNote]);
    expect(fetchMock.mock.calls[2][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ snapshotId: "snapshot-1", clusterId: "cluster-a", content: "First note" }),
    });
  });

  it("keeps a failed note available for retry", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ snapshotId: "snapshot-1" }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ message: "failed" }, 500));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useClusterNotes("org-1", "project-1"));
    await waitFor(() => expect(result.current.snapshotReady).toBe(true));

    let saved = true;
    await act(async () => {
      saved = await result.current.addNote("cluster-a", "First note");
    });

    expect(saved).toBe(false);
    expect(result.current.error).toBe("Failed to save the note.");
    expect(result.current.notesByCluster.get("cluster-a")).toBeUndefined();
  });
});
