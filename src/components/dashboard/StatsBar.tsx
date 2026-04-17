"use client";

import { useProjectStore } from "@/store/projectStore";

export default function StatsBar() {
  const projects = useProjectStore((s) => s.projects);

  const total   = projects.length;
  const active  = projects.filter((p) => p.status === "active").length;
  const clients = new Set(projects.map((p) => p.clientName)).size;
  const done    = projects.filter((p) => p.status === "done").length;

  const stats = [
    { label: "Total Projects", value: total,   sub: total > 0 ? "↑ Growing" : "Get started" },
    { label: "Active",         value: active,   sub: "In analysis" },
    { label: "Clients",        value: clients,  sub: "Managed" },
    { label: "Reports",        value: done,     sub: "Completed" },
  ];

  return (
    <div className="grid grid-cols-4 gap-[11px] mb-[13px]">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[9px] px-4 py-[14px] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gold-3 via-saffron to-transparent" />
          <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1.5px] mb-[5px]">{s.label}</div>
          <div className="font-serif text-[30px] font-medium text-gold-2 leading-none">{s.value}</div>
          <div className="text-[9px] text-vastu-text-3 mt-[2px]">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
