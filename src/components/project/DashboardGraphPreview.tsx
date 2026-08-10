"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { Blueprint } from "@/types/project/project.schema";
import type { EdgeDiffSelection } from "@/components/canvas/EdgeDiffPanel";

const CodeSightCanvas = dynamic(() => import("@/components/canvas/CodeSightCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a14]">
      <Loader2 size={20} className="animate-spin text-indigo-400" />
    </div>
  ),
});
const EdgeDiffPanel = dynamic(() => import("@/components/canvas/EdgeDiffPanel"), { ssr: false });
const TourCanvas = dynamic(() => import("@/components/canvas/TourCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#08080f]">
      <Loader2 size={20} className="animate-spin text-indigo-400" />
    </div>
  ),
});

export default function DashboardGraphPreview({
  blueprint,
  projectId,
  orgId,
}: {
  blueprint: Blueprint;
  projectId: string;
  orgId?: string;
}) {
  const [edgeSelection, setEdgeSelection] = useState<EdgeDiffSelection | null>(null);
  const [tourOpen, setTourOpen] = useState(false);

  const hasTour = (blueprint.entry_points?.length ?? 0) > 0;

  return (
    <>
      {/* Viewport-relative rather than a fixed 420px: the overlay controls
          stack from the bottom edge and were being clipped by a canvas
          shorter than the panels themselves. Floor keeps it usable on short
          screens; ceiling stops it running away on very tall ones. */}
      <div style={{ height: "clamp(520px, 78vh, 900px)" }} className="relative">
        {tourOpen ? (
          <TourCanvas blueprint={blueprint} onExit={() => setTourOpen(false)} />
        ) : (
          <CodeSightCanvas
            blueprint={blueprint} projectId={projectId} orgId={orgId}
            onEdgeSelect={setEdgeSelection}
            // Rendered inside the canvas's own top-right control stack so it
            // aligns with Export instead of overlapping the breadcrumb.
            onStartTour={hasTour ? () => setTourOpen(true) : undefined}
          />
        )}
      </div>

      {/* Edge relation code view — a separate section below the preview canvas,
          never overlapping or resizing the graph above it. */}
      <EdgeDiffPanel
        selection={edgeSelection}
        organizationId={orgId}
        projectId={projectId}
        onClose={() => setEdgeSelection(null)}
      />
    </>
  );
}
