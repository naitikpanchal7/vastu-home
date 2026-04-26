"use client";

import { useRef, type RefObject } from "react";
import { useCanvasStore } from "@/store/canvasStore";

interface BrahmasthanDotProps {
  gRef: RefObject<SVGGElement | null>;
  onMove?: () => void;
}

export default function BrahmasthanDot({ gRef, onMove }: BrahmasthanDotProps) {
  const { brahmaX, brahmaY, currentTool, setBrahma } = useCanvasStore();
  const dragging = useRef(false);

  const getSVGPt = (e: { clientX: number; clientY: number }) => {
    if (!gRef.current) return null;
    const ctm = gRef.current.getScreenCTM();
    if (!ctm) return null;
    const pt = new DOMPoint(e.clientX, e.clientY);
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
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
