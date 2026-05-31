"use client";

import { useEffect, useRef, useState } from "react";

type Node = {
  id: string;
  // percentage positions (0-100) for top/left
  top: number;
  left: number;
  // pixel size
  size: number;
  fill: string;
  border: string;
  borderWidth: number;
  opacity: number;
};

const NODES: Node[] = [
  // far — tiny, faint
  { id: "n1",  top: 13, left: 8,  size: 10, fill: "#e0f7fa", border: "#b2ebf2", borderWidth: 1, opacity: 0.5 },
  { id: "n2",  top: 31, left: 22, size: 8,  fill: "#e0f7fa", border: "#b2ebf2", borderWidth: 1, opacity: 0.45 },
  { id: "n3",  top: 18, left: 70, size: 10, fill: "#e0f7fa", border: "#b2ebf2", borderWidth: 1, opacity: 0.5 },
  { id: "n4",  top: 67, left: 40, size: 8,  fill: "#e0f7fa", border: "#b2ebf2", borderWidth: 1, opacity: 0.4 },
  { id: "n5",  top: 80, left: 88, size: 10, fill: "#e0f7fa", border: "#b2ebf2", borderWidth: 1, opacity: 0.45 },
  { id: "n6",  top: 10, left: 55, size: 8,  fill: "#bae6fd", border: "#93c5fd", borderWidth: 1, opacity: 0.4 },
  // mid
  { id: "n7",  top: 55, left: 14, size: 22, fill: "#a5f3fc", border: "#67e8f9", borderWidth: 1, opacity: 0.65 },
  { id: "n8",  top: 5, left: 82, size: 26, fill: "#a5f3fc", border: "#67e8f9", borderWidth: 1, opacity: 0.6 },
  { id: "n9",  top: 75, left: 60, size: 20, fill: "#bae6fd", border: "#7dd3fc", borderWidth: 1, opacity: 0.6 },
  { id: "n10", top: 88, left: 35, size: 24, fill: "#a5f3fc", border: "#67e8f9", borderWidth: 1, opacity: 0.65 },
  // close — large, vivid
  { id: "n11", top: 82, left: 7,  size: 52, fill: "#67e8f9", border: "#0891b2", borderWidth: 2, opacity: 0.85 },
  { id: "n12", top: 90, left: 90, size: 64, fill: "#22d3ee", border: "#0e7490", borderWidth: 2, opacity: 0.8 },
  { id: "n13", top: 3, left: 15, size: 44, fill: "#67e8f9", border: "#0891b2", borderWidth: 2, opacity: 0.8 },
  { id: "n14", top: 42, left: 92, size: 56, fill: "#22d3ee", border: "#0e7490", borderWidth: 2, opacity: 0.75 },
  { id: "n15", top: 18,  left: 3,  size: 72, fill: "#22d3ee", border: "#0e7490", borderWidth: 2, opacity: 0.8 },
];

const EDGES: [string, string][] = [
  ["n13", "n1"], ["n1", "n2"], ["n2", "n7"],
  ["n15", "n13"], ["n15", "n1"],
  ["n13", "n6"], ["n6", "n3"], ["n3", "n8"],
  ["n8", "n14"], ["n14", "n5"], ["n5", "n12"],
  ["n12", "n9"], ["n9", "n4"], ["n4", "n10"],
  ["n10", "n11"], ["n7", "n11"], ["n9", "n12"],
];

export default function AuthPageBackgroundDesign({
  children,
  maxWidth = "max-w-lg",
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDims({
          w: containerRef.current.offsetWidth,
          h: containerRef.current.offsetHeight,
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Compute the pixel center of each node
  const centers: Record<string, { x: number; y: number }> = {};
  if (dims.w && dims.h) {
    for (const n of NODES) {
      centers[n.id] = {
        x: (n.left / 100) * dims.w + n.size / 2,
        y: (n.top / 100) * dims.h + n.size / 2,
      };
    }
  }

  return (
    <div ref={containerRef} className="relative flex min-h-screen items-center justify-center bg-zinc-50 overflow-hidden">

      {/* Edges — drawn in pixel space so they hit exact centers */}
      {dims.w > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          {EDGES.map(([a, b]) => {
            const ca = centers[a];
            const cb = centers[b];
            return (
              <line
                key={`${a}-${b}`}
                x1={ca.x} y1={ca.y}
                x2={cb.x} y2={cb.y}
                stroke="#a5f3fc"
                strokeWidth="1"
                opacity="0.5"
              />
            );
          })}
        </svg>
      )}

      {/* Nodes — positioned by top/left % with size in px */}
      {NODES.map((n) => (
        <div
          key={n.id}
          className="absolute rounded-full"
          style={{
            top: `${n.top}%`,
            left: `${n.left}%`,
            width: n.size,
            height: n.size,
            backgroundColor: n.fill,
            border: `${n.borderWidth}px solid ${n.border}`,
            opacity: n.opacity,
          }}
        />
      ))}

      <div className={`relative z-10 w-full ${maxWidth} px-4`}>{children}</div>
    </div>
  );
}
