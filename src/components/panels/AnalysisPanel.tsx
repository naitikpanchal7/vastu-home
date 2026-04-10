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

const SEV_STYLE = {
  mild:     { bar: "#c8a028", badge: "rgba(120,80,0,0.35)",  text: "#c8a028" },
  moderate: { bar: "#e87820", badge: "rgba(160,70,0,0.35)",  text: "#e87820" },
  severe:   { bar: "#e05050", badge: "rgba(160,30,30,0.35)", text: "#e05050" },
} as const;

export default function AnalysisPanel({ onExport }: AnalysisPanelProps) {
  const router = useRouter();
  const {
    northDeg, cuts, projectName,
    perimeterPoints, brahmaX, brahmaY, scale,
  } = useCanvasStore();

  const hasPerimeter = perimeterPoints.length >= 3;

  // Zone rows — reactive to northDeg, brahmaX/Y, perimeter, cuts, scale
  const zoneRows = useMemo(() => {
    if (!hasPerimeter) {
      return VASTU_ZONES.map(z => ({
        zone: z, pct: 6.25, status: "good" as const, hasCut: false, cutPct: 0,
      }));
    }
    const results = calculateZoneAreas(
      perimeterPoints, brahmaX, brahmaY, northDeg,
      VASTU_ZONES, cuts, scale?.pixelsPerUnit
    );
    return VASTU_ZONES.map(z => {
      const r = results.find(res => res.zoneName === z.shortName);
      const pct = r?.pctOfTotal ?? 0;
      const cutPct = r?.cutPctOfZone ?? 0;
      const status: "good" | "warning" | "critical" =
        pct >= 5 && pct <= 7.5 ? "good" : pct < 3 ? "critical" : "warning";
      return { zone: z, pct, status, hasCut: r?.hasCut ?? false, cutPct };
    });
  }, [perimeterPoints, brahmaX, brahmaY, northDeg, cuts, scale, hasPerimeter]);

  // Cut analysis rows — reactive to same deps
  const cutRows = useMemo(() => {
    if (!hasPerimeter || cuts.length === 0) return [];
    return calculateCutAnalysis(
      perimeterPoints, brahmaX, brahmaY, northDeg, VASTU_ZONES, cuts
    );
  }, [perimeterPoints, brahmaX, brahmaY, northDeg, cuts, hasPerimeter]);

  const maxPct    = Math.max(...zoneRows.map(r => r.pct), 10);
  const maxCutPct = Math.max(...cutRows.map(r => r.pctOfCombined), 1);

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
        {zoneRows.map(({ zone, pct, status, hasCut, cutPct }) => (
          <div
            key={zone.shortName}
            className="group flex items-center gap-[5px] px-[3px] py-[3px] rounded-[4px] cursor-default hover:bg-[rgba(200,175,120,0.05)] relative"
          >
            {/* Color swatch */}
            <div
              className="w-[5px] h-[18px] rounded-[2px] flex-shrink-0"
              style={{ background: zone.color }}
            />
            {/* Zone code */}
            <span className="font-mono text-[9px] text-vastu-text-2 w-[30px] flex-shrink-0">
              {zone.shortName}
            </span>
            {/* Bar */}
            <div className="flex-1">
              <div
                className="h-[3px] rounded-[2px] transition-all duration-300"
                style={{
                  width: `${(pct / maxPct) * 100}%`,
                  background:
                    status === "good" ? zone.color :
                    status === "warning" ? "#c8a028" : "#c04040",
                }}
              />
            </div>
            {/* Pct */}
            <span className="font-mono text-[9px] text-vastu-text-3 w-8 text-right flex-shrink-0">
              {pct.toFixed(1)}%
            </span>
            {/* Status icon */}
            <span className="text-[9px] w-[14px] text-center flex-shrink-0">
              {status === "good" ? "✓" : status === "warning" ? "⚠" : "✕"}
            </span>

            {/* Hover tooltip */}
            <div className="hidden group-hover:block absolute left-full top-1/2 -translate-y-1/2 ml-[6px] bg-bg-2 border border-[rgba(200,175,120,0.15)] rounded-[6px] px-[10px] py-[7px] min-w-[190px] z-50 pointer-events-none shadow-lg">
              <div className="text-[10px] text-gold-2 font-medium mb-[4px]">{zone.name}</div>
              <div className="text-[9px] text-vastu-text-2 leading-[1.8]">
                <span className="text-vastu-text-3">Deity:</span> {zone.deity}<br />
                <span className="text-vastu-text-3">Element:</span> {zone.element}<br />
                <span className="text-vastu-text-3">Governs:</span> {zone.governs}<br />
                <span className="text-vastu-text-3">Ideal use:</span> {zone.idealUse[0]}
                {hasCut && (
                  <><br />
                    <span style={{ color: "#e05050" }}>
                      ✕ Cut present — {cutPct.toFixed(1)}% of zone
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>{/* end zone rows */}

      {/* ── Bar Chart ── */}
      <div className="mt-[8px] pt-[8px] border-t border-[rgba(200,175,120,0.08)]">
        <div className="text-[8px] text-vastu-text-3 mb-[4px]">Zone Distribution</div>
        <div className="flex items-end gap-[2px] h-[44px]">
          {zoneRows.map(({ zone, pct, status }) => (
            <div
              key={zone.shortName}
              className="flex-1 rounded-t-[2px] min-w-0 transition-all duration-300"
              style={{
                height: `${Math.max((pct / maxPct) * 100, 4)}%`,
                background:
                  status === "good" ? zone.color :
                  status === "warning" ? "#c8a028" : "#c04040",
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
        <div className="mt-[10px] pt-[9px] border-t border-[rgba(200,175,120,0.12)]">

          {/* Section header */}
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

          {/* Cut rows */}
          <div className="flex flex-col gap-[3px]">
            {cutRows.map(row => {
              const s = SEV_STYLE[row.severity];
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-[5px] px-[3px] py-[3px] rounded-[4px] hover:bg-[rgba(200,175,120,0.04)]"
                >
                  {/* Severity swatch */}
                  <div
                    className="w-[5px] h-[18px] rounded-[2px] flex-shrink-0"
                    style={{ background: s.bar, opacity: 0.75 }}
                  />
                  {/* Cut label */}
                  <span className="font-mono text-[8px] text-vastu-text-3 flex-shrink-0 min-w-[32px]">
                    {row.label}
                  </span>
                  {/* Zone badge */}
                  <span
                    className="text-[7px] font-mono px-[4px] py-[1px] rounded-[3px] flex-shrink-0"
                    style={{ background: "rgba(200,175,120,0.1)", color: "var(--gold-3)" }}
                  >
                    {row.primaryZone}
                  </span>
                  {/* Bar */}
                  <div className="flex-1">
                    <div
                      className="h-[3px] rounded-[2px] transition-all duration-300"
                      style={{
                        width: `${(row.pctOfCombined / maxCutPct) * 100}%`,
                        background: s.bar,
                        opacity: 0.9,
                      }}
                    />
                  </div>
                  {/* Pct */}
                  <span
                    className="font-mono text-[9px] w-8 text-right flex-shrink-0"
                    style={{ color: s.text }}
                  >
                    {row.pctOfCombined.toFixed(1)}%
                  </span>
                  {/* Severity badge */}
                  <span
                    className="text-[6px] px-[4px] py-[1px] rounded-[3px] uppercase font-sans font-semibold flex-shrink-0 tracking-[0.5px]"
                    style={{ background: s.badge, color: s.text }}
                  >
                    {row.severity}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-[6px] text-[7px] text-vastu-text-3 leading-[1.9]">
            <span style={{ color: "#c8a028" }}>●</span> mild &lt;5%&ensp;
            <span style={{ color: "#e87820" }}>●</span> moderate 5–15%&ensp;
            <span style={{ color: "#e05050" }}>●</span> severe &gt;15%
            <span className="ml-1 italic">(% of floor plan)</span>
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
