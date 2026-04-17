"use client";

import { useProjectStore } from "@/store/projectStore";
import CollapsibleCard from "@/components/ui/CollapsibleCard";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AnalyticsCard() {
  const projects = useProjectStore((s) => s.projects);

  // Projects per month (last 6 months)
  const now = new Date();
  const monthBuckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const label = MONTHS[d.getMonth()];
    const count = projects.filter((p) => {
      const pd = new Date(p.createdAt);
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
    }).length;
    return { label, count };
  });

  const maxCount = Math.max(...monthBuckets.map((b) => b.count), 1);

  return (
    <CollapsibleCard title={<>◉ Analytics</>} right={<span className="text-[10px] text-vastu-text-3">This Quarter</span>}>
      <div className="grid grid-cols-2 gap-[18px]">
        <div>
          <div className="text-[9px] text-vastu-text-3 mb-1">Projects / Month</div>
          <div className="flex items-end gap-[3px] h-[48px] pt-1">
            {monthBuckets.map((b) => (
              <div
                key={b.label}
                className="flex-1 rounded-t-[2px] cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  height: `${(b.count / maxCount) * 100}%`,
                  minHeight: b.count > 0 ? "4px" : "2px",
                  background: b.count > 0
                    ? "linear-gradient(to top, #a08050, #e8912a)"
                    : "rgba(100,70,20,0.15)",
                }}
              />
            ))}
          </div>
          <div className="flex gap-[3px] mt-[3px]">
            {monthBuckets.map((b) => (
              <div key={b.label} className="flex-1 text-center text-[7px] text-vastu-text-3 font-mono">
                {b.label}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-vastu-text-3 mb-2">Zone Issues Detected</div>
          {projects.length === 0 ? (
            <div className="text-[11px] text-vastu-text-2 pt-1">
              Start your first analysis to see zone data here.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {["critical", "warning", "good"].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: s === "critical" ? "#c04040" : s === "warning" ? "#c8a028" : "#4a8a4a",
                    }}
                  />
                  <span className="text-[9px] text-vastu-text-3 capitalize flex-1">{s}</span>
                  <span className="text-[9px] font-mono text-vastu-text-2">0</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CollapsibleCard>
  );
}
