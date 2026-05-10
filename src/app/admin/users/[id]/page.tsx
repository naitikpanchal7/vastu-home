"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface UserDetail {
  profile: Record<string, unknown>;
  subscription: Record<string, unknown>;
  projects: Array<{ id: string; name: string; status: string; created_at: string }>;
  activity: Array<{ id: string; action: string; label: string; created_at: string }>;
  aiUsage: { totalInput: number; totalOutput: number };
}

const PLANS = ["starter", "professional", "firm"];
const PLAN_COLORS: Record<string, string> = {
  starter: "bg-bg-4 text-vastu-text-3",
  professional: "bg-amber-100 text-amber-800",
  firm: "bg-[rgba(154,120,32,0.15)] text-gold-2",
};

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((r) => {
        setData(r.data);
        setSelectedPlan((r.data?.subscription?.plan as string) ?? "starter");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const applyPlan = async () => {
    setSaving(true);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: selectedPlan }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  if (loading) return <div className="flex-1 flex items-center justify-center text-vastu-text-3 text-[12px]">Loading…</div>;
  if (!data) return <div className="flex-1 flex items-center justify-center text-vastu-text-3 text-[12px]">User not found</div>;

  const { profile, subscription, projects, activity, aiUsage } = data;
  const plan = (subscription?.plan as string) ?? "starter";

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[rgba(100,70,20,0.12)] bg-bg-2 flex items-center gap-4">
        <button onClick={() => router.push("/admin/users")} className="text-vastu-text-3 hover:text-vastu-text-2 text-[11px] transition-colors cursor-pointer">← Back</button>
        <div className="h-4 w-px bg-[rgba(100,70,20,0.20)]" />
        <div>
          <h1 className="font-serif text-[20px] font-semibold text-gold-2">{(profile.full_name as string) || "Unnamed User"}</h1>
          <p className="text-[11px] text-vastu-text-3 font-mono">{profile.email as string}</p>
        </div>
        <span className={cn("ml-auto text-[9px] px-2 py-[3px] rounded-full font-medium uppercase tracking-[0.5px]", PLAN_COLORS[plan])}>
          {plan}
        </span>
      </div>

      <div className="p-8 grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>

        {/* Profile card */}
        <div className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] p-5">
          <div className="text-[9px] text-vastu-text-3 uppercase tracking-[2px] mb-4">Profile</div>
          {[
            ["Firm",        profile.firm_name],
            ["City",        profile.city],
            ["Phone",       profile.phone],
            ["Joined",      profile.created_at ? fmtDate(profile.created_at as string) : "—"],
            ["Admin",       profile.is_admin ? "Yes" : "No"],
          ].map(([label, val]) => (
            <div key={label as string} className="flex justify-between py-[7px] border-b border-[rgba(100,70,20,0.08)] last:border-0">
              <span className="text-[11px] text-vastu-text-3">{String(label)}</span>
              <span className="text-[11px] text-vastu-text font-mono">{(val as string) || "—"}</span>
            </div>
          ))}
        </div>

        {/* Subscription + change plan */}
        <div className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] p-5">
          <div className="text-[9px] text-vastu-text-3 uppercase tracking-[2px] mb-4">Subscription</div>
          {[
            ["Plan",           plan],
            ["Projects Used",  `${subscription?.projects_used ?? 0} / ${subscription?.projects_limit === -1 ? "∞" : subscription?.projects_limit}`],
            ["Reports Used",   `${subscription?.reports_used ?? 0} / ${subscription?.reports_limit === -1 ? "∞" : subscription?.reports_limit}`],
            ["Renews At",      subscription?.renews_at ? fmtDate(subscription.renews_at as string) : "—"],
            ["Razorpay ID",    (subscription?.razorpay_subscription_id as string) || "Manual / None"],
          ].map(([label, val]) => (
            <div key={label as string} className="flex justify-between py-[7px] border-b border-[rgba(100,70,20,0.08)] last:border-0">
              <span className="text-[11px] text-vastu-text-3">{label}</span>
              <span className="text-[11px] text-vastu-text font-mono">{val as string}</span>
            </div>
          ))}
          {/* Change plan inline */}
          <div className="mt-4 pt-4 border-t border-[rgba(100,70,20,0.12)] flex items-center gap-2">
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="flex-1 px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[6px] text-[11px] text-vastu-text outline-none focus:border-gold-3"
            >
              {PLANS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <button
              onClick={applyPlan}
              disabled={saving || selectedPlan === plan}
              className="px-3 py-[6px] text-[11px] bg-gold-2 text-[#faf7f0] rounded-[6px] hover:bg-gold disabled:opacity-40 transition-all cursor-pointer font-medium"
            >
              {saved ? "Saved ✓" : saving ? "Saving…" : "Apply"}
            </button>
          </div>
        </div>

        {/* AI Usage */}
        <div className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] p-5">
          <div className="text-[9px] text-vastu-text-3 uppercase tracking-[2px] mb-4">AI Usage</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="font-serif text-[24px] text-vastu-text">{(aiUsage.totalInput ?? 0).toLocaleString()}</div>
              <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1px] mt-1">Input Tokens</div>
            </div>
            <div className="text-center">
              <div className="font-serif text-[24px] text-vastu-text">{(aiUsage.totalOutput ?? 0).toLocaleString()}</div>
              <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1px] mt-1">Output Tokens</div>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] p-5">
          <div className="text-[9px] text-vastu-text-3 uppercase tracking-[2px] mb-4">Projects ({projects?.length ?? 0})</div>
          <div className="flex flex-col gap-[6px] max-h-[180px] overflow-y-auto">
            {(projects ?? []).length === 0 ? (
              <div className="text-[11px] text-vastu-text-3">No projects yet</div>
            ) : (projects ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-[5px] border-b border-[rgba(100,70,20,0.08)] last:border-0">
                <span className="text-[11px] text-vastu-text truncate">{p.name}</span>
                <span className="text-[9px] text-vastu-text-3 ml-3 flex-shrink-0">{fmtDate(p.created_at)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity — full width */}
        <div className="col-span-2 bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] p-5">
          <div className="text-[9px] text-vastu-text-3 uppercase tracking-[2px] mb-4">Recent Activity</div>
          <div className="flex flex-col gap-[4px] max-h-[200px] overflow-y-auto">
            {(activity ?? []).length === 0 ? (
              <div className="text-[11px] text-vastu-text-3">No activity logged</div>
            ) : (activity ?? []).map((a) => (
              <div key={a.id} className="flex items-start justify-between py-[5px] border-b border-[rgba(100,70,20,0.08)] last:border-0 gap-4">
                <span className="text-[11px] text-vastu-text-2 flex-1">{a.label}</span>
                <span className="text-[10px] text-vastu-text-3 font-mono flex-shrink-0">{fmtDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
