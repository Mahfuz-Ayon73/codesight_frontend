"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type OnEdgesDelete,
  type NodeMouseHandler,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { Blueprint } from "@/types/project/project.schema";
import { useD3Layout } from "./useD3Layout";
import { computeClusterRelationships } from "./useClusterRelationships";
import { CLUSTER_COLORS } from "./useD3Layout";
import ClusterGroupNode from "./ClusterGroupNode";
import FileCardNode from "./FileCardNode";
import {
  Layers, FileCode, GitBranch, ArrowLeft, Info, Link2, Unlink,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

interface MutatedNode  { nodeId: string; newClusterId: string; movedAt: number }
interface SeveredEdge  { edgeId: string; source: string; target: string; severedAt: number }
interface UserOverrides {
  projectId: string;
  mutatedNodes: MutatedNode[];
  severedEdges: SeveredEdge[];
  savedAt: number;
}

function loadOverrides(pid: string): UserOverrides {
  try {
    const raw = localStorage.getItem(`codesight_overrides_${pid}`);
    if (raw) return JSON.parse(raw) as UserOverrides;
  } catch { /* ignore */ }
  return { projectId: pid, mutatedNodes: [], severedEdges: [], savedAt: 0 };
}
function saveOverrides(o: UserOverrides) {
  try {
    localStorage.setItem(`codesight_overrides_${o.projectId}`, JSON.stringify({ ...o, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Stable node type map
// ---------------------------------------------------------------------------

const NODE_TYPES = {
  clusterGroup: ClusterGroupNode,
  fileCard:     FileCardNode,
};

// ---------------------------------------------------------------------------
// Inner canvas
// ---------------------------------------------------------------------------

interface InnerProps {
  blueprint:  Blueprint;
  projectId:  string;
  overviewNodes: Node[];
  overviewEdges: Edge[];
  clusterDetails: Map<string, { nodes: Node[]; edges: Edge[] }>;
  clusterFlowDetails: Map<string, { nodes: Node[]; edges: Edge[] }>;
}

function InnerCanvas({
  blueprint, projectId,
  overviewNodes, overviewEdges, clusterDetails, clusterFlowDetails,
}: InnerProps) {
  const { fitView } = useReactFlow();
  const overridesRef = useRef<UserOverrides>(loadOverrides(projectId));

  // Two canvas modes: "overview" shows all clusters; "detail" shows one
  const [mode, setMode]             = useState<"overview" | "detail">("overview");
  const [activeCluster, setActive]  = useState<string | null>(null);
  const [flowActive, setFlowActive] = useState<boolean>(false);
  // Connectivity summary for the active cluster (computed on-demand)
  const [connectivity, setConnectivity] = useState<ReturnType<typeof computeClusterRelationships> | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState(overviewNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(overviewEdges);

  // Apply saved overrides to detail layouts
  const applyOverrides = useCallback(
    (baseNodes: Node[], baseEdges: Edge[]): [Node[], Edge[]] => {
      const overrides  = overridesRef.current;
      const severedIds = new Set(overrides.severedEdges.map((s) => s.edgeId));
      const filteredEdges = baseEdges.filter((e) => !severedIds.has(e.id));
      const patchedNodes  = baseNodes.map((n) => {
        const m = overrides.mutatedNodes.find((x) => x.nodeId === n.id);
        return m ? { ...n, data: { ...n.data, clusterId: m.newClusterId } } : n;
      });
      return [patchedNodes, filteredEdges];
    },
    []
  );

  // Sync canvas nodes/edges reactively based on mode, active cluster, and flow mode
  useEffect(() => {
    if (mode === "overview") {
      setNodes(overviewNodes);
      setEdges(overviewEdges);
      setConnectivity(null);
    } else if (mode === "detail" && activeCluster) {
      const clusterIndex = blueprint.clusters
        .filter((c) => !c.cluster_id.startsWith("shared_dep_"))
        .findIndex((c) => c.cluster_id === activeCluster);
      const colorIndex = ((clusterIndex ?? 0) % CLUSTER_COLORS.length + CLUSTER_COLORS.length) % CLUSTER_COLORS.length;
      const edgeColor  = CLUSTER_COLORS[colorIndex]?.border ?? "rgba(99,102,241,0.50)";

      if (flowActive) {
        // Flow mode: use pre-computed hierarchical DAG layout
        const flowDetail = clusterFlowDetails.get(activeCluster);
        if (!flowDetail) return;

        // Compute connectivity for the summary panel
        const rel = computeClusterRelationships(activeCluster, blueprint, edgeColor, true);
        setConnectivity(rel);

        // Enrich nodes with flow orphan info
        const enrichedNodes = flowDetail.nodes.map((n) => {
          const conn = rel.connectivity.get(n.id);
          if (!conn || n.type !== "fileCard") return n;
          return {
            ...n,
            data: {
              ...n.data,
              isFlowOrphan: conn.isFlowOrphan,
              edgeCount: conn.edgeCount,
              flowActive: true,
            },
          };
        });

        setNodes(enrichedNodes);
        setEdges(flowDetail.edges);
      } else {
        // Structure mode: use force-directed scatter layout
        const detail = clusterDetails.get(activeCluster);
        if (!detail) return;

        const rel = computeClusterRelationships(activeCluster, blueprint, edgeColor, false);
        setConnectivity(rel);

        const enrichedNodes = detail.nodes.map((n) => {
          const conn = rel.connectivity.get(n.id);
          if (!conn) return n;
          return {
            ...n,
            data: {
              ...n.data,
              isOrphan: conn.isOrphan,
              isFlowOrphan: conn.isFlowOrphan,
              edgeCount: conn.edgeCount,
              flowActive: false,
            },
          };
        });

        const [pNodes, pEdges] = applyOverrides(enrichedNodes, rel.edges);
        setNodes(pNodes);
        setEdges(pEdges);
      }
    }
  }, [
    mode,
    activeCluster,
    flowActive,
    overviewNodes,
    overviewEdges,
    clusterDetails,
    clusterFlowDetails,
    blueprint,
    applyOverrides,
    setNodes,
    setEdges,
  ]);

  // Handle fitView automatically when navigation mode changes
  useEffect(() => {
    if (mode === "overview") {
      setTimeout(() => fitView({ padding: 0.14, duration: 450 }), 80);
    } else if (mode === "detail" && activeCluster) {
      setTimeout(() => fitView({ padding: 0.12, duration: 450 }), 80);
    }
  }, [mode, activeCluster, flowActive, fitView]);

  // ------------------------------------------------------------------
  // Open a cluster (drill-down)
  // ------------------------------------------------------------------
  const openCluster = useCallback(
    (clusterId: string) => {
      setFlowActive(false); // Reset flow view when switching clusters
      setActive(clusterId);
      setMode("detail");
    },
    []
  );

  // Return to overview
  const closeCluster = useCallback(() => {
    setActive(null);
    setMode("overview");
  }, []);

  // ------------------------------------------------------------------
  // Click on cluster node in overview → open drill-down
  // ------------------------------------------------------------------
  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (mode === "overview" && node.type === "clusterGroup") {
        openCluster(node.data.clusterId as string);
      }
    },
    [mode, openCluster]
  );

  // ------------------------------------------------------------------
  // Drag-to-recluster (detail mode only)
  // ------------------------------------------------------------------
  const onNodeDragStop = useCallback(
    (_: any, draggedNode: any) => {
      if (mode !== "detail" || draggedNode.type !== "fileCard") return;
      // Find the bg node to determine if drop is inside bounds
      const bgNode = nodes.find((n) => n.id.endsWith("__bg"));
      if (!bgNode) return;
      // In a future multi-cluster detail view, match against multiple containers.
      // For now, the single cluster bg always "owns" its children — nothing to do.
      void draggedNode;
    },
    [mode, nodes]
  );

  // ------------------------------------------------------------------
  // Edge deletion
  // ------------------------------------------------------------------
  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      const overrides = overridesRef.current;
      for (const e of deleted) {
        if (!overrides.severedEdges.find((s) => s.edgeId === e.id)) {
          overrides.severedEdges.push({ edgeId: e.id, source: e.source, target: e.target, severedAt: Date.now() });
        }
      }
      saveOverrides(overrides);
    },
    []
  );

  const onConnect = useCallback(
    (params: Parameters<typeof addEdge>[0]) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const meta = blueprint.project_metadata;

  // Active cluster label for breadcrumb
  const activeLabel = activeCluster
    ? (blueprint.clusters.find((c) => c.cluster_id === activeCluster)?.suggested_title ?? activeCluster)
    : null;

  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden"
      style={{ background: "#080810" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onEdgesDelete={onEdgesDelete}
        deleteKeyCode="Delete"
        fitView
        minZoom={0.05}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
        // Disable selecting / dragging cluster pills in overview
        nodesDraggable={mode === "detail"}
        nodesConnectable={mode === "detail"}
        elementsSelectable={mode === "detail"}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={30}
          size={1}
          color="rgba(255,255,255,0.035)"
        />

        <Controls
          className="bg-zinc-900/80! border-white/10! rounded-xl! shadow-xl!"
          style={{ backdropFilter: "blur(8px)" }}
        />

        {/* Stats + breadcrumb */}
        <Panel position="top-left">
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs"
            style={{
              background:     "rgba(8,8,16,0.88)",
              border:         "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(14px)",
              color:          "rgba(255,255,255,0.55)",
            }}
          >
            {mode === "detail" && (
              <>
                <button
                  onClick={closeCluster}
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <ArrowLeft size={11} />
                  <span className="font-medium">Overview</span>
                </button>
                <span className="text-white/20">/</span>
                <span className="text-white/70 font-medium truncate max-w-[130px] mr-2">{activeLabel}</span>

                {/* Flow / Structure Toggle */}
                <div className="flex items-center bg-zinc-950/60 rounded-lg p-0.5 border border-white/5 ml-1">
                  <button
                    onClick={() => setFlowActive(false)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-150 ${
                      !flowActive
                        ? "bg-indigo-600/85 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Structure
                  </button>
                  <button
                    onClick={() => setFlowActive(true)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-150 ${
                      flowActive
                        ? "bg-cyan-600/85 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Flow
                  </button>
                </div>

                {/* Connectivity inline summary */}
                {connectivity && (
                  <>
                    <span className="text-white/15">|</span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="flex items-center gap-1">
                        <Link2 size={9} className={flowActive ? "text-cyan-400" : "text-emerald-400"} />
                        <span className={flowActive ? "text-cyan-400 font-semibold" : "text-emerald-400 font-semibold"}>
                          {connectivity.connectedCount}
                        </span>
                        <span className="text-white/40">connected</span>
                      </span>
                      {connectivity.orphanCount > 0 && !flowActive && (
                        <span className="flex items-center gap-1">
                          <Unlink size={9} className="text-amber-400" />
                          <span className="text-amber-400 font-semibold">{connectivity.orphanCount}</span>
                          <span className="text-white/40">isolated</span>
                        </span>
                      )}
                      {flowActive && connectivity.edges.length > 0 && (
                        <span className="text-cyan-400/60 font-mono">
                          {connectivity.edges.length} call{connectivity.edges.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {mode === "overview" && (
              <>
                <div className="flex items-center gap-1.5">
                  <Layers size={11} className="text-indigo-400" />
                  <span>{meta.total_clusters} clusters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileCode size={11} className="text-emerald-400" />
                  <span>{meta.total_nodes_indexed} files</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <GitBranch size={11} className="text-zinc-500" />
                  <span>{meta.total_edges} edges</span>
                </div>
              </>
            )}
          </div>
        </Panel>

        {/* Mode hint */}
        <Panel position="top-right">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono"
            style={{
              background:     "rgba(8,8,16,0.88)",
              border:         "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(14px)",
              color:          mode === "overview" ? "rgba(99,102,241,0.85)" : "rgba(16,185,129,0.85)",
            }}
          >
            <Info size={9} />
            {mode === "overview"
              ? "Click a cluster to explore"
              : flowActive ? "Flow mode — only connected files shown" : "Delete key removes edges"}
          </div>
        </Panel>

      </ReactFlow>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

interface Props {
  blueprint: Blueprint;
  projectId: string;
}

export default function CodeSightCanvas({ blueprint, projectId }: Props) {
  const layout = useD3Layout(blueprint);

  if (!layout.ready) {
    return (
      <div
        className="w-full h-full rounded-2xl flex items-center justify-center"
        style={{ background: "#080810", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex flex-col items-center gap-3 text-zinc-600">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-900 border-t-indigo-400 animate-spin" />
          <span className="text-xs font-mono">computing layout…</span>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <InnerCanvas
        blueprint={blueprint}
        projectId={projectId}
        overviewNodes={layout.overviewNodes}
        overviewEdges={layout.overviewEdges}
        clusterDetails={layout.clusterDetails}
        clusterFlowDetails={layout.clusterFlowDetails}
      />
    </ReactFlowProvider>
  );
}
