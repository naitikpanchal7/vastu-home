"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  firm_name?: string;
  city?: string;
  is_admin: boolean;
  suspended_at?: string | null;
  created_at: string;
  projectCount: number;
  subscriptions: {
    plan: string;
    projects_used: number;
    projects_limit: number;
    renews_at?: string;
  } | null;
}

const PLAN_COLORS: Record<string, string> = {
  starter:      "bg-bg-4 text-vastu-text-3",
  professional: "bg-amber-100 text-amber-800",
  firm:         "bg-[rgba(154,120,32,0.15)] text-gold-2",
};

const PLANS = ["starter", "professional", "firm"];

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [changingPlan, setChangingPlan] = useState<{ userId: string; current: string } | null>(null);
  const [newPlan, setNewPlan] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (planFilter) params.set("plan", planFilter);
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((r) => { setUsers(r.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, planFilter]);

  useEffect(() => { load(); }, [load]);

  const handleChangePlan = async () => {
    if (!changingPlan || !newPlan) return;
    await fetch(`/api/admin/users/${changingPlan.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: newPlan }),
    });
    setChangingPlan(null);
    setNewPlan("");
    load();
  };

  const handleSuspend = async (userId: string, suspend: boolean) => {
    const reason = suspend ? prompt("Reason for suspension (optional):") ?? "" : "";
    await fetch(`/api/admin/users/${userId}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspend, reason }),
    });
    load();
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[rgba(100,70,20,0.12)] bg-bg-2 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[22px] font-semibold text-gold-2">Users</h1>
          <p className="text-[11px] text-vastu-text-3 mt-[2px]">{users.length} total accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[6px] text-[12px] text-vastu-text font-sans outline-none focus:border-gold-3 w-[220px]"
          />
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[6px] text-[12px] text-vastu-text font-sans outline-none focus:border-gold-3"
          >
            <option value="">All plans</option>
            {PLANS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="p-8">
        <div className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] overflow-hidden">
          {/* Column headers */}
          <div className="grid text-[9px] text-vastu-text-3 uppercase tracking-[1.5px] px-5 py-3 border-b border-[rgba(100,70,20,0.12)] bg-bg-3"
            style={{ gridTemplateColumns: "2fr 1.5fr 100px 80px 80px 160px" }}>
            <span>User</span>
            <span>Email</span>
            <span>Plan</span>
            <span>Projects</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-[12px] text-vastu-text-3">Loading…</div>
          ) : users.length === 0 ? (
            <div className="px-5 py-10 text-center text-[12px] text-vastu-text-3">No users found</div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="grid items-center px-5 py-3 border-b border-[rgba(100,70,20,0.08)] hover:bg-[rgba(100,70,20,0.04)] transition-colors duration-100"
                style={{ gridTemplateColumns: "2fr 1.5fr 100px 80px 80px 160px" }}
              >
                {/* Name */}
                <div>
                  <div className="text-[12px] text-vastu-text font-medium font-sans flex items-center gap-2">
                    {u.full_name || "—"}
                    {u.is_admin && (
                      <span className="text-[8px] px-[5px] py-[2px] rounded-full bg-[rgba(154,120,32,0.18)] text-gold-2 uppercase tracking-[1px]">Admin</span>
                    )}
                  </div>
                  {u.firm_name && <div className="text-[10px] text-vastu-text-3">{u.firm_name}</div>}
                </div>

                {/* Email */}
                <div className="text-[11px] text-vastu-text-2 font-mono truncate">{u.email}</div>

                {/* Plan badge */}
                <div>
                  <span className={cn("text-[9px] px-2 py-[3px] rounded-full font-medium uppercase tracking-[0.5px]", PLAN_COLORS[u.subscriptions?.plan ?? "starter"] ?? PLAN_COLORS.starter)}>
                    {u.subscriptions?.plan ?? "starter"}
                  </span>
                </div>

                {/* Projects */}
                <div className="text-[12px] text-vastu-text-2 font-mono">{u.projectCount}</div>

                {/* Joined */}
                <div className="text-[11px] text-vastu-text-3 font-mono">{fmtDate(u.created_at)}</div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() => router.push(`/admin/users/${u.id}`)}
                    className="text-[10px] px-2 py-[4px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2 transition-all duration-100 cursor-pointer"
                  >
                    View
                  </button>
                  <button
                    onClick={() => { setChangingPlan({ userId: u.id, current: u.subscriptions?.plan ?? "starter" }); setNewPlan(u.subscriptions?.plan ?? "starter"); }}
                    className="text-[10px] px-2 py-[4px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2 transition-all duration-100 cursor-pointer"
                  >
                    Plan
                  </button>
                  {!u.is_admin && (
                    <button
                      onClick={() => handleSuspend(u.id, !u.suspended_at)}
                      className={cn(
                        "text-[10px] px-2 py-[4px] rounded-[5px] border transition-all duration-100 cursor-pointer",
                        u.suspended_at
                          ? "bg-green-50 border-green-300 text-green-800 hover:bg-green-100"
                          : "bg-bg-3 border-[rgba(100,70,20,0.20)] text-[#b43218] hover:border-[rgba(180,50,30,0.4)]"
                      )}
                    >
                      {u.suspended_at ? "Reactivate" : "Suspend"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Change plan modal */}
      {changingPlan && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setChangingPlan(null)}>
          <div className="bg-bg border border-[rgba(100,70,20,0.20)] rounded-[12px] p-6 w-[340px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="font-serif text-[16px] text-gold-2 mb-1">Change Plan</div>
            <div className="text-[11px] text-vastu-text-3 mb-4">This changes only this user. Other users on the same plan are unaffected.</div>
            <select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              className="w-full px-3 py-2 bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[6px] text-[12px] text-vastu-text outline-none focus:border-gold-3 mb-4"
            >
              {PLANS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setChangingPlan(null)} className="px-4 py-[6px] text-[11px] text-vastu-text-2 border border-[rgba(100,70,20,0.20)] rounded-[6px] hover:border-gold-3 transition-all cursor-pointer">Cancel</button>
              <button onClick={handleChangePlan} className="px-4 py-[6px] text-[11px] bg-gold-2 text-[#faf7f0] rounded-[6px] hover:bg-gold transition-all cursor-pointer font-medium">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
