"use client";

import { useRef, type RefObject } from "react";
import { useCanvasStore } from "@/store/canvasStore";

interface BrahmasthanDotProps {
  svgRef: RefObject<SVGSVGElement | null>;
  onMove?: () => void;
}

export default function BrahmasthanDot({ svgRef, onMove }: BrahmasthanDotProps) {
  const { brahmaX, brahmaY, currentTool, setBrahma } = useCanvasStore();
  const dragging = useRef(false);

  const getSVGPt = (e: { clientX: number; clientY: number }) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const vb = svgRef.current.viewBox.baseVal;
    return {
      x: (e.clientX - rect.left) * (vb.width / rect.width),
      y: (e.clientY - rect.top) * (vb.height / rect.height),
    };
  };

  const isDraggable = currentTool === "brahma";

  return (
    <g data-brahma>
      <circle
        cx={brahmaX} cy={brahmaY} r={5}
        fill="var(--gold)"
        opacity={0.95}
        className="brahma-pulse"
        style={{ cursor: isDraggable ? "grab" : "default" }}
        onPointerDown={(e) => {
          if (!isDraggable) return;
          e.preventDefault();
          e.stopPropagation();
          dragging.current = true;
          (e.target as Element).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          const pt = getSVGPt(e);
          if (!pt) return;
          setBrahma(pt.x, pt.y);
          onMove?.();
        }}
        onPointerUp={() => { dragging.current = false; }}
      />
      <circle cx={brahmaX} cy={brahmaY} r={2} fill="var(--bg)" pointerEvents="none" />
      <text
        x={brahmaX} y={brahmaY + 34}
        textAnchor="middle"
        fill="rgba(100,70,20,0.52)"
        fontFamily="var(--font-cormorant), Georgia, serif"
        fontSize="10"
        fontStyle="italic"
        pointerEvents="none"
      >
        Brahma
      </text>
    </g>
  );
}
