"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow, Background, Controls,
  useNodesState, useEdgesState, addEdge,
  type Node, type Edge, type OnEdgesDelete, type NodeMouseHandler, type EdgeMouseHandler,
  ReactFlowProvider, useReactFlow, Panel, BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { Blueprint, BlueprintNode } from "@/types/project/project.schema";
import {
  buildClusterIndex, layoutClusterPills, layoutFileDetail, layoutFileFlow,
  CLUSTER_COLORS, clamp, EDGE_TYPE_COLORS, DEFAULT_EDGE_FILTERS, type EdgeFilterOptions,
} from "./useD3Layout";
import { computeClusterRelationships } from "./useClusterRelationships";
import { clusterDomainKey, formatDomainLabel, getDomainStyle, UNCLASSIFIED_DOMAIN_KEY } from "./domainStyles";
import ClusterGroupNode from "./ClusterGroupNode";
import FileCardNode from "./FileCardNode";
import EdgeFilterPanel from "./EdgeFilterPanel";
import DomainFilterPanel from "./DomainFilterPanel";
import CodeViewerPanel from "./CodeViewerPanel";
import { type EdgeDiffSelection } from "./EdgeDiffPanel";
import {
  useClusterMerges, applyMerges, suggestMerges, type ClusterMerge,
} from "./useClusterMerges";
import { exportCanvasAsPng, exportGraphAsDrawio } from "./exportGraph";
import {
  Layers, FileCode, GitBranch, ArrowLeft, Info, Link2, Unlink,
  ChevronRight, ChevronLeft, GitMerge, Sparkles, Check, X, Tag,
  Download, Image as ImageIcon,
} from "lucide-react";

const NODE_TYPES = { clusterGroup: ClusterGroupNode, fileCard: FileCardNode };

// ---------------------------------------------------------------------------
// Overrides persistence (localStorage — for severed edges)
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
  clusterId: string | null;  // null = root; merge id = merged group
  label: string;
  isMergedGroup?: boolean;   // true when this level shows original clusters inside a merge
  sourceIds?: string[];      // only set when isMergedGroup = true
}

// ---------------------------------------------------------------------------
// Inner canvas
// ---------------------------------------------------------------------------
function InnerCanvas({
  blueprint, projectId, orgId, onEdgeSelect,
}: {
  blueprint: Blueprint;
  projectId: string;
  orgId?: string;
  onEdgeSelect?: (selection: EdgeDiffSelection | null) => void;
}) {
  const { fitView, getNodes, getEdges } = useReactFlow();
  const overridesRef = useRef<UserOverrides>(loadOverrides(projectId));
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // Pre-build the full cluster index once
  const index = useMemo(() => buildClusterIndex(blueprint), [blueprint]);

  // Navigation stack
  const [navStack, setNavStack] = useState<NavEntry[]>([{ clusterId: null, label: "Overview" }]);
  const currentEntry    = navStack[navStack.length - 1];
  const currentParentId = currentEntry.clusterId;

  // View mode: cluster pills or files inside a leaf
  const [viewMode, setViewMode]       = useState<ViewMode>("cluster-list");
  const [activeLeaf, setActiveLeaf]   = useState<string | null>(null);
  const [flowActive, setFlowActive]   = useState(false);
  const [showAllFlowEdges, setShowAllFlowEdges] = useState(true);
  const [selectedFlowEntry, setSelectedFlowEntry] = useState<string | null>(null);

  // Reset flow-trace selection whenever flow mode is toggled off or the leaf changes
  useEffect(() => {
    if (!flowActive) { setSelectedFlowEntry(null); setShowAllFlowEdges(true); }
  }, [flowActive]);
  useEffect(() => { setSelectedFlowEntry(null); }, [activeLeaf]);
  const [connectivity, setConnectivity] = useState<ReturnType<typeof computeClusterRelationships> | null>(null);
  // File node clicked in structure/flow view — opens the code preview panel.
  const [selectedFileNode, setSelectedFileNode] = useState<BlueprintNode | null>(null);

  // Fast id → node lookup for edge-click resolution.
  const nodeById = useMemo(() => new Map(blueprint.nodes.map((n) => [n.id, n])), [blueprint.nodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Multi-select state (shift-click)
  const [selectedClusterIds, setSelectedClusterIds] = useState<Set<string>>(new Set());
  // Smart Merge panel
  const [showMergePanel, setShowMergePanel]   = useState(false);
  // Pending merge name prompt (null = hidden, string = name being typed)
  const [pendingMergeName, setPendingMergeName] = useState<string | null>(null);
  // Collapsible right sidebar — auto-opens the first time you drill into a merged
  // group. Once the user manually toggles it, we stop overriding their choice —
  // otherwise every re-entry into a merged group snaps it back open.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarManuallyToggledRef = useRef(false);
  // Edge type/count filters — keeps large, densely-connected codebases from
  // rendering hundreds of macro edges at once.
  const [edgeFilters, setEdgeFilters] = useState<EdgeFilterOptions>(DEFAULT_EDGE_FILTERS);
  // Domain spotlight filter (empty = show all) + domain-based pill coloring.
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [colorByDomain, setColorByDomain]     = useState(false);

  // Merge persistence
  const { merges, addMerge, removeMerge } = useClusterMerges(orgId ?? "", projectId);

  // ---------------------------------------------------------------------------
  // Visible clusters — respects merged-group nav entries
  // ---------------------------------------------------------------------------
  const visibleClusters = useMemo(() => {
    if (currentEntry.isMergedGroup && currentEntry.sourceIds) {
      return currentEntry.sourceIds
        .map((id) => index.clusterById.get(id))
        .filter((c): c is NonNullable<typeof c> => c != null);
    }
    return (index.childrenOf.get(currentParentId) ?? [])
      .filter((c) => c.id !== "c_global_shared");
  }, [index, currentParentId, currentEntry]);

  // Color index offset
  const colorOffset = useMemo(() => {
    const idx = blueprint.clusters.findIndex((c) => c.id === currentParentId);
    return ((idx < 0 ? 0 : idx) % CLUSTER_COLORS.length);
  }, [blueprint, currentParentId]);

  // Inter-cluster edges at the current level. Filters out noisy edge types/dead
  // imports up front (per edgeFilters), and tracks a per-pair dominant type so
  // macro edges can be colored by relationship kind instead of a flat color.
  // Left uncapped — suggestMerges/applyMerges need the full picture; the display
  // cap is applied later (see displayEdges) on the post-merge edge set.
  const levelEdges = useMemo(() => {
    const clusterSet = new Set(visibleClusters.map((c) => c.id));
    const nodeToVisible = new Map<string, string>();
    function assign(cid: string, visibleAncestor: string) {
      for (const n of (index.nodesOf.get(cid) ?? [])) nodeToVisible.set(n.id, visibleAncestor);
      for (const child of (index.childrenOf.get(cid) ?? [])) assign(child.id, visibleAncestor);
    }
    for (const c of visibleClusters) assign(c.id, c.id);

    const typeVisible = (type: string) => {
      if (type === "RENDERS") return edgeFilters.showRenders;
      if (type === "BELONGS_TO_DOMAIN") return edgeFilters.showBelongsToDomain;
      if (type === "SEMANTIC_SIMILARITY") return edgeFilters.showSemanticSimilarity;
      return true;
    };

    const interPairs = new Map<string, number>();
    const byType = new Map<string, Map<string, number>>();
    for (const e of blueprint.edges) {
      if (e.is_dead_import && !edgeFilters.showDeadImports) continue;
      if (!typeVisible(e.type)) continue;
      const sc = nodeToVisible.get(e.source);
      const tc = nodeToVisible.get(e.target);
      if (sc && tc && sc !== tc && clusterSet.has(sc) && clusterSet.has(tc)) {
        const key = `${sc}||${tc}`;
        interPairs.set(key, (interPairs.get(key) ?? 0) + e.weight);
        const types = byType.get(key) ?? new Map<string, number>();
        types.set(e.type, (types.get(e.type) ?? 0) + e.weight);
        byType.set(key, types);
      }
    }
    const result: Edge[] = [];
    for (const [key, weight] of interPairs) {
      const [sc, tc] = key.split("||");
      const types = byType.get(key);
      let dominantType = "BELONGS_TO_DOMAIN";
      let bestWeight = -Infinity;
      for (const [type, w] of types ?? []) {
        if (w > bestWeight) { bestWeight = w; dominantType = type; }
      }
      const color = EDGE_TYPE_COLORS[dominantType as keyof typeof EDGE_TYPE_COLORS] ?? "rgba(99,102,241,0.45)";
      result.push({
        id: `macro-${sc}-${tc}`, source: sc, target: tc, animated: false,
        style: { stroke: color, strokeWidth: clamp(weight * 0.15, 1.5, 6) },
        data: { weight, isMacro: true, dominantType },
      });
    }
    return result;
  }, [visibleClusters, index, blueprint.edges, edgeFilters]);

  // When drilled inside a merged group, suppress that group's own merge so source clusters show individually
  const activeMerges = useMemo(() => {
    if (currentEntry.isMergedGroup && currentEntry.sourceIds) {
      const sourceSet = new Set(currentEntry.sourceIds);
      return merges.filter((m) => !m.sourceIds.every((sid) => sourceSet.has(sid)));
    }
    return merges;
  }, [merges, currentEntry]);

  // Auto-open sidebar when entering a merged group, close when leaving —
  // but only until the user manually toggles it, so a manual collapse sticks.
  useEffect(() => {
    if (sidebarManuallyToggledRef.current) return;
    setSidebarOpen(!!currentEntry.isMergedGroup);
  }, [currentEntry.isMergedGroup]);

  // Apply merges → virtual clusters + edges
  const { virtualClusters, virtualEdges, fileCountOverride } = useMemo(
    () => applyMerges(visibleClusters, levelEdges, activeMerges, index),
    [visibleClusters, levelEdges, activeMerges, index]
  );

  // Cap the final, post-merge edge set actually rendered — this is what keeps
  // large, densely-connected codebases from lagging. Applied after merges so
  // consolidating clusters (existing feature) naturally reduces what gets cut.
  const { displayEdges, hiddenEdgeCount } = useMemo(() => {
    if (viewMode !== "cluster-list" || virtualEdges.length <= edgeFilters.overviewMaxEdges) {
      return { displayEdges: virtualEdges, hiddenEdgeCount: 0 };
    }
    const sorted = [...virtualEdges].sort(
      (a, b) => ((b.data?.weight as number) ?? 0) - ((a.data?.weight as number) ?? 0)
    );
    return {
      displayEdges: sorted.slice(0, edgeFilters.overviewMaxEdges),
      hiddenEdgeCount: sorted.length - edgeFilters.overviewMaxEdges,
    };
  }, [viewMode, virtualEdges, edgeFilters.overviewMaxEdges]);

  // Smart merge suggestions (computed only when panel is open)
  const suggestions = useMemo(() => {
    if (!showMergePanel) return [];
    return suggestMerges(levelEdges, visibleClusters);
  }, [showMergePanel, levelEdges, visibleClusters]);

  // Domain key per visible (post-merge) cluster — drives spotlight filtering.
  const domainKeyByClusterId = useMemo(
    () => new Map(virtualClusters.map((c) => [c.id, clusterDomainKey(c)])),
    [virtualClusters]
  );

  // ---------------------------------------------------------------------------
  // Render the current level onto the canvas
  // ---------------------------------------------------------------------------
  const mergeById = useMemo(() => new Map(activeMerges.map((m) => [m.id, m])), [activeMerges]);

  // Cluster-list NODE positions — deliberately does not depend on edges or
  // domain filters, so toggling either panel doesn't retrigger the d3 force
  // simulation or re-fit the view (positions haven't changed, only styling).
  const baseNodes = useMemo<Node[]>(() => {
    if (viewMode !== "cluster-list") return [];
    const { nodes: pillNodes } = layoutClusterPills(virtualClusters, index, colorOffset, fileCountOverride);

    // Enrich nodes with merge/selection data
    const inMergedGroup = !!currentEntry.isMergedGroup;
    return pillNodes.map((n) => {
      const cid = n.data.clusterId as string;
      const merge = mergeById.get(cid);
      return {
        ...n,
        data: {
          ...n.data,
          isMultiSelected: selectedClusterIds.has(cid),
          isMerged:    !!merge,
          mergedCount: merge?.sourceIds.length,
          onUnmerge:   merge ? removeMerge : undefined,
          hideName:    inMergedGroup,
        },
      };
    });
  }, [viewMode, virtualClusters, index, colorOffset, fileCountOverride, mergeById, selectedClusterIds, removeMerge, currentEntry.isMergedGroup]);

  // Re-fit only when the layout itself changed, not on styling passes.
  useEffect(() => {
    if (viewMode !== "cluster-list") return;
    const t = setTimeout(() => fitView({ padding: 0.12, duration: 400 }), 60);
    return () => clearTimeout(t);
  }, [viewMode, baseNodes, fitView]);

  // Domain styling pass — recolors/dims the laid-out pills without touching
  // positions (same trick as the edge-filter split below).
  useEffect(() => {
    if (viewMode !== "cluster-list") return;
    const filterActive = selectedDomains.size > 0;
    if (!filterActive && !colorByDomain) { setNodes(baseNodes); return; }
    setNodes(baseNodes.map((n) => {
      const domain = (n.data.domain as string | null) ?? null;
      const key = domainKeyByClusterId.get(n.data.clusterId as string) ?? UNCLASSIFIED_DOMAIN_KEY;
      const dimmed = filterActive && !selectedDomains.has(key);
      const ds = colorByDomain ? getDomainStyle(domain) : null;
      return {
        ...n,
        data: {
          ...n.data,
          dimmed,
          ...(ds ? { colorBg: ds.pillBg, colorBorder: ds.pillBorder } : {}),
        },
      };
    }));
  }, [viewMode, baseNodes, selectedDomains, colorByDomain, domainKeyByClusterId, setNodes]);

  // Cluster-list EDGES — split out so edge-filter/cap changes are just a cheap
  // setEdges, not a full re-layout. Edges touching a domain-dimmed cluster fade
  // with it so the spotlight reads cleanly.
  useEffect(() => {
    if (viewMode !== "cluster-list") return;
    if (selectedDomains.size === 0) { setEdges(displayEdges); return; }
    setEdges(displayEdges.map((e) => {
      const inSpotlight =
        selectedDomains.has(domainKeyByClusterId.get(e.source) ?? UNCLASSIFIED_DOMAIN_KEY) &&
        selectedDomains.has(domainKeyByClusterId.get(e.target) ?? UNCLASSIFIED_DOMAIN_KEY);
      return inSpotlight ? e : { ...e, style: { ...e.style, opacity: 0.06 } };
    }));
  }, [viewMode, displayEdges, selectedDomains, domainKeyByClusterId, setEdges]);

  // File-detail (structure/flow) — unchanged from before, just no longer shares
  // an effect with the cluster-list branch.
  useEffect(() => {
    if (viewMode !== "file-detail" || !activeLeaf) return;
    setSelectedFileNode(null);
    onEdgeSelect?.(null);
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

      // Build reachable-node set from the selected entry (BFS over active edges)
      const reachableFromEntry = new Set<string>();
      if (!showAllFlowEdges && selectedFlowEntry) {
        const memberSet = new Set(members.map((m) => m.id));
        const activeEdges = blueprint.edges.filter(
          (e) => memberSet.has(e.source) && memberSet.has(e.target) && !e.is_dead_import
        );
        const adjFwd = new Map<string, string[]>();
        for (const e of activeEdges) {
          const arr = adjFwd.get(e.source) ?? []; arr.push(e.target); adjFwd.set(e.source, arr);
        }
        const bfsQueue = [selectedFlowEntry];
        reachableFromEntry.add(selectedFlowEntry);
        while (bfsQueue.length) {
          const cur = bfsQueue.shift()!;
          for (const next of adjFwd.get(cur) ?? []) {
            if (!reachableFromEntry.has(next)) { reachableFromEntry.add(next); bfsQueue.push(next); }
          }
        }
      }

      setNodes(fn.map((n) => {
        const conn = rel.connectivity.get(n.id);
        const base = !conn || n.type !== "fileCard" ? n : {
          ...n, data: { ...n.data, isFlowOrphan: conn.isFlowOrphan, edgeCount: conn.edgeCount, flowActive: true },
        };
        if (n.type !== "fileCard") return base;
        const dimmed = !showAllFlowEdges && selectedFlowEntry && !reachableFromEntry.has(n.id);
        return {
          ...base,
          data: {
            ...base.data,
            showAllEdges: showAllFlowEdges,
            isSelectedEntry: n.id === selectedFlowEntry,
            onSelectFlow: () => setSelectedFlowEntry((prev) => prev === n.id ? null : n.id),
            ...(dimmed ? { isFlowOrphan: true } : {}),
          },
        };
      }));

      // Filter edges to only those on paths from selected entry when not showing all
      const filteredEdges = (!showAllFlowEdges && selectedFlowEntry)
        ? fe.filter((e) => reachableFromEntry.has(e.source) && reachableFromEntry.has(e.target))
        : fe;
      setEdges(filteredEdges);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, activeLeaf, flowActive, showAllFlowEdges, selectedFlowEntry, index, blueprint, colorOffset, fitView, setNodes, setEdges, onEdgeSelect]);

  // ---------------------------------------------------------------------------
  // Click handler
  // ---------------------------------------------------------------------------
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    if (node.type === "fileCard") {
      setSelectedFileNode(node.data as unknown as BlueprintNode);
      return;
    }
    if (node.type !== "clusterGroup") return;
    const clusterId = node.data.clusterId as string;

    // Shift-click = multi-select toggle (cluster-list mode only)
    if ((event as React.MouseEvent).shiftKey && viewMode === "cluster-list") {
      setSelectedClusterIds((prev) => {
        const next = new Set(prev);
        if (next.has(clusterId)) next.delete(clusterId); else next.add(clusterId);
        return next;
      });
      return;
    }

    // Clear selection on normal click
    setSelectedClusterIds(new Set());
    setShowMergePanel(false);

    // Merged group → drill into its source clusters
    const merge = mergeById.get(clusterId);
    if (merge) {
      const label = (node.data.label as string) || merge.label;
      setNavStack((prev) => [...prev, { clusterId, label, isMergedGroup: true, sourceIds: merge.sourceIds }]);
      setViewMode("cluster-list");
      setActiveLeaf(null);
      setFlowActive(false);
      setSelectedDomains(new Set()); // domains differ per level — stale selection dims everything
      return;
    }

    const hasChildren = !!(node.data.hasChildren);
    if (hasChildren) {
      const label = (node.data.label as string) || clusterId;
      setNavStack((prev) => [...prev, { clusterId, label }]);
      setViewMode("cluster-list");
      setActiveLeaf(null);
      setFlowActive(false);
      setSelectedDomains(new Set());
    } else {
      setActiveLeaf(clusterId);
      setViewMode("file-detail");
      setFlowActive(false);
    }
  }, [viewMode, mergeById]);

  const onEdgeClick: EdgeMouseHandler = useCallback((_event, edge) => {
    if (!flowActive) return;
    const d = edge.data as Record<string, unknown> | undefined;
    if (!d) return;
    const sourceNode = nodeById.get(d.source as string);
    const targetNode = nodeById.get(d.target as string);
    if (!sourceNode || !targetNode) return;
    setSelectedFileNode(null);
    onEdgeSelect?.({
      sourceNode, targetNode,
      sourceLine: (d.sourceLine as number | null | undefined) ?? null,
      targetLine: (d.targetLine as number | null | undefined) ?? null,
      edgeType: (d.type as string) ?? "BELONGS_TO_DOMAIN",
      binding: d.binding as string | undefined,
      calledNames: d.calledNames as string[] | undefined,
    });
  }, [flowActive, nodeById, onEdgeSelect]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const goToLevel = useCallback((idx: number) => {
    setNavStack((prev) => prev.slice(0, idx + 1));
    setViewMode("cluster-list");
    setActiveLeaf(null);
    setFlowActive(false);
    setConnectivity(null);
    setSelectedClusterIds(new Set());
    setSelectedDomains(new Set());
    setShowMergePanel(false);
    setSelectedFileNode(null);
    onEdgeSelect?.(null);
  }, [onEdgeSelect]);

  const goBack = useCallback(() => {
    if (viewMode === "file-detail") {
      setViewMode("cluster-list");
      setActiveLeaf(null);
      setFlowActive(false);
      setConnectivity(null);
      setSelectedFileNode(null);
      onEdgeSelect?.(null);
    } else if (navStack.length > 1) {
      goToLevel(navStack.length - 2);
    }
  }, [viewMode, navStack, goToLevel, onEdgeSelect]);

  // ---------------------------------------------------------------------------
  // Merge actions
  // ---------------------------------------------------------------------------
  const handleMergeSelected = useCallback(() => {
    if (selectedClusterIds.size < 2) return;
    // Pre-fill name from selected cluster titles
    const autoName = [...selectedClusterIds]
      .map((id) => index.clusterById.get(id)?.suggested_title ?? index.clusterById.get(id)?.name ?? id)
      .join(" + ");
    setPendingMergeName(autoName);
  }, [selectedClusterIds, index]);

  const confirmMerge = useCallback(() => {
    if (pendingMergeName === null) return;
    const sourceIds = [...selectedClusterIds];
    const label = pendingMergeName.trim() ||
      sourceIds.map((id) => index.clusterById.get(id)?.suggested_title ?? id).join(" + ");
    addMerge({ id: `__merge__${crypto.randomUUID()}`, label, sourceIds });
    setSelectedClusterIds(new Set());
    setPendingMergeName(null);
  }, [pendingMergeName, selectedClusterIds, index, addMerge]);

  const applySuggestion = useCallback((suggestion: ClusterMerge) => {
    addMerge(suggestion);
  }, [addMerge]);

  // ---------------------------------------------------------------------------
  // Edge deletion
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Export — current view only (whatever level/mode is on screen right now)
  // ---------------------------------------------------------------------------
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportPng = useCallback(async () => {
    const viewportEl = canvasWrapperRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!viewportEl) return;
    setExporting(true);
    try {
      await exportCanvasAsPng(viewportEl, getNodes(), `codesight-${projectId}.png`);
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  }, [getNodes, projectId]);

  const handleExportDrawio = useCallback(() => {
    exportGraphAsDrawio(getNodes(), getEdges(), `codesight-${projectId}.drawio`);
    setExportOpen(false);
  }, [getNodes, getEdges, projectId]);

  const meta           = blueprint.project_metadata;
  const isRoot         = navStack.length === 1 && viewMode === "cluster-list";
  const activeCluster  = activeLeaf ? index.clusterById.get(activeLeaf) : null;
  const canGoBack      = !isRoot;
  const mergesActive   = !!orgId;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden flex flex-col" style={{ background: "#080810" }}>
      <div className="relative flex-1 min-h-0" ref={canvasWrapperRef}>
      <ReactFlow
        nodes={nodes} edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
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
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs flex-wrap overflow-hidden"
            style={{ background: "rgba(8,8,16,0.88)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(14px)", color: "rgba(255,255,255,0.55)", maxWidth: "min(56vw, 620px)" }}
          >
            {canGoBack && (
              <button onClick={goBack} className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors mr-1 shrink-0">
                <ArrowLeft size={11} />
                <span className="font-medium">Back</span>
              </button>
            )}

            {navStack.map((entry, idx) => (
              <span key={idx} className="flex items-center gap-1 min-w-0">
                {idx > 0 && <ChevronRight size={9} className="text-white/20 shrink-0" />}
                <button
                  onClick={() => goToLevel(idx)}
                  title={entry.label}
                  className={`truncate max-w-[160px] ${idx === navStack.length - 1 && viewMode === "cluster-list"
                    ? "text-white/80 font-semibold"
                    : "text-white/40 hover:text-white/70 transition-colors"}`}
                >
                  {entry.label}
                </button>
              </span>
            ))}

            {viewMode === "file-detail" && activeCluster && (
              <>
                <ChevronRight size={9} className="text-white/20" />
                <span className="text-white/80 font-semibold truncate max-w-[120px]">
                  {activeCluster.suggested_title ?? activeCluster.name ?? activeLeaf}
                </span>

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

                {/* Show-all-edges toggle — only visible in flow mode */}
                {flowActive && (
                  <label
                    className="flex items-center gap-1.5 ml-1 cursor-pointer select-none"
                    title="When unchecked, click 'trace flow' on any entry node to highlight its paths"
                  >
                    <div
                      onClick={() => { setShowAllFlowEdges((v) => !v); setSelectedFlowEntry(null); }}
                      className="w-3.5 h-3.5 rounded flex items-center justify-center transition-all"
                      style={{
                        background: showAllFlowEdges ? "rgba(6,182,212,0.8)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${showAllFlowEdges ? "rgba(6,182,212,0.9)" : "rgba(255,255,255,0.15)"}`,
                      }}
                    >
                      {showAllFlowEdges && (
                        <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                          <path d="M1 2.5L2.8 4.2L6 1" stroke="white" strokeWidth="1.4"
                                strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[10px] text-white/50">all edges</span>
                  </label>
                )}

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

            {isRoot && (
              <>
                <span className="text-white/15 mx-1">|</span>
                <span className="flex items-center gap-1.5"><Layers size={11} className="text-indigo-400" />{virtualClusters.length} clusters</span>
                <span className="flex items-center gap-1.5"><FileCode size={11} className="text-emerald-400" />{meta.total_nodes_indexed} files</span>
                <span className="flex items-center gap-1.5"><GitBranch size={11} className="text-zinc-500" />{meta.total_edges} edges</span>
                {(meta.detected_domains?.length ?? 0) > 0 && (
                  <span className="flex items-center gap-1.5"><Tag size={11} className="text-amber-400" />{meta.detected_domains!.length} domains</span>
                )}
              </>
            )}

            {!isRoot && viewMode === "cluster-list" && (
              <>
                <span className="text-white/15 mx-1">|</span>
                <span className="text-white/40">
                  {virtualClusters.length} {currentEntry.isMergedGroup ? "clusters" : "sub-clusters"}
                </span>
                {currentEntry.isMergedGroup && (
                  <span className="flex items-center gap-1 text-indigo-400/70">
                    <GitMerge size={9} />
                    <span className="text-[9px]">merged group</span>
                  </span>
                )}
              </>
            )}
          </div>
        </Panel>

        {/* Top-right: export, hint + merge controls */}
        <Panel position="top-right">
          <div className="flex flex-col items-end gap-2">

            {/* Export current view — PNG snapshot or editable draw.io XML */}
            <div className="relative">
              <button
                onClick={() => setExportOpen((v) => !v)}
                disabled={exporting}
                title="Export the current view"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all disabled:opacity-50"
                style={{
                  background:     exportOpen ? "rgba(99,102,241,0.20)" : "rgba(8,8,16,0.88)",
                  border:         `1px solid ${exportOpen ? "rgba(99,102,241,0.45)" : "rgba(255,255,255,0.07)"}`,
                  backdropFilter: "blur(14px)",
                  color:          exportOpen ? "rgba(165,180,252,0.95)" : "rgba(255,255,255,0.40)",
                }}
              >
                <Download size={9} />
                {exporting ? "Exporting…" : "Export"}
              </button>

              {exportOpen && (
                <div
                  className="absolute top-full mt-1.5 right-0 flex flex-col gap-0.5 py-1.5 rounded-xl min-w-[172px] z-50"
                  style={{ background: "rgba(8,8,16,0.96)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(14px)" }}
                >
                  <button
                    onClick={handleExportPng}
                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-white/70 hover:bg-white/5 hover:text-white transition-colors text-left"
                  >
                    <ImageIcon size={11} className="text-emerald-400" /> PNG image
                  </button>
                  <button
                    onClick={handleExportDrawio}
                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-white/70 hover:bg-white/5 hover:text-white transition-colors text-left"
                  >
                    <FileCode size={11} className="text-indigo-400" /> draw.io XML
                  </button>
                </div>
              )}
            </div>

            {/* Merge-selected prompt */}
            {pendingMergeName !== null && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]"
                style={{ background: "rgba(8,8,16,0.95)", border: "1px solid rgba(99,102,241,0.40)", backdropFilter: "blur(14px)" }}>
                <input
                  autoFocus
                  value={pendingMergeName}
                  onChange={(e) => setPendingMergeName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmMerge(); if (e.key === "Escape") setPendingMergeName(null); }}
                  placeholder="Merge group name…"
                  className="bg-transparent outline-none text-white/80 w-44 placeholder:text-white/25"
                />
                <button onClick={confirmMerge} className="text-indigo-400 hover:text-indigo-300 transition-colors" title="Confirm merge">
                  <Check size={12} />
                </button>
                <button onClick={() => setPendingMergeName(null)} className="text-white/30 hover:text-white/60 transition-colors" title="Cancel">
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Smart Merge suggestion panel */}
            {showMergePanel && (
              <div className="flex flex-col gap-2 px-3 py-2.5 rounded-xl max-w-xs"
                style={{ background: "rgba(8,8,16,0.95)", border: "1px solid rgba(99,102,241,0.25)", backdropFilter: "blur(14px)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">Smart Merge</span>
                  <button onClick={() => setShowMergePanel(false)} className="text-white/25 hover:text-white/60 transition-colors">
                    <X size={10} />
                  </button>
                </div>
                {suggestions.length === 0 ? (
                  <p className="text-[10px] text-white/30 italic">No strongly-connected pairs found at current threshold.</p>
                ) : (
                  suggestions.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 py-1 border-t border-white/5">
                      <span className="flex-1 text-[10px] text-white/60 truncate">{s.label}</span>
                      <span className="text-[9px] font-mono text-white/25 shrink-0">{s.sourceIds.length} clusters</span>
                      <button
                        onClick={() => { applySuggestion(s); }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-semibold transition-all shrink-0"
                        style={{ background: "rgba(99,102,241,0.20)", border: "1px solid rgba(99,102,241,0.35)", color: "rgba(165,180,252,0.9)" }}
                      >
                        <GitMerge size={8} /> Merge
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Merge-selected bar (appears when 2+ clusters selected) */}
            {mergesActive && viewMode === "cluster-list" && selectedClusterIds.size >= 2 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px]"
                style={{ background: "rgba(8,8,16,0.92)", border: "1px solid rgba(99,102,241,0.35)", backdropFilter: "blur(14px)" }}>
                <GitMerge size={10} className="text-indigo-400" />
                <span className="text-white/60">{selectedClusterIds.size} selected</span>
                <button
                  onClick={handleMergeSelected}
                  className="px-2 py-0.5 rounded-lg font-semibold transition-all"
                  style={{ background: "rgba(99,102,241,0.25)", color: "rgba(165,180,252,0.95)" }}
                >
                  Merge
                </button>
                <button onClick={() => setSelectedClusterIds(new Set())} className="text-white/25 hover:text-white/60 transition-colors ml-1">
                  <X size={9} />
                </button>
              </div>
            )}

            {/* Hint + Smart Merge toggle */}
            <div className="flex items-center gap-2">
              {mergesActive && viewMode === "cluster-list" && (
                <button
                  onClick={() => { setShowMergePanel((v) => !v); setSelectedClusterIds(new Set()); }}
                  title="Suggest cluster merges based on edge density"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
                  style={{
                    background:     showMergePanel ? "rgba(99,102,241,0.20)" : "rgba(8,8,16,0.88)",
                    border:         `1px solid ${showMergePanel ? "rgba(99,102,241,0.45)" : "rgba(255,255,255,0.07)"}`,
                    backdropFilter: "blur(14px)",
                    color:          showMergePanel ? "rgba(165,180,252,0.95)" : "rgba(255,255,255,0.40)",
                  }}
                >
                  <Sparkles size={9} />
                  Smart Merge
                </button>
              )}

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono"
                style={{ background: "rgba(8,8,16,0.88)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(14px)",
                  color: viewMode === "cluster-list" ? "rgba(99,102,241,0.85)" : "rgba(16,185,129,0.85)" }}>
                <Info size={9} />
                {viewMode === "cluster-list"
                  ? (selectedClusterIds.size > 0 ? "Shift-click to select · Merge to combine" : "Click to drill in · Shift-click to select")
                  : flowActive ? "Flow mode — active calls only" : "Delete key removes edges"}
              </div>
            </div>
          </div>
        </Panel>

        {/* Edge type/count filters — keeps dense codebases from lagging under too many edges */}
        <Panel position="bottom-right">
          <div className="flex flex-col items-end gap-1.5">
            {viewMode === "cluster-list" && (
              <DomainFilterPanel
                clusters={virtualClusters}
                selected={selectedDomains}
                onSelectedChange={setSelectedDomains}
                colorByDomain={colorByDomain}
                onColorByDomainChange={setColorByDomain}
              />
            )}
            <EdgeFilterPanel
              filters={edgeFilters}
              onChange={setEdgeFilters}
              showOverviewControls={viewMode === "cluster-list"}
              hiddenCount={hiddenEdgeCount}
            />
          </div>
        </Panel>
      </ReactFlow>

      {/* ── Collapsible right sidebar (merged-group drill-in view) ── */}
      {currentEntry.isMergedGroup && (
        <div className="absolute top-0 right-0 h-full flex z-30 pointer-events-none">
          {/* Toggle tab — always visible */}
          <div className="pointer-events-auto flex items-center">
            <button
              onClick={() => { sidebarManuallyToggledRef.current = true; setSidebarOpen((v) => !v); }}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              className="flex items-center justify-center w-5 h-16 rounded-l-lg transition-colors"
              style={{
                background: "rgba(99,102,241,0.18)",
                border: "1px solid rgba(99,102,241,0.30)",
                borderRight: "none",
                color: "rgba(165,180,252,0.8)",
              }}
            >
              {sidebarOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>
          </div>

          {/* Sidebar panel */}
          {sidebarOpen && (
            <div
              className="pointer-events-auto flex flex-col h-full w-72 overflow-hidden"
              style={{
                background: "rgba(8,8,20,0.96)",
                borderLeft: "1px solid rgba(99,102,241,0.22)",
                backdropFilter: "blur(18px)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <p className="text-[11px] font-semibold text-white/80">Merged Clusters</p>
                  <p className="text-[10px] text-white/35 mt-0.5">
                    {visibleClusters.length} cluster{visibleClusters.length !== 1 ? "s" : ""} inside this group
                  </p>
                </div>
                <GitMerge size={13} className="text-indigo-400 shrink-0" />
              </div>

              {/* Cluster list */}
              <div className="flex-1 overflow-y-auto py-2">
                {visibleClusters.map((cluster, i) => {
                  const rawIdx = blueprint.clusters.findIndex((c) => c.id === cluster.id);
                  const ci = ((rawIdx < 0 ? i : rawIdx) % CLUSTER_COLORS.length + CLUSTER_COLORS.length) % CLUSTER_COLORS.length;
                  const color = CLUSTER_COLORS[ci];
                  const fileCount = index.descendantCount.get(cluster.id) ?? 0;
                  const childCount = (index.childrenOf.get(cluster.id) ?? []).length;
                  const label = cluster.suggested_title ?? cluster.name ?? cluster.id;

                  return (
                    <div
                      key={cluster.id}
                      className="flex items-start gap-3 px-4 py-3 transition-colors cursor-default"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      {/* Color dot + number */}
                      <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color.border }} />
                        <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.20)" }}>{i + 1}</span>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold leading-snug" style={{ color: color.border.replace("0.50", "0.90") }}>
                          {label}
                        </p>
                        {cluster.functional_summary && (
                          <p className="text-[10px] leading-relaxed mt-0.5 line-clamp-2" style={{ color: "rgba(255,255,255,0.38)" }}>
                            {cluster.functional_summary}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                            style={{ background: color.border.replace("0.50", "0.10"), color: color.border.replace("0.50", "0.70") }}>
                            {fileCount} files
                          </span>
                          {childCount > 0 && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                              style={{ background: "rgba(99,102,241,0.10)", color: "rgba(165,180,252,0.70)" }}>
                              {childCount} sub-clusters
                            </span>
                          )}
                          {cluster.domain && cluster.domain_type !== "UNCLASSIFIED" && (() => {
                            const ds = getDomainStyle(cluster.domain);
                            return (
                              <span
                                className="text-[8px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                title={cluster.domain_evidence?.join("\n")}
                                style={{
                                  background: ds.badgeBg,
                                  border:     `1px ${cluster.domain_type === "EMERGENT" ? "dashed" : "solid"} ${ds.badgeBorder}`,
                                  color:      ds.badgeText,
                                }}
                              >
                                {formatDomainLabel(cluster.domain)}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <CodeViewerPanel
        node={selectedFileNode}
        organizationId={orgId}
        projectId={projectId}
        onClose={() => setSelectedFileNode(null)}
      />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------
export default function CodeSightCanvas({
  blueprint, projectId, orgId, onEdgeSelect,
}: {
  blueprint: Blueprint;
  projectId: string;
  orgId?: string;
  onEdgeSelect?: (selection: EdgeDiffSelection | null) => void;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
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
      <InnerCanvas
        blueprint={blueprint} projectId={projectId} orgId={orgId}
        onEdgeSelect={onEdgeSelect}
      />
    </ReactFlowProvider>
  );
}
