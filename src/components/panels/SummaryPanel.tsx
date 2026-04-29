"use client";

import { useCanvasStore } from "@/store/canvasStore";

export default function SummaryPanel() {
  const consultantSummary  = useCanvasStore((s) => s.consultantSummary);
  const consultantActions  = useCanvasStore((s) => s.consultantActions);
  const setConsultantSummary = useCanvasStore((s) => s.setConsultantSummary);
  const setConsultantActions = useCanvasStore((s) => s.setConsultantActions);

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Recommendations */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-vastu-text-3">
            Consultant Recommendations
          </span>
          <div className="flex-1 h-px bg-[rgba(200,175,120,0.08)]" />
        </div>
        <p className="text-[10px] font-sans text-vastu-text-3 leading-relaxed">
          Write your personalized Vastu assessment and remedy suggestions for this floor.
        </p>
        <textarea
          value={consultantSummary}
          onChange={(e) => setConsultantSummary(e.target.value)}
          placeholder="e.g. The North-East zone shows a significant extension which enhances mental clarity and wisdom. The South-West Brahmasthan is unobstructed — a strong foundation for the occupants..."
          className="w-full resize-none bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-md text-vastu-text font-sans text-[11px] leading-relaxed p-3 outline-none focus:border-gold-3 placeholder:text-vastu-text-3/50 transition-colors"
          style={{ minHeight: "220px" }}
        />
        <div className="flex justify-end">
          <span className="text-[9px] font-mono text-vastu-text-3/60">
            {consultantSummary.length} chars
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[rgba(200,175,120,0.08)]" />

      {/* Recommended Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-vastu-text-3">
            Recommended Actions
          </span>
          <div className="flex-1 h-px bg-[rgba(200,175,120,0.08)]" />
        </div>
        <p className="text-[10px] font-sans text-vastu-text-3 leading-relaxed">
          List specific remedies or actions — one per line. Each line becomes a bullet in the report.
        </p>
        <textarea
          value={consultantActions}
          onChange={(e) => setConsultantActions(e.target.value)}
          placeholder={"Place a Vastu pyramid in the South-West corner\nAvoid heavy furniture in the Brahmasthan\nInstall a water feature in the North-East zone\nUse earthy tones in the South-West bedroom"}
          className="w-full resize-none bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-md text-vastu-text font-sans text-[11px] leading-relaxed p-3 outline-none focus:border-gold-3 placeholder:text-vastu-text-3/50 transition-colors"
          style={{ minHeight: "160px" }}
        />
        <div className="flex justify-end">
          <span className="text-[9px] font-mono text-vastu-text-3/60">
            {consultantActions.split("\n").filter((l) => l.trim()).length} action
            {consultantActions.split("\n").filter((l) => l.trim()).length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Report hint */}
      <div className="mt-auto flex items-start gap-2 p-3 rounded-md bg-[rgba(200,175,120,0.04)] border border-[rgba(200,175,120,0.08)]">
        <span className="text-[9px] text-gold-3 mt-[1px]">✦</span>
        <p className="text-[9px] font-sans text-vastu-text-3 leading-relaxed">
          This content appears on the <span className="text-gold-3">Consultant Summary</span> page of the generated report.
        </p>
      </div>
    </div>
  );
}
