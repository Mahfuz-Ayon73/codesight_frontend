"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { Blueprint } from "@/types/project/project.schema";

const CodeSightCanvas = dynamic(() => import("@/components/canvas/CodeSightCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a14]">
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
  return (
    <div style={{ height: 420 }}>
      <CodeSightCanvas blueprint={blueprint} projectId={projectId} orgId={orgId} />
    </div>
  );
}
