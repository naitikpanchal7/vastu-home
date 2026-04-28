"use client";

import { useCallback } from "react";
import { useCanvasStore } from "@/store/canvasStore";

export function useNorth() {
  const { northDeg, northMethod, setNorth } = useCanvasStore();

  const applyManual = useCallback(
    (deg: number) => {
      setNorth(deg, "manual");
    },
    [setNorth]
  );

  return {
    northDeg,
    northMethod,
    applyManual,
    setNorth,
  };
}
