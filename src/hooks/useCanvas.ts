"use client";

import React, { useCallback, useRef } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import type { Point } from "@/lib/vastu/geometry";
import { calculateZoneAreas } from "@/lib/vastu/geometry";
import { VASTU_ZONES } from "@/lib/vastu/zones";
import type { ZoneAnalysis } from "@/lib/types";

export function useCanvas() {
  const store = useCanvasStore();
  const lastClickTime = useRef(0);

  // Convert a mouse/pointer event on the SVG element to viewBox coordinates
  const getSVGCoords = useCallback((e: React.MouseEvent<SVGSVGElement>): Point => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const scaleX = vb.width / rect.width;
    const scaleY = vb.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const recalcZones = useCallback(() => {
    const pts = store.perimeterPoints;
    if (pts.length < 3) return;
    const results = calculateZoneAreas(
      pts,
      store.brahmaX,
      store.brahmaY,
      store.northDeg,
      VASTU_ZONES,
      store.cuts,
      store.scale?.pixelsPerUnit
    );
    const analysis: ZoneAnalysis[] = VASTU_ZONES.map((z) => {
      const r = results.find((res) => res.zoneName === z.shortName);
      const pct = r?.pctOfTotal ?? 0;
      const cutPct = r?.cutPctOfZone ?? 0;
      return {
        zoneName: z.shortName,
        pctOfTotal: pct,
        areaSqFt: r?.areaSqFt ?? null,
        hasCut: cutPct > 0,
        cutPctOfZone: cutPct,
        cutSeverity: cutPct === 0 ? undefined : cutPct < 10 ? "mild" : cutPct < 25 ? "moderate" : "severe",
        status: pct >= 5 && pct <= 7.5 ? "good" : pct < 3 ? "critical" : "warning",
      };
    });
    store.setZoneAnalysis(analysis);
  }, [store]);

  const handleSVGClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const now = Date.now();
      if (now - lastClickTime.current < 350) return;
      lastClickTime.current = now;

      const pt = getSVGCoords(e);

      if (store.currentTool === "perimeter" && !store.perimeterComplete) {
        store.addPerimeterPoint(pt);
      } else if (store.currentTool === "scale") {
        // Scale is handled by the ScaleTool component internally
      }
    },
    [store, getSVGCoords]
  );

  const handleSVGDblClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      lastClickTime.current = Date.now();
      if (store.currentTool === "perimeter" && store.perimeterPoints.length >= 3 && !store.perimeterComplete) {
        store.closePerimeter();
        recalcZones();
      }
    },
    [store, recalcZones]
  );

  const handleSVGMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      return getSVGCoords(e);
    },
    [getSVGCoords]
  );

  return {
    store,
    getSVGCoords,
    handleSVGClick,
    handleSVGDblClick,
    handleSVGMouseMove,
    recalcZones,
  };
}
