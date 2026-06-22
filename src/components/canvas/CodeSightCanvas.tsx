"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow, Background, Controls,
  useNodesState, useEdgesState, addEdge,
  type Node, type Edge, type OnEdgesDelete, type NodeMouseHandler,
  ReactFlowProvider, useReactFlow, Panel, BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { Blueprint } from "@/types/project/project.schema";
import {
  buildClusterIndex, layoutClusterPills, layoutFileDetail, layoutFileFlow,
  CLUSTER_COLORS, clamp,
} from "./useD3Layout";
import { computeClusterRelationships } from "./useClusterRelationships";
import ClusterGroupNode from "./ClusterGroupNode";
import FileCardNode from "./FileCardNode";
import { Layers, FileCode, GitBranch, ArrowLeft, Info, Link2, Unlink, ChevronRight } from "lucide-react";

const NODE_TYPES = { clusterGroup: ClusterGroupNode, fileCard: FileCardNode };

// ---------------------------------------------------------------------------
// Overrides persistence
// ---------------------------------------------------------------------------
interface UserOverrides {
  projectId: string;
  severedEdges: { edgeId: string; source: string; target: string }[];
  savedAt: number;
}
function loadOverrides(pid: string): UserOverrides {
  try {
    const raw = localStorage.getItem(`codesight_overrides_${pid}`);
    if (raw) return JSON.parse(raw) as UserOverrides;
  } catch { /* ignore */ }
  return { projectId: pid, severedEdges: [], savedAt: 0 };
}
function saveOverrides(o: UserOverrides) {
  try { localStorage.setItem(`codesight_overrides_${o.projectId}`, JSON.stringify({ ...o, savedAt: Date.now() })); }
  catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Navigation state
// ---------------------------------------------------------------------------
type ViewMode = "cluster-list" | "file-detail";

interface NavEntry {
  clusterId: string | null;  // null = root
  label: string;
}

// ---------------------------------------------------------------------------
// Inner canvas
// ---------------------------------------------------------------------------
function InnerCanvas({ blueprint, projectId }: { blueprint: Blueprint; projectId: string }) {
  const { fitView } = useReactFlow();
  const overridesRef = useRef<UserOverrides>(loadOverrides(projectId));

  // Pre-build the full cluster index once
  const index = useMemo(() => buildClusterIndex(blueprint), [blueprint]);

  // Navigation stack — each entry is the cluster whose *children* we are viewing
  // stack[0] = { clusterId: null, label: "Overview" } = root
  const [navStack, setNavStack] = useState<NavEntry[]>([{ clusterId: null, label: "Overview" }]);
  const currentParentId = navStack[navStack.length - 1].clusterId;

  // View mode: showing cluster pills or files inside a leaf cluster
  const [viewMode, setViewMode] = useState<ViewMode>("cluster-list");
  const [activeLeaf, setActiveLeaf]   = useState<string | null>(null);
  const [flowActive, setFlowActive]   = useState(false);
  const [connectivity, setConnectivity] = useState<ReturnType<typeof computeClusterRelationships> | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // The clusters visible at the current navigation level
  const visibleClusters = useMemo(
    () => (index.childrenOf.get(currentParentId) ?? [])
      .filter((c) => c.id !== "c_global_shared"),
    [index, currentParentId]
  );

  // Color index offset so colours are stable per parent
  const colorOffset = useMemo(
    () => {
      const idx = blueprint.clusters.findIndex((c) => c.id === currentParentId);
      return ((idx < 0 ? 0 : idx) % CLUSTER_COLORS.length);
    },
    [blueprint, currentParentId]
  );

  // Compute inter-cluster edges at the current level
  const levelEdges = useMemo(() => {
    const clusterSet = new Set(visibleClusters.map((c) => c.id));
    // Map each node → which visible cluster it belongs to (via ancestry)
    const nodeToVisible = new Map<string, string>();
    function assign(cid: string, visibleAncestor: string) {
      for (const n of (index.nodesOf.get(cid) ?? [])) nodeToVisible.set(n.id, visibleAncestor);
      for (const child of (index.childrenOf.get(cid) ?? [])) assign(child.id, visibleAncestor);
    }
    for (const c of visibleClusters) assign(c.id, c.id);

    const interPairs = new Map<string, number>();
    for (const e of blueprint.edges) {
      const sc = nodeToVisible.get(e.source);
      const tc = nodeToVisible.get(e.target);
      if (sc && tc && sc !== tc && clusterSet.has(sc) && clusterSet.has(tc)) {
        const key = `${sc}||${tc}`;
        interPairs.set(key, (interPairs.get(key) ?? 0) + e.weight);
      }
    }
    const result: Edge[] = [];
    for (const [key, weight] of interPairs) {
      const [sc, tc] = key.split("||");
      result.push({
        id: `macro-${sc}-${tc}`, source: sc, target: tc, animated: false,
        style: { stroke: "rgba(99,102,241,0.45)", strokeWidth: clamp(weight * 0.15, 1.5, 6) },
        data: { weight, isMacro: true },
      });
    }
    return result;
  }, [visibleClusters, index, blueprint.edges]);

  // ------------------------------------------------------------------
  // Render the current level onto the canvas
  // ------------------------------------------------------------------
  useEffect(() => {
    if (viewMode === "cluster-list") {
      const { nodes: pillNodes } = layoutClusterPills(visibleClusters, index, colorOffset);
      setNodes(pillNodes);
      setEdges(levelEdges);
      setConnectivity(null);
      setTimeout(() => fitView({ padding: 0.12, duration: 400 }), 60);
    } else if (viewMode === "file-detail" && activeLeaf) {
      const cluster = index.clusterById.get(activeLeaf);
      if (!cluster) return;
      const members = index.nodesOf.get(activeLeaf) ?? [];
      const rawCi = blueprint.clusters.findIndex((c) => c.id === activeLeaf);
      const ci = ((rawCi < 0 ? 0 : rawCi) % CLUSTER_COLORS.length + CLUSTER_COLORS.length) % CLUSTER_COLORS.length;
      const edgeColor = CLUSTER_COLORS[ci]?.border ?? "rgba(99,102,241,0.50)";

      if (flowActive) {
        const { nodes: fn, edges: fe } = layoutFileFlow(cluster, members, blueprint.edges, ci);
        const rel = computeClusterRelationships(activeLeaf, blueprint, edgeColor, true);
        setConnectivity(rel);
        setNodes(fn.map((n) => {
          const conn = rel.connectivity.get(n.id);
          return !conn || n.type !== "fileCard" ? n : { ...n, data: { ...n.data, isFlowOrphan: conn.isFlowOrphan, edgeCount: conn.edgeCount, flowActive: true } };
        }));
        setEdges(fe);
      } else {
        const { nodes: dn, edges: de } = layoutFileDetail(cluster, members, blueprint.edges, ci);
        const rel = computeClusterRelationships(activeLeaf, blueprint, edgeColor, false);
        setConnectivity(rel);
        const severedIds = new Set(overridesRef.current.severedEdges.map((s) => s.edgeId));
        setNodes(dn.map((n) => {
          const conn = rel.connectivity.get(n.id);
          return !conn ? n : { ...n, data: { ...n.data, isOrphan: conn.isOrphan, edgeCount: conn.edgeCount, flowActive: false } };
        }));
        setEdges(de.filter((e) => !severedIds.has(e.id)));
      }
      setTimeout(() => fitView({ padding: 0.12, duration: 400 }), 60);
    }
  }, [viewMode, activeLeaf, flowActive, visibleClusters, levelEdges, index, blueprint, colorOffset, fitView, setNodes, setEdges]);

  // ------------------------------------------------------------------
  // Click handler
  // ------------------------------------------------------------------
  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    if (node.type !== "clusterGroup") return;
    const clusterId = node.data.clusterId as string;
    const hasChildren = !!(node.data.hasChildren);

    if (hasChildren) {
      // Drill into children
      const label = (node.data.label as string) || clusterId;
      setNavStack((prev) => [...prev, { clusterId, label }]);
      setViewMode("cluster-list");
      setActiveLeaf(null);
      setFlowActive(false);
    } else {
      // Leaf — show files
      setActiveLeaf(clusterId);
      setViewMode("file-detail");
      setFlowActive(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // Navigate back via breadcrumb
  // ------------------------------------------------------------------
  const goToLevel = useCallback((idx: number) => {
    setNavStack((prev) => prev.slice(0, idx + 1));
    setViewMode("cluster-list");
    setActiveLeaf(null);
    setFlowActive(false);
    setConnectivity(null);
  }, []);

  const goBack = useCallback(() => {
    if (viewMode === "file-detail") {
      setViewMode("cluster-list");
      setActiveLeaf(null);
      setFlowActive(false);
      setConnectivity(null);
    } else if (navStack.length > 1) {
      goToLevel(navStack.length - 2);
    }
  }, [viewMode, navStack, goToLevel]);

  // ------------------------------------------------------------------
  // Edge deletion
  // ------------------------------------------------------------------
  const onEdgesDelete: OnEdgesDelete = useCallback((deleted) => {
    const overrides = overridesRef.current;
    for (const e of deleted) {
      if (!overrides.severedEdges.find((s) => s.edgeId === e.id)) {
        overrides.severedEdges.push({ edgeId: e.id, source: e.source, target: e.target });
      }
    }
    saveOverrides(overrides);
  }, []);

  const onConnect = useCallback(
    (params: Parameters<typeof addEdge>[0]) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const meta           = blueprint.project_metadata;
  const isRoot         = navStack.length === 1 && viewMode === "cluster-list";
  const activeCluster  = activeLeaf ? index.clusterById.get(activeLeaf) : null;
  const canGoBack      = !isRoot || viewMode === "file-detail";

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ background: "#080810" }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgesDelete={onEdgesDelete}
        deleteKeyCode="Delete"
        fitView minZoom={0.03} maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
        nodesDraggable={viewMode === "file-detail"}
        nodesConnectable={viewMode === "file-detail"}
        elementsSelectable={viewMode === "file-detail"}
      >
        <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="rgba(255,255,255,0.035)" />
        <Controls className="bg-zinc-900/80! border-white/10! rounded-xl! shadow-xl!" style={{ backdropFilter: "blur(8px)" }} />

        {/* Breadcrumb + controls */}
        <Panel position="top-left">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs flex-wrap"
            style={{ background: "rgba(8,8,16,0.88)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(14px)", color: "rgba(255,255,255,0.55)" }}
          >
            {/* Back button */}
            {canGoBack && (
              <button onClick={goBack} className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors mr-1">
                <ArrowLeft size={11} />
                <span className="font-medium">Back</span>
              </button>
            )}

            {/* Breadcrumb trail */}
            {navStack.map((entry, idx) => (
              <span key={idx} className="flex items-center gap-1">
                {idx > 0 && <ChevronRight size={9} className="text-white/20" />}
                <button
                  onClick={() => goToLevel(idx)}
                  className={idx === navStack.length - 1 && viewMode === "cluster-list"
                    ? "text-white/80 font-semibold"
                    : "text-white/40 hover:text-white/70 transition-colors"}
                >
                  {entry.label}
                </button>
              </span>
            ))}

            {/* File detail level */}
            {viewMode === "file-detail" && activeCluster && (
              <>
                <ChevronRight size={9} className="text-white/20" />
                <span className="text-white/80 font-semibold truncate max-w-[120px]">
                  {activeCluster.suggested_title ?? activeCluster.name ?? activeLeaf}
                </span>

                {/* Structure / Flow toggle */}
                <div className="flex items-center bg-zinc-950/60 rounded-lg p-0.5 border border-white/5 ml-2">
                  <button onClick={() => setFlowActive(false)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${!flowActive ? "bg-indigo-600/85 text-white" : "text-zinc-400 hover:text-zinc-200"}`}>
                    Structure
                  </button>
                  <button onClick={() => setFlowActive(true)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${flowActive ? "bg-cyan-600/85 text-white" : "text-zinc-400 hover:text-zinc-200"}`}>
                    Flow
                  </button>
                </div>

                {/* Connectivity summary */}
                {connectivity && (
                  <>
                    <span className="text-white/15 ml-1">|</span>
                    <span className="flex items-center gap-1">
                      <Link2 size={9} className={flowActive ? "text-cyan-400" : "text-emerald-400"} />
                      <span className={`font-semibold ${flowActive ? "text-cyan-400" : "text-emerald-400"}`}>{connectivity.connectedCount}</span>
                      <span className="text-white/40">connected</span>
                    </span>
                    {connectivity.orphanCount > 0 && !flowActive && (
                      <span className="flex items-center gap-1">
                        <Unlink size={9} className="text-amber-400" />
                        <span className="text-amber-400 font-semibold">{connectivity.orphanCount}</span>
                        <span className="text-white/40">isolated</span>
                      </span>
                    )}
                  </>
                )}
              </>
            )}

            {/* Root stats */}
            {isRoot && (
              <>
                <span className="text-white/15 mx-1">|</span>
                <span className="flex items-center gap-1.5"><Layers size={11} className="text-indigo-400" />{meta.total_clusters} clusters</span>
                <span className="flex items-center gap-1.5"><FileCode size={11} className="text-emerald-400" />{meta.total_nodes_indexed} files</span>
                <span className="flex items-center gap-1.5"><GitBranch size={11} className="text-zinc-500" />{meta.total_edges} edges</span>
              </>
            )}

            {/* Current level count */}
            {!isRoot && viewMode === "cluster-list" && (
              <>
                <span className="text-white/15 mx-1">|</span>
                <span className="text-white/40">{visibleClusters.length} sub-clusters</span>
              </>
            )}
          </div>
        </Panel>

        {/* Hint */}
        <Panel position="top-right">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono"
            style={{ background: "rgba(8,8,16,0.88)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(14px)",
              color: viewMode === "cluster-list" ? "rgba(99,102,241,0.85)" : "rgba(16,185,129,0.85)" }}>
            <Info size={9} />
            {viewMode === "cluster-list"
              ? "Click a cluster to drill in"
              : flowActive ? "Flow mode — active calls only" : "Delete key removes edges"}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------
export default function CodeSightCanvas({ blueprint, projectId }: { blueprint: Blueprint; projectId: string }) {
  const [ready, setReady] = useState(false);
  const index = useMemo(() => buildClusterIndex(blueprint), [blueprint]);

  useEffect(() => {
    // Index is cheap to build synchronously — just defer one tick for paint
    Promise.resolve().then(() => setReady(true));
  }, [blueprint]);

  if (!ready) {
    return (
      <div className="w-full h-full rounded-2xl flex items-center justify-center"
        style={{ background: "#080810", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex flex-col items-center gap-3 text-zinc-600">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-900 border-t-indigo-400 animate-spin" />
          <span className="text-xs font-mono">preparing canvas…</span>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <InnerCanvas blueprint={blueprint} projectId={projectId} />
    </ReactFlowProvider>
  );
}
