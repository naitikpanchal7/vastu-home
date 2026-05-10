"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Stats {
  totalUsers: number;
  totalProjects: number;
  totalReports: number;
  totalMessages: number;
  newUsersThisWeek: number;
  revenueInr: number;
  aiTokensInput: number;
  aiTokensOutput: number;
  estimatedCostUsd: number;
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={cn(
      "bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] p-5 flex flex-col gap-1",
      accent && "border-gold-3 bg-[rgba(154,120,32,0.05)]"
    )}>
      <div className="text-[10px] text-vastu-text-3 uppercase tracking-[1.5px] font-sans">{label}</div>
      <div className="font-serif text-[28px] font-semibold text-vastu-text leading-none mt-1">{value}</div>
      {sub && <div className="text-[10px] text-vastu-text-3 font-sans mt-[2px]">{sub}</div>}
    </div>
  );
}

const QUICK_LINKS = [
  { label: "View All Users",    href: "/admin/users"    },
  { label: "Manage Tiers",      href: "/admin/tiers"    },
  { label: "Audit Log",         href: "/admin/activity" },
  { label: "AI Usage",          href: "/admin/ai-usage" },
  { label: "Settings",          href: "/admin/settings" },
];

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((r) => { setStats(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString("en-IN");

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[rgba(100,70,20,0.12)] bg-bg-2 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[22px] font-semibold text-gold-2">Overview</h1>
          <p className="text-[11px] text-vastu-text-3 mt-[2px]">Platform health at a glance</p>
        </div>
        <div className="text-[10px] text-vastu-text-3 font-mono">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      <div className="p-8 flex flex-col gap-7">

        {/* Primary stats */}
        <div>
          <div className="text-[9px] text-vastu-text-3 uppercase tracking-[2px] mb-3">Platform</div>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Users"      value={loading ? "—" : fmt(stats?.totalUsers ?? 0)}    sub={`+${stats?.newUsersThisWeek ?? 0} this week`} />
            <StatCard label="Total Projects"   value={loading ? "—" : fmt(stats?.totalProjects ?? 0)} />
            <StatCard label="Reports Generated" value={loading ? "—" : fmt(stats?.totalReports ?? 0)} />
            <StatCard label="AI Messages"      value={loading ? "—" : fmt(stats?.totalMessages ?? 0)} />
          </div>
        </div>

        {/* Revenue + AI cost */}
        <div>
          <div className="text-[9px] text-vastu-text-3 uppercase tracking-[2px] mb-3">Financials</div>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Total Revenue"
              value={loading ? "—" : `₹${fmt(stats?.revenueInr ?? 0)}`}
              sub="From captured payments"
              accent
            />
            <StatCard
              label="AI Input Tokens"
              value={loading ? "—" : fmt(stats?.aiTokensInput ?? 0)}
              sub="Cumulative across all users"
            />
            <StatCard
              label="Est. AI Cost"
              value={loading ? "—" : `$${(stats?.estimatedCostUsd ?? 0).toFixed(2)}`}
              sub="Claude Sonnet 4 pricing"
            />
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <div className="text-[9px] text-vastu-text-3 uppercase tracking-[2px] mb-3">Quick Access</div>
          <div className="flex gap-3 flex-wrap">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[7px] text-[12px] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2 transition-all duration-150 font-sans"
              >
                {link.label} →
              </a>
            ))}
          </div>
        </div>

        {/* Info strip */}
        <div className="bg-[rgba(154,120,32,0.06)] border border-[rgba(154,120,32,0.18)] rounded-[8px] px-5 py-3 flex items-center gap-3">
          <span className="text-[16px]">◈</span>
          <div>
            <div className="text-[11px] text-vastu-text font-medium font-sans">You are the platform administrator.</div>
            <div className="text-[10px] text-vastu-text-3 mt-[1px]">Actions taken here affect all users. Use impersonation and bulk actions with care.</div>
          </div>
        </div>

      </div>
    </div>
  );
}
