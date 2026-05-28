"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCanvasStore } from "@/store/canvasStore";
import { VASTU_ZONES } from "@/lib/vastu/zones";
import { calculateZoneAreas, calculateCutAnalysis } from "@/lib/vastu/geometry";

const IDEAL_PCT = 6.25;

export default function AnalysisFullPage() {
  const router = useRouter();
  const {
    northDeg, cuts, projectName, clientName,
    perimeterPoints, brahmaX, brahmaY, scale,
  } = useCanvasStore();

  const hasPerimeter = perimeterPoints.length >= 3;

  const zoneRows = useMemo(() => {
    if (!hasPerimeter) {
      return VASTU_ZONES.map(z => ({
        zone: z, pct: 6.25, hasCut: false, cutPct: 0,
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
      return { zone: z, pct, hasCut: r?.hasCut ?? false, cutPct };
    });
  }, [perimeterPoints, brahmaX, brahmaY, northDeg, cuts, scale, hasPerimeter]);

  const cutRows = useMemo(() => {
    if (!hasPerimeter || cuts.length === 0) return [];
    return calculateCutAnalysis(
      perimeterPoints, brahmaX, brahmaY, northDeg, VASTU_ZONES, cuts
    );
  }, [perimeterPoints, brahmaX, brahmaY, northDeg, cuts, hasPerimeter]);

  const maxPct = Math.max(...zoneRows.map(r => r.pct), IDEAL_PCT + 2);
  const maxCutPct = Math.max(...cutRows.map(r => r.pctOfCombined), 1);

  const highestPct = Math.max(...zoneRows.map(r => r.pct));
  const lowestPct  = Math.min(...zoneRows.map(r => r.pct));
  const upperPct   = (IDEAL_PCT + highestPct) / 2;
  const lowerPct   = (IDEAL_PCT + lowestPct) / 2;

  return (
    <div className="h-screen bg-bg text-vastu-text font-sans flex flex-col">

      {/* ── Top bar ── */}
      <div className="h-[52px] bg-bg-2 border-b border-[rgba(100,70,20,0.15)] flex items-center px-6 gap-4 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-[6px] text-[11px] text-vastu-text-2 hover:text-gold-2 transition-colors cursor-pointer"
        >
          ← Back to Canvas
        </button>
        <div className="w-[1px] h-[16px] bg-[rgba(100,70,20,0.15)]" />
        <div className="flex flex-col">
          <span className="text-[13px] text-gold-2 font-serif">
            {projectName || "Untitled Project"}
          </span>
          {clientName && (
            <span className="text-[9px] text-vastu-text-3">{clientName}</span>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex gap-[18px] text-[10px] text-vastu-text-3">
          <span>North: <strong className="text-gold-2 font-mono">{northDeg.toFixed(1)}°</strong></span>
          <span>Zones: <strong className="text-vastu-text-2 font-mono">16</strong></span>
          <span>Cuts: <strong className="text-[#e05050] font-mono">{cuts.length}</strong></span>
          <span>Ideal: <strong className="text-vastu-text-2 font-mono">6.25%</strong></span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-[1100px] w-full mx-auto">

        {!hasPerimeter && (
          <div className="mb-6 px-4 py-3 bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[8px] text-[11px] text-vastu-text-3">
            No perimeter drawn yet — showing ideal 6.25% per zone. Go back to the canvas and draw the floor plan perimeter to see real analysis.
          </div>
        )}

        {/* ── Bar Chart ── */}
        <section className="mb-8">
          <h2 className="text-[11px] uppercase tracking-[1.5px] text-vastu-text-3 mb-4">Zone Area Distribution</h2>
          <div className="bg-bg-2 border border-[rgba(100,70,20,0.15)] rounded-[10px] p-5">

            {/* Y-axis label + chart area */}
            <div className="flex gap-3">
              {/* Y-axis labels */}
              <div className="flex flex-col justify-between text-right pb-6" style={{ minWidth: 28 }}>
                {[maxPct, maxPct * 0.75, maxPct * 0.5, IDEAL_PCT, 0].map(v => (
                  <span key={v} className="text-[8px] font-mono text-vastu-text-3">
                    {v.toFixed(2)}%
                  </span>
                ))}
              </div>

              {/* Bars + ideal line */}
              <div className="flex-1">
                <div className="relative" style={{ height: 200 }}>
                  {/* Upper line: (avg + highest) / 2 */}
                  <div
                    className="absolute left-0 right-0 border-t border-dashed pointer-events-none z-10"
                    style={{ bottom: `${(upperPct / maxPct) * 100}%`, borderColor: "rgba(232,145,42,0.55)" }}
                  >
                    <span
                      className="absolute right-0 text-[7px] font-mono px-[4px] py-[1px] rounded"
                      style={{ color: "rgba(232,145,42,0.7)", background: "var(--bg-2)", transform: "translateY(-50%)" }}
                    >
                      upper {upperPct.toFixed(2)}%
                    </span>
                  </div>

                  {/* Ideal 6.25% line */}
                  <div
                    className="absolute left-0 right-0 border-t border-dashed pointer-events-none z-10"
                    style={{
                      bottom: `${(IDEAL_PCT / maxPct) * 100}%`,
                      borderColor: "rgba(100,70,20,0.38)",
                    }}
                  >
                    <span
                      className="absolute right-0 text-[7px] font-mono px-[4px] py-[1px] rounded"
                      style={{
                        color: "rgba(100,70,20,0.52)",
                        background: "var(--bg-2)",
                        transform: "translateY(-50%)",
                      }}
                    >
                      avg
                    </span>
                  </div>

                  {/* Lower line: (avg + lowest) / 2 */}
                  <div
                    className="absolute left-0 right-0 border-t border-dashed pointer-events-none z-10"
                    style={{ bottom: `${(lowerPct / maxPct) * 100}%`, borderColor: "rgba(110,198,232,0.55)" }}
                  >
                    <span
                      className="absolute right-0 text-[7px] font-mono px-[4px] py-[1px] rounded"
                      style={{ color: "rgba(110,198,232,0.7)", background: "var(--bg-2)", transform: "translateY(-50%)" }}
                    >
                      lower {lowerPct.toFixed(2)}%
                    </span>
                  </div>

                  {/* Grid lines */}
                  {[0.25, 0.5, 0.75].map(f => (
                    <div
                      key={f}
                      className="absolute left-0 right-0 border-t pointer-events-none"
                      style={{
                        bottom: `${f * 100}%`,
                        borderColor: "rgba(100,70,20,0.07)",
                      }}
                    />
                  ))}

                  {/* Bars */}
                  <div className="absolute inset-0 flex items-end gap-[3px]">
                    {zoneRows.map(({ zone, pct }) => {
                      const heightPct = Math.max((pct / maxPct) * 100, 1);
                      return (
                        <div
                          key={zone.shortName}
                          className="flex-1 flex flex-col items-center justify-end group relative"
                          style={{ height: "100%" }}
                        >
                          <span
                            className="text-[7px] font-mono mb-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: zone.color }}
                          >
                            {pct.toFixed(2)}
                          </span>
                          <div
                            className="w-full rounded-t-[3px] transition-all duration-300"
                            style={{ height: `${heightPct}%`, background: zone.color, opacity: 0.85 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* X-axis zone labels */}
                <div className="flex gap-[3px] mt-[6px]">
                  {zoneRows.map(({ zone }) => (
                    <div
                      key={zone.shortName}
                      className="flex-1 text-center font-mono overflow-hidden"
                      style={{ fontSize: "7px", color: "var(--vastu-text-3)" }}
                    >
                      {zone.shortName}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Zone Table ── */}
        <section className="mb-8">
          <h2 className="text-[11px] uppercase tracking-[1.5px] text-vastu-text-3 mb-4">Zone Detail</h2>
          <div className="bg-bg-2 border border-[rgba(100,70,20,0.15)] rounded-[10px] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[20px_60px_1fr_80px_80px_70px] gap-3 px-4 py-2 border-b border-[rgba(100,70,20,0.12)] text-[8px] uppercase tracking-[1px] text-vastu-text-3">
              <div />
              <div>Zone</div>
              <div>Governs</div>
              <div>Deity</div>
              <div>Element</div>
              <div className="text-right">Area %</div>
            </div>
            {zoneRows.map(({ zone, pct, hasCut, cutPct }, i) => (
              <div
                key={zone.shortName}
                className="grid grid-cols-[20px_60px_1fr_80px_80px_70px] gap-3 px-4 py-[9px] items-center border-b border-[rgba(100,70,20,0.07)] hover:bg-[rgba(100,70,20,0.06)] transition-colors"
                style={{ background: i % 2 === 0 ? "transparent" : "rgba(100,70,20,0.03)" }}
              >
                <div className="w-[5px] h-[20px] rounded-[2px]" style={{ background: zone.color }} />
                <div>
                  <div className="font-mono text-[10px] text-vastu-text-2">{zone.shortName}</div>
                  <div className="text-[8px] text-vastu-text-3 truncate">{zone.name}</div>
                </div>
                <div className="text-[9px] text-vastu-text-3 truncate">{zone.governs}</div>
                <div className="font-serif italic text-[9px] text-vastu-text-2 truncate">{zone.deity}</div>
                <div className="text-[9px] text-vastu-text-3">{zone.element}</div>
                <div className="text-right">
                  <span className="font-mono text-[11px] text-vastu-text-2">{pct.toFixed(2)}</span>
                  <span className="font-mono text-[8px] text-vastu-text-3">%</span>
                  {hasCut && (
                    <div className="font-mono text-[7px]" style={{ color: "#e05050" }}>
                      ✕ {cutPct.toFixed(2)}% cut
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Cut Analysis ── */}
        {cutRows.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[11px] uppercase tracking-[1.5px] text-vastu-text-3 mb-4">Cut Analysis</h2>
            <div className="bg-bg-2 border border-[rgba(100,70,20,0.15)] rounded-[10px] overflow-hidden">
              <div className="grid grid-cols-[20px_80px_60px_1fr_80px] gap-3 px-4 py-2 border-b border-[rgba(100,70,20,0.12)] text-[8px] uppercase tracking-[1px] text-vastu-text-3">
                <div />
                <div>Cut</div>
                <div>Zone</div>
                <div>Bar</div>
                <div className="text-right">% of plan</div>
              </div>
              {cutRows.map(row => (
                <div
                  key={row.id}
                  className="grid grid-cols-[20px_80px_60px_1fr_80px] gap-3 px-4 py-[9px] items-center border-b border-[rgba(100,70,20,0.07)] hover:bg-[rgba(100,70,20,0.06)] transition-colors"
                >
                  <div className="w-[5px] h-[20px] rounded-[2px]" style={{ background: "#e05050", opacity: 0.6 }} />
                  <div className="font-mono text-[10px] text-vastu-text-3">{row.label}</div>
                  <div
                    className="text-[8px] font-mono px-[5px] py-[2px] rounded-[3px] w-fit"
                    style={{ background: "rgba(100,70,20,0.14)", color: "var(--gold-3)" }}
                  >
                    {row.primaryZone}
                  </div>
                  <div className="flex items-center">
                    <div
                      className="h-[4px] rounded-[2px]"
                      style={{
                        width: `${(row.pctOfCombined / maxCutPct) * 100}%`,
                        background: "#e05050",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <div className="text-right font-mono text-[11px] text-vastu-text-2">
                    {row.pctOfCombined.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
