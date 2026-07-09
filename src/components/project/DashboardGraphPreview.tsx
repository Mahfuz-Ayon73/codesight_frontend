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

  return (
    <>
      <div style={{ height: 420 }}>
        <CodeSightCanvas
          blueprint={blueprint} projectId={projectId} orgId={orgId}
          onEdgeSelect={setEdgeSelection}
        />
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
