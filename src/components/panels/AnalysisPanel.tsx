"use client";

import { useCanvasStore } from "@/store/canvasStore";
import { VASTU_ZONES } from "@/lib/vastu/zones";
import { hexToRgba } from "@/lib/utils";
import Button from "@/components/ui/Button";

interface AnalysisPanelProps {
  onExport: () => void;
}

export default function AnalysisPanel({ onExport }: AnalysisPanelProps) {
  const { zoneAnalysis, northDeg, cuts, projectName, clientName } = useCanvasStore();

  const hasAnalysis = zoneAnalysis.length > 0;

  // Merge zone data with analysis results
  const rows = VASTU_ZONES.map((z) => {
    const result = zoneAnalysis.find((r) => r.zoneName === z.shortName);
    return {
      zone: z,
      pct: result?.pctOfTotal ?? 6.25,
      status: result?.status ?? "good",
      hasCut: result?.hasCut ?? false,
      cutPct: result?.cutPctOfZone ?? 0,
    };
  });

  const maxPct = Math.max(...rows.map((r) => r.pct), 10);

  return (
    <div className="flex flex-col h-full">
      {/* Header info */}
      <div className="text-[8px] text-vastu-text-3 mb-[6px] uppercase tracking-[1px]">
        {projectName || "Select a project"}
      </div>
      <div className="flex gap-[9px] mb-2 text-[9px] text-vastu-text-3">
        <span>N: <strong className="text-gold-2">{northDeg.toFixed(1)}°</strong></span>
        <span>Cuts: <strong className="text-[#c04040]">{cuts.length}</strong></span>
        <span>Ideal/zone: <strong className="text-vastu-text-2">6.25%</strong></span>
      </div>

      {/* Zone list */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {rows.map(({ zone, pct, status, hasCut, cutPct }) => (
          <div
            key={zone.shortName}
            className="group flex items-center gap-[5px] px-[3px] py-1 rounded-[4px] cursor-pointer hover:bg-[rgba(200,175,120,0.05)] relative"
          >
            {/* Zone color bar */}
            <div
              className="w-[6px] h-[22px] rounded-[2px] flex-shrink-0"
              style={{ background: zone.color }}
            />
            {/* Zone name */}
            <span className="font-mono text-[9px] text-vastu-text-2 w-[30px] flex-shrink-0">
              {zone.shortName}
            </span>
            {/* Bar */}
            <div className="flex-1">
              <div
                className="h-[3px] rounded-[2px]"
                style={{
                  width: `${(pct / maxPct) * 100}%`,
                  background: status === "good"
                    ? zone.color
                    : status === "warning"
                    ? "#c8a028"
                    : "#c04040",
                }}
              />
            </div>
            {/* Pct value */}
            <span className="font-mono text-[9px] text-vastu-text-3 w-8 text-right flex-shrink-0">
              {pct.toFixed(1)}%
            </span>
            {/* Status icon */}
            <span className="text-[9px] w-[14px] text-center flex-shrink-0">
              {status === "good" ? "✓" : status === "warning" ? "⚠" : "✕"}
            </span>

            {/* Tooltip */}
            <div className="hidden group-hover:block absolute left-full top-1/2 -translate-y-1/2 ml-[6px] bg-bg-2 border border-[rgba(200,175,120,0.15)] rounded-[6px] px-[10px] py-[7px] min-w-[180px] z-50 pointer-events-none">
              <div className="text-[10px] text-gold-2 font-medium mb-1">{zone.name}</div>
              <div className="text-[9px] text-vastu-text-2 leading-[1.7]">
                <span className="text-vastu-text-3">Deity:</span> {zone.deity}<br />
                <span className="text-vastu-text-3">Element:</span> {zone.element}<br />
                <span className="text-vastu-text-3">Governs:</span> {zone.governs}<br />
                <span className="text-vastu-text-3">Ideal:</span> {zone.idealUse[0]}
                {hasCut && (
                  <>
                    <br /><span className="text-[#e05050]">Cut: {cutPct.toFixed(1)}% of zone</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Zone bar chart */}
      <div className="mt-[9px] pt-2 border-t border-[rgba(200,175,120,0.08)]">
        <div className="text-[8px] text-vastu-text-3 mb-1">Zone Distribution</div>
        <div className="flex items-end gap-[2px] h-[56px]">
          {rows.map(({ zone, pct, status }) => (
            <div
              key={zone.shortName}
              className="flex-1 rounded-t-[2px] min-w-0"
              style={{
                height: `${Math.max((pct / maxPct) * 100, 4)}%`,
                background: status === "good" ? zone.color : status === "warning" ? "#c8a028" : "#c04040",
                opacity: 0.8,
              }}
            />
          ))}
        </div>
        <div className="flex gap-[2px] mt-[2px]">
          {rows.map(({ zone }) => (
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

      {/* Actions */}
      <div className="flex gap-[6px] mt-[9px]">
        <Button variant="ghost" className="flex-1 justify-center text-[10px] py-[5px]">
          ⊞ Table
        </Button>
        <Button variant="primary" className="flex-1 justify-center text-[10px] py-[5px]" onClick={onExport}>
          ⎙ Export
        </Button>
      </div>
    </div>
  );
}
