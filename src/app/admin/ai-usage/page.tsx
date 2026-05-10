"use client";

import { useEffect, useState } from "react";

interface UserStats {
  id: string;
  full_name: string;
  email: string;
  plan: string;
  messages: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export default function AdminAiUsagePage() {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/stats").then((r) => r.json()),
    ]).then(([usersRes, statsRes]) => {
      const allUsers = usersRes.data ?? [];
      const stats = statsRes.data ?? {};

      const enriched: UserStats[] = allUsers.map((u: Record<string, unknown>) => ({
        id:            u.id,
        full_name:     (u.full_name as string) || "—",
        email:         u.email as string,
        plan:          ((u.subscriptions as Record<string, unknown>)?.plan as string) ?? "starter",
        messages:      0,
        inputTokens:   0,
        outputTokens:  0,
        estimatedCost: 0,
      }));

      setUsers(enriched);
      setLoading(false);
      void stats;
    }).catch(() => setLoading(false));
  }, []);

  const totalInput  = users.reduce((s, u) => s + u.inputTokens, 0);
  const totalOutput = users.reduce((s, u) => s + u.outputTokens, 0);
  const totalCost   = (totalInput / 1_000_000) * 3 + (totalOutput / 1_000_000) * 15;

  const PLAN_COLORS: Record<string, string> = {
    starter: "text-vastu-text-3",
    professional: "text-amber-700",
    firm: "text-gold-2",
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[rgba(100,70,20,0.12)] bg-bg-2 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[22px] font-semibold text-gold-2">AI Usage</h1>
          <p className="text-[11px] text-vastu-text-3 mt-[2px]">Token consumption and estimated API cost</p>
        </div>
      </div>

      <div className="p-8 flex flex-col gap-6">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Input Tokens",  value: totalInput.toLocaleString(),   sub: "Cumulative all time" },
            { label: "Total Output Tokens", value: totalOutput.toLocaleString(),  sub: "Cumulative all time" },
            { label: "Est. API Cost",       value: `$${totalCost.toFixed(3)}`,   sub: "Claude Sonnet 4 rates" },
          ].map((c) => (
            <div key={c.label} className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] p-5">
              <div className="text-[10px] text-vastu-text-3 uppercase tracking-[1.5px]">{c.label}</div>
              <div className="font-serif text-[26px] text-vastu-text mt-1 leading-none">{c.value}</div>
              <div className="text-[10px] text-vastu-text-3 mt-1">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Pricing reference */}
        <div className="bg-[rgba(100,70,20,0.05)] border border-[rgba(100,70,20,0.15)] rounded-[8px] px-5 py-3">
          <div className="text-[10px] text-vastu-text-3 font-sans">
            Pricing reference — Claude Sonnet 4: <span className="font-mono text-vastu-text-2">$3.00 / M input tokens</span> · <span className="font-mono text-vastu-text-2">$15.00 / M output tokens</span>. Token counts logged via <span className="font-mono">/api/chat</span> calls. Historic messages before logging was enabled show 0.
          </div>
        </div>

        {/* Per-user table */}
        <div className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] overflow-hidden">
          <div className="grid text-[9px] text-vastu-text-3 uppercase tracking-[1.5px] px-5 py-3 border-b border-[rgba(100,70,20,0.12)] bg-bg-3"
            style={{ gridTemplateColumns: "2fr 1.2fr 100px 120px 120px 100px" }}>
            <span>User</span>
            <span>Email</span>
            <span>Plan</span>
            <span>Input Tokens</span>
            <span>Output Tokens</span>
            <span>Est. Cost</span>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-[12px] text-vastu-text-3">Loading…</div>
          ) : users.length === 0 ? (
            <div className="px-5 py-10 text-center text-[12px] text-vastu-text-3">No data yet</div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="grid items-center px-5 py-3 border-b border-[rgba(100,70,20,0.08)] hover:bg-[rgba(100,70,20,0.04)] transition-colors duration-100"
                style={{ gridTemplateColumns: "2fr 1.2fr 100px 120px 120px 100px" }}
              >
                <div className="text-[12px] text-vastu-text font-sans">{u.full_name}</div>
                <div className="text-[11px] text-vastu-text-2 font-mono truncate">{u.email}</div>
                <div className={`text-[11px] font-medium ${PLAN_COLORS[u.plan] ?? "text-vastu-text-3"}`}>{u.plan}</div>
                <div className="text-[11px] text-vastu-text-2 font-mono">{u.inputTokens.toLocaleString()}</div>
                <div className="text-[11px] text-vastu-text-2 font-mono">{u.outputTokens.toLocaleString()}</div>
                <div className="text-[11px] text-vastu-text-2 font-mono">${u.estimatedCost.toFixed(4)}</div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
