"use client";

import { toPng } from "html-to-image";
import { getNodesBounds, type Node, type Edge } from "@xyflow/react";

const FALLBACK_NODE_W = 224;
const FALLBACK_NODE_H = 76;

function triggerDownload(href: string, fileName: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---------------------------------------------------------------------------
// PNG export — rasterizes the react-flow viewport (nodes + edges only, no
// zoom/pan chrome) at native resolution via html-to-image.
// ---------------------------------------------------------------------------
export async function exportCanvasAsPng(
  viewportEl: HTMLElement,
  nodes: Node[],
  fileName: string,
  backgroundColor = "#080810",
) {
  if (!nodes.length) return;

  const bounds = getNodesBounds(nodes);
  const padding = 60;
  const imageWidth = Math.ceil(bounds.width) + padding * 2;
  const imageHeight = Math.ceil(bounds.height) + padding * 2;
  const offsetX = -bounds.x + padding;
  const offsetY = -bounds.y + padding;

  const dataUrl = await toPng(viewportEl, {
    backgroundColor,
    width: imageWidth,
    height: imageHeight,
    pixelRatio: 2,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${offsetX}px, ${offsetY}px) scale(1)`,
    },
  });

  triggerDownload(dataUrl, fileName);
}

// ---------------------------------------------------------------------------
// draw.io / diagrams.net XML export — plain mxGraph markup, editable after
// opening/importing in draw.io. No external deps: it's just XML text.
// ---------------------------------------------------------------------------
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function styleNumber(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

// Flat, high-contrast palette: cyan node fills, black text, dark cyan borders/
// edges. No per-cluster color mapping — simple and legible on draw.io's
// default white page regardless of node type.
const NODE_FILL   = "#67E8F9"; // cyan-300
const NODE_STROKE = "#0E7490"; // cyan-700
const TEXT_COLOR  = "#000000";

export function exportGraphAsDrawio(nodes: Node[], edges: Edge[], fileName: string) {
  // The file-detail view's full-canvas background node is a layout artifact,
  // not a real entity — skip it so the diagram only contains meaningful cells.
  const visibleNodes = nodes.filter((n) => !(n.data as Record<string, unknown> | undefined)?.isBackground);
  const idOf = new Map(visibleNodes.map((n, i) => [n.id, `n${i}`]));

  const cells: string[] = [];

  for (const n of visibleNodes) {
    const data = (n.data ?? {}) as Record<string, unknown>;
    const isCluster = n.type === "clusterGroup";
    const label = isCluster
      ? String(data.label ?? n.id)
      : String(data.canonical_path ?? n.id);

    const w = styleNumber(n.style?.width) ?? n.measured?.width ?? FALLBACK_NODE_W;
    const h = styleNumber(n.style?.height) ?? n.measured?.height ?? FALLBACK_NODE_H;

    const style = isCluster
      ? `rounded=1;whiteSpace=wrap;html=1;arcSize=8;fillColor=${NODE_FILL};strokeColor=${NODE_STROKE};strokeWidth=2;fontColor=${TEXT_COLOR};fontSize=12;fontStyle=1;verticalAlign=top;align=left;spacing=8;`
      : `rounded=1;whiteSpace=wrap;html=1;arcSize=12;fillColor=${NODE_FILL};strokeColor=${NODE_STROKE};strokeWidth=2;fontColor=${TEXT_COLOR};fontSize=10;align=left;spacing=6;`;

    cells.push(
      `<mxCell id="${idOf.get(n.id)}" value="${escapeXml(label)}" style="${style}" vertex="1" parent="1">` +
      `<mxGeometry x="${n.position.x}" y="${n.position.y}" width="${w}" height="${h}" as="geometry" /></mxCell>`
    );
  }

  let edgeCounter = 0;
  for (const e of edges) {
    if (!idOf.has(e.source) || !idOf.has(e.target)) continue;
    const data = (e.data ?? {}) as Record<string, unknown>;
    const label = data.dominantType ?? data.type;
    const style = `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${NODE_STROKE};strokeWidth=2;endArrow=block;elbow=vertical;fontSize=9;fontColor=${TEXT_COLOR};`;

    cells.push(
      `<mxCell id="e${edgeCounter++}" value="${label ? escapeXml(String(label)) : ""}" style="${style}" edge="1" parent="1" source="${idOf.get(e.source)}" target="${idOf.get(e.target)}">` +
      `<mxGeometry relative="1" as="geometry" /></mxCell>`
    );
  }

  const xml = `<mxfile host="CodeSight">
  <diagram name="CodeSight Graph" id="codesight-graph">
    <mxGraphModel dx="800" dy="600" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1200" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
