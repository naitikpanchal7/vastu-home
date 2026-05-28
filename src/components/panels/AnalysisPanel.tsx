"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCanvasStore } from "@/store/canvasStore";
import { VASTU_ZONES } from "@/lib/vastu/zones";
import {
  calculateZoneAreas,
  calculateCutAnalysis,
} from "@/lib/vastu/geometry";
import Button from "@/components/ui/Button";

interface AnalysisPanelProps {
  onExport: () => void;
}

export default function AnalysisPanel({ onExport }: AnalysisPanelProps) {
  const router = useRouter();
  const {
    northDeg, cuts, projectName,
    perimeterPoints, brahmaX, brahmaY, scale,
  } = useCanvasStore();

  const hasPerimeter = perimeterPoints.length >= 3;

  const zoneRows = useMemo(() => {
    if (!hasPerimeter) {
      return VASTU_ZONES.map(z => ({ zone: z, pct: 6.25, hasCut: false, cutPct: 0 }));
    }
    const results = calculateZoneAreas(
      perimeterPoints, brahmaX, brahmaY, northDeg,
      VASTU_ZONES, cuts, scale?.pixelsPerUnit
    );
    return VASTU_ZONES.map(z => {
      const r = results.find(res => res.zoneName === z.shortName);
      return {
        zone: z,
        pct: r?.pctOfTotal ?? 0,
        hasCut: r?.hasCut ?? false,
        cutPct: r?.cutPctOfZone ?? 0,
      };
    });
  }, [perimeterPoints, brahmaX, brahmaY, northDeg, cuts, scale, hasPerimeter]);

  const cutRows = useMemo(() => {
    if (!hasPerimeter || cuts.length === 0) return [];
    return calculateCutAnalysis(
      perimeterPoints, brahmaX, brahmaY, northDeg, VASTU_ZONES, cuts
    );
  }, [perimeterPoints, brahmaX, brahmaY, northDeg, cuts, hasPerimeter]);

  const maxPct    = Math.max(...zoneRows.map(r => r.pct), 10);
  const maxCutPct = Math.max(...cutRows.map(r => r.pctOfCombined), 1);

  const highestPct = Math.max(...zoneRows.map(r => r.pct));
  const lowestPct  = Math.min(...zoneRows.map(r => r.pct));
  const upperPct   = (6.25 + highestPct) / 2;
  const lowerPct   = (6.25 + lowestPct) / 2;

  return (
    <div className="flex flex-col h-full">

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-[1px]">

      {/* ── Header ── */}
      <div className="text-[8px] text-vastu-text-3 mb-[5px] uppercase tracking-[1px] truncate">
        {projectName || "Select a project"}
      </div>
      <div className="flex gap-[9px] mb-[8px] text-[9px] text-vastu-text-3">
        <span>N: <strong className="text-gold-2 font-mono">{northDeg.toFixed(1)}°</strong></span>
        <span>Cuts: <strong className="text-[#c04040]">{cuts.length}</strong></span>
        <span>Ideal: <strong className="text-vastu-text-2">6.25%</strong></span>
      </div>

      {/* ── Zone Area Distribution ── */}
      <div className="flex items-center gap-[6px] mb-[5px]">
        <span className="text-[8px] text-vastu-text-3 uppercase tracking-[1px]">Zone Area Distribution</span>
        {!hasPerimeter && (
          <span className="text-[7px] text-vastu-text-3 italic">(draw perimeter to activate)</span>
        )}
      </div>

      <div className="flex flex-col">
        {zoneRows.map(({ zone, pct, hasCut, cutPct }) => (
          <div
            key={zone.shortName}
            className="group flex items-center gap-[5px] px-[3px] py-[3px] rounded-[4px] cursor-default hover:bg-[rgba(100,70,20,0.07)] relative"
          >
            <div
              className="w-[5px] h-[18px] rounded-[2px] flex-shrink-0"
              style={{ background: zone.color }}
            />
            <span className="font-mono text-[9px] text-vastu-text-2 w-[30px] flex-shrink-0">
              {zone.shortName}
            </span>
            <div className="flex-1">
              <div
                className="h-[3px] rounded-[2px] transition-all duration-300"
                style={{ width: `${(pct / maxPct) * 100}%`, background: zone.color }}
              />
            </div>
            <span className="font-mono text-[9px] text-vastu-text-3 w-10 text-right flex-shrink-0">
              {pct.toFixed(2)}%
            </span>

            {/* Hover tooltip */}
            <div className="hidden group-hover:block absolute left-full top-1/2 -translate-y-1/2 ml-[6px] bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[6px] px-[10px] py-[7px] min-w-[190px] z-50 pointer-events-none shadow-lg">
              <div className="text-[10px] text-gold-2 font-medium mb-[4px]">{zone.name}</div>
              <div className="text-[9px] text-vastu-text-2 leading-[1.8]">
                <span className="text-vastu-text-3">Deity:</span> {zone.deity}<br />
                <span className="text-vastu-text-3">Element:</span> {zone.element}<br />
                <span className="text-vastu-text-3">Governs:</span> {zone.governs}<br />
                <span className="text-vastu-text-3">Ideal use:</span> {zone.idealUse[0]}
                {hasCut && (
                  <><br />
                    <span style={{ color: "#e05050" }}>
                      ✕ Cut present — {cutPct.toFixed(2)}% of zone
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bar Chart ── */}
      <div className="mt-[8px] pt-[8px] border-t border-[rgba(100,70,20,0.12)]">
        <div className="text-[8px] text-vastu-text-3 mb-[4px]">Zone Distribution</div>
        <div className="relative flex items-end gap-[2px] h-[44px]">
          {/* Avg / Ideal line */}
          <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ bottom: `${(6.25 / maxPct) * 100}%`, borderTop: "1px dashed rgba(200,175,120,0.55)" }} />
          {/* Upper line: (avg + highest) / 2 */}
          <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ bottom: `${(upperPct / maxPct) * 100}%`, borderTop: "1px dashed rgba(232,145,42,0.6)" }} />
          {/* Lower line: (avg + lowest) / 2 */}
          <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ bottom: `${(lowerPct / maxPct) * 100}%`, borderTop: "1px dashed rgba(110,198,232,0.6)" }} />
          {zoneRows.map(({ zone, pct }) => (
            <div
              key={zone.shortName}
              className="flex-1 rounded-t-[2px] min-w-0 transition-all duration-300"
              style={{
                height: `${Math.max((pct / maxPct) * 100, 4)}%`,
                background: zone.color,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
        <div className="flex gap-[2px] mt-[2px]">
          {zoneRows.map(({ zone }) => (
            <div
              key={zone.shortName}
              className="flex-1 text-center font-mono overflow-hidden min-w-0"
              style={{ fontSize: "5px", color: "var(--vastu-text-3)" }}
            >
              {zone.shortName}
            </div>
          ))}
        </div>
      </div>

      {/* ── Cut Analysis ── */}
      {cutRows.length > 0 && (
        <div className="mt-[10px] pt-[9px] border-t border-[rgba(100,70,20,0.15)]">
          <div className="flex items-center justify-between mb-[7px]">
            <div className="flex items-center gap-[5px]">
              <span className="text-[8px] text-vastu-text-3 uppercase tracking-[1px]">Cut Analysis</span>
              <span
                className="text-[7px] font-mono px-[5px] py-[1px] rounded-full"
                style={{ background: "rgba(200,60,40,0.15)", color: "#e05050" }}
              >
                {cutRows.length}
              </span>
            </div>
            <div className="text-[7px] text-vastu-text-3 italic">% of floor + cuts</div>
          </div>

          <div className="flex flex-col gap-[3px]">
            {cutRows.map(row => (
              <div
                key={row.id}
                className="flex items-center gap-[5px] px-[3px] py-[3px] rounded-[4px] hover:bg-[rgba(100,70,20,0.06)]"
              >
                <div
                  className="w-[5px] h-[18px] rounded-[2px] flex-shrink-0"
                  style={{ background: "#e05050", opacity: 0.6 }}
                />
                <span className="font-mono text-[8px] text-vastu-text-3 flex-shrink-0 min-w-[32px]">
                  {row.label}
                </span>
                <span
                  className="text-[7px] font-mono px-[4px] py-[1px] rounded-[3px] flex-shrink-0"
                  style={{ background: "rgba(100,70,20,0.14)", color: "var(--gold-3)" }}
                >
                  {row.primaryZone}
                </span>
                <div className="flex-1">
                  <div
                    className="h-[3px] rounded-[2px] transition-all duration-300"
                    style={{
                      width: `${(row.pctOfCombined / maxCutPct) * 100}%`,
                      background: "#e05050",
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span className="font-mono text-[9px] text-vastu-text-2 w-10 text-right flex-shrink-0">
                  {row.pctOfCombined.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      </div>{/* end scrollable content */}

      {/* ── Actions — pinned to bottom ── */}
      <div className="flex gap-[6px] pt-[9px] flex-shrink-0">
        <Button variant="ghost" className="flex-1 justify-center text-[10px] py-[5px]" onClick={() => router.push("/canvas/analysis")}>
          ⤢ Full View
        </Button>
        <Button variant="primary" className="flex-1 justify-center text-[10px] py-[5px]" onClick={onExport}>
          ⎙ Export
        </Button>
      </div>
    </div>
  );
}
