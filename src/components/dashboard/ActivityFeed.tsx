"use client";

import { useProjectStore } from "@/store/projectStore";
import CollapsibleCard from "@/components/ui/CollapsibleCard";

export default function ActivityFeed() {
  const projects = useProjectStore((s) => s.projects);

  // Generate activity items from project history
  const activities = projects
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      text: `Project "${p.name}" ${p.status === "done" ? "completed" : p.status === "active" ? "set to active" : "created"}`,
      time: new Date(p.updatedAt).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      }),
      color: p.status === "done" ? "#4a8a4a" : p.status === "active" ? "#4a90c4" : "#c8a028",
    }));

  return (
    <CollapsibleCard title={<>◎ Activity</>}>
      {activities.length === 0 ? (
        <div className="text-[11px] text-vastu-text-3 text-center py-3">No activity yet.</div>
      ) : (
        <div className="py-[2px]">
          {activities.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-2 py-[7px] border-b border-[rgba(200,175,120,0.08)] last:border-none"
            >
              <div
                className="w-[6px] h-[6px] rounded-full mt-1 flex-shrink-0"
                style={{ background: a.color }}
              />
              <div>
                <div className="text-[11px] text-vastu-text-2 leading-[1.5]">{a.text}</div>
                <div className="text-[9px] text-vastu-text-3 mt-[1px]">{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}
