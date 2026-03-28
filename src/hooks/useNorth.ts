"use client";

import { useCallback, useState } from "react";
import { useCanvasStore } from "@/store/canvasStore";

export function useNorth() {
  const { northDeg, northMethod, setNorth } = useCanvasStore();
  const [declinationInfo, setDeclinationInfo] = useState<{
    declination: number;
    address: string;
  } | null>(null);

  const applyManual = useCallback(
    (deg: number) => {
      setNorth(deg, "manual");
    },
    [setNorth]
  );

  const fetchDeclination = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `/api/north/declination?lat=${lat}&lon=${lon}`
      );
      const json = await res.json();
      if (json.declination !== undefined) {
        return json.declination as number;
      }
    } catch {
      // silently fail — user can set manually
    }
    return 0;
  }, []);

  const applyGPS = useCallback(async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const decl = await fetchDeclination(latitude, longitude);
      const magnetic = northDeg;
      const trueNorth = ((magnetic + decl) % 360 + 360) % 360;
      setNorth(trueNorth, "gps");
    });
  }, [northDeg, fetchDeclination, setNorth]);

  return {
    northDeg,
    northMethod,
    declinationInfo,
    applyManual,
    applyGPS,
    setNorth,
  };
}
