"use client";

import { useProjectStore } from "@/store/projectStore";
import CollapsibleCard from "@/components/ui/CollapsibleCard";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AnalyticsCard() {
  const projects = useProjectStore((s) => s.projects);

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

  const total   = projects.length;
  const drafts  = projects.filter((p) => p.status === "draft").length;
  const active  = projects.filter((p) => p.status === "active").length;
  const done    = projects.filter((p) => p.status === "done").length;

  const statusRows = [
    { label: "Draft",  count: drafts, color: "#706050", bg: "rgba(112,96,80,0.15)" },
    { label: "Active", count: active, color: "#c8af78", bg: "rgba(200,175,120,0.15)" },
    { label: "Done",   count: done,   color: "#4a8a4a", bg: "rgba(74,138,74,0.15)" },
  ];

  return (
    <CollapsibleCard
      title={<>◉ Analytics</>}
      right={<span className="text-[10px] text-vastu-text-3">Last 6 months</span>}
    >
      <div className="flex flex-col gap-5">
        {/* Bar chart */}
        <div>
          <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1px] mb-3">Projects / Month</div>
          <div className="flex items-end gap-[5px] h-[64px]">
            {monthBuckets.map((b) => (
              <div key={b.label} className="flex-1 flex flex-col items-center gap-[4px]">
                <div
                  className="w-full rounded-t-[3px] transition-opacity hover:opacity-75 cursor-default"
                  style={{
                    height: `${(b.count / maxCount) * 100}%`,
                    minHeight: b.count > 0 ? "6px" : "3px",
                    background: b.count > 0
                      ? "linear-gradient(to top, #a08050, #e8912a)"
                      : "rgba(100,70,20,0.12)",
                  }}
                  title={`${b.count} project${b.count !== 1 ? "s" : ""}`}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-[5px] mt-[5px]">
            {monthBuckets.map((b) => (
              <div key={b.label} className="flex-1 text-center text-[8px] text-vastu-text-3 font-mono">
                {b.label}
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[rgba(200,175,120,0.08)]" />

        {/* Status breakdown */}
        <div>
          <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1px] mb-3">Project Status</div>
          {total === 0 ? (
            <div className="text-[10px] text-vastu-text-3 italic">No projects yet — create one to get started.</div>
          ) : (
            <div className="flex flex-col gap-[8px]">
              {statusRows.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-[9px] text-vastu-text-3 w-10 shrink-0">{s.label}</span>
                  <div className="flex-1 h-[5px] rounded-full bg-bg-4 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: total > 0 ? `${(s.count / total) * 100}%` : "0%",
                        background: s.color,
                        opacity: s.count === 0 ? 0.25 : 1,
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-vastu-text-2 w-5 text-right shrink-0">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CollapsibleCard>
  );
}
