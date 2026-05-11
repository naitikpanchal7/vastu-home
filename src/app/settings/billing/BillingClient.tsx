"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import AppShell from "@/components/layout/AppShell";
import Topbar from "@/components/layout/Topbar";

interface Tier {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  projects_limit: number;
  ai_messages_limit: number;
  pdf_exports_limit: number;
  storage_limit_gb: number;
  ai_chat_enabled: boolean;
  pdf_export_enabled: boolean;
  white_label_enabled: boolean;
  priority_support: boolean;
}

interface BillingStatus {
  subscription: {
    plan: string;
    projects_used: number;
    projects_limit: number;
    reports_used: number;
    reports_limit: number;
    renews_at: string | null;
  } | null;
  tier: Tier | null;
  aiUsedThisMonth: number;
}

function UsageRow({
  label, used, limit, unit = "",
}: {
  label: string; used: number; limit: number; unit?: string;
}) {
  const unlimited = limit < 0;
  const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);
  const color = pct >= 100 ? "bg-[#b43218]" : pct >= 80 ? "bg-saffron" : "bg-gradient-to-r from-gold-3 to-saffron";

  return (
    <div>
      <div className="flex justify-between text-[11px] mb-[5px]">
        <span className="text-vastu-text-2">{label}</span>
        <span className={cn("font-mono", pct >= 80 && !unlimited ? "text-saffron" : "text-vastu-text-3")}>
          {unlimited ? `${used}${unit} / ∞` : `${used}${unit} / ${limit}${unit}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-[4px] bg-bg-4 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
        </div>
      )}
      {unlimited && (
        <div className="h-[4px] bg-bg-4 rounded-full overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-gold-3 to-saffron opacity-20 rounded-full" />
        </div>
      )}
    </div>
  );
}

function FeatureRow({ label, enabled, value }: { label: string; enabled: boolean; value?: string }) {
  return (
    <div className="flex items-center justify-between py-[6px] border-b border-[rgba(100,70,20,0.08)] last:border-0">
      <span className={cn("text-[11px]", enabled ? "text-vastu-text-2" : "text-vastu-text-3 line-through")}>{label}</span>
      <span className={cn("text-[11px] font-mono", enabled ? "text-green-600" : "text-vastu-text-3")}>
        {value ?? (enabled ? "✓" : "—")}
      </span>
    </div>
  );
}

export default function BillingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (reason) {
      setTimeout(() => {
        document.getElementById("usage-section")?.scrollIntoView({ behavior: "smooth" });
      }, 400);
    }

    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((r) => {
        if (r.error) setError(r.error);
        else setStatus(r.data);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load billing info"); setLoading(false); });
  }, []);

  const reasonMessages: Record<string, string> = {
    projects_limit:  "You've reached your project limit. Upgrade to create more projects.",
    ai_limit:        "You've reached your monthly AI message limit. Upgrade for more.",
    reports_limit:   "You've reached your report limit. Upgrade to export more reports.",
    pdf_disabled:    "PDF export is not available on your current plan. Upgrade to enable it.",
    ai_disabled:     "Vastu AI chat is not available on your current plan. Upgrade to enable it.",
  };
  const tier = status?.tier;
  const sub = status?.subscription;

  return (
    <AppShell>
      <Topbar title="Billing" subtitle="Your plan, usage, and subscription details" />

      <div className="flex-1 overflow-y-auto p-[18px]">
        <div className="max-w-[640px] flex flex-col gap-[14px]">

          {/* Limit reason banner */}
          {reason && reasonMessages[reason] && (
            <div className="bg-[rgba(200,130,30,0.08)] border border-[rgba(200,130,30,0.25)] rounded-[9px] px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-saffron leading-relaxed">{reasonMessages[reason]}</span>
              <button
                onClick={() => router.push("/pricing")}
                className="text-[10px] px-3 py-[5px] bg-gold text-bg rounded-[6px] font-medium hover:bg-gold-2 transition-colors cursor-pointer flex-shrink-0"
              >
                View Plans →
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16 text-vastu-text-3 text-[12px]">Loading…</div>
          )}

          {error && !loading && (
            <div className="text-[11px] text-red-400 py-4">{error}</div>
          )}

          {!loading && status && (
            <>
              {/* Current plan card */}
              <div className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1.5px] mb-1">Current Plan</div>
                    <div className="font-serif text-[26px] font-semibold text-gold-2 leading-none mb-1">
                      {tier?.name ?? sub?.plan ?? "Starter"}
                    </div>
                    <div className="text-[10px] text-vastu-text-3 leading-relaxed max-w-[280px]">
                      {tier?.description ?? "Your current plan"}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {tier && tier.price_monthly > 0 ? (
                      <>
                        <div className="font-serif text-[22px] font-semibold text-vastu-text">
                          ₹{tier.price_monthly.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[9px] text-vastu-text-3">per month</div>
                      </>
                    ) : (
                      <div className="font-serif text-[22px] font-semibold text-vastu-text">Free</div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-[rgba(100,70,20,0.10)] mb-4" />

                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-vastu-text-3">
                    {sub?.renews_at
                      ? `Renews ${new Date(sub.renews_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`
                      : "No active subscription · billed manually"}
                  </div>
                  <button
                    onClick={() => router.push("/pricing")}
                    className="text-[10px] px-3 py-[5px] bg-gold text-bg rounded-[6px] font-medium hover:bg-gold-2 transition-colors cursor-pointer"
                  >
                    View All Plans →
                  </button>
                </div>
              </div>

              {/* Usage */}
              <div id="usage-section" className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] p-5">
                <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1.5px] mb-4">Usage This Month</div>
                <div className="flex flex-col gap-4">
                  <UsageRow
                    label="Projects"
                    used={sub?.projects_used ?? 0}
                    limit={sub?.projects_limit ?? -1}
                  />
                  {tier?.pdf_export_enabled ? (
                    <UsageRow
                      label="PDF Exports"
                      used={sub?.reports_used ?? 0}
                      limit={sub?.reports_limit ?? -1}
                    />
                  ) : (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-vastu-text-3">PDF Exports</span>
                      <span className="text-vastu-text-3 italic">Not included in your plan</span>
                    </div>
                  )}
                  {tier?.ai_chat_enabled ? (
                    <UsageRow
                      label="AI Messages"
                      used={status.aiUsedThisMonth}
                      limit={tier?.ai_messages_limit ?? -1}
                    />
                  ) : (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-vastu-text-3">AI Messages</span>
                      <span className="text-vastu-text-3 italic">Not included in your plan</span>
                    </div>
                  )}
                </div>
                <div className="text-[9px] text-vastu-text-3 mt-4">
                  Usage resets on the 1st of each month. Projects count is cumulative.
                </div>
              </div>

              {/* Features included */}
              {tier && (
                <div className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] p-5">
                  <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1.5px] mb-3">Included in Your Plan</div>
                  <div className="flex flex-col">
                    <FeatureRow label="Projects"            enabled={true}                       value={tier.projects_limit < 0 ? "Unlimited" : `Up to ${tier.projects_limit}`} />
                    <FeatureRow label="AI Messages/month"   enabled={tier.ai_chat_enabled}        value={tier.ai_messages_limit < 0 ? "Unlimited" : `${tier.ai_messages_limit}`} />
                    <FeatureRow label="PDF Exports/month"   enabled={tier.pdf_export_enabled}     value={tier.pdf_exports_limit < 0 ? "Unlimited" : tier.pdf_export_enabled ? `${tier.pdf_exports_limit}` : undefined} />
                    <FeatureRow label="Vastu AI Chat"       enabled={tier.ai_chat_enabled} />
                    <FeatureRow label="White-label Reports" enabled={tier.white_label_enabled} />
                    <FeatureRow label="Priority Support"    enabled={tier.priority_support} />
                  </div>
                </div>
              )}

              {/* Upgrade / contact section */}
              <div className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] p-5">
                <div className="text-[13px] text-vastu-text font-medium mb-1">Want to upgrade or change your plan?</div>
                <div className="text-[10px] text-vastu-text-3 mb-4 leading-relaxed">
                  Online billing is coming soon. Until then, upgrades are activated manually within 24 hours.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push("/pricing")}
                    className="px-4 py-[8px] bg-gold text-bg rounded-[8px] text-[11px] font-medium hover:bg-gold-2 transition-colors cursor-pointer"
                  >
                    Compare Plans
                  </button>
                  <a
                    href="mailto:support@astraavastu.com?subject=Plan Upgrade Request"
                    className="px-4 py-[8px] border border-[rgba(100,70,20,0.20)] text-vastu-text-2 rounded-[8px] text-[11px] hover:border-gold-3 hover:text-vastu-text transition-colors"
                  >
                    Contact Support
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
