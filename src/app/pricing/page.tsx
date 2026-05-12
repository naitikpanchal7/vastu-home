"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
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
  razorpay_plan_id_monthly: string | null;
  razorpay_plan_id_yearly: string | null;
}

function fmtLimit(val: number, unit = "") {
  if (val < 0) return "Unlimited";
  return `${val}${unit}`;
}

function fmtPrice(price: number) {
  if (price === 0) return "Free";
  return `₹${price.toLocaleString("en-IN")}`;
}

export default function PricingPage() {
  const router = useRouter();
  const { subscription, loading: userLoading } = useUser();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [upgradeModal, setUpgradeModal] = useState<Tier | null>(null);

  useEffect(() => {
    fetch("/api/tiers")
      .then((r) => r.json())
      .then((r) => { setTiers(r.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const currentPlan = subscription?.plan ?? "starter";

  const FEATURES = [
    { key: "projects_limit",    label: "Projects",          format: (t: Tier) => fmtLimit(t.projects_limit) },
    { key: "ai_messages_limit", label: "AI Messages/month",  format: (t: Tier) => fmtLimit(t.ai_messages_limit) },
    { key: "pdf_exports_limit", label: "PDF Exports/month",  format: (t: Tier) => t.pdf_export_enabled ? fmtLimit(t.pdf_exports_limit) : "—" },
    { key: "ai_chat_enabled",   label: "Vastu AI Chat",      format: (t: Tier) => t.ai_chat_enabled   ? "✓" : "—" },
    { key: "pdf_export_enabled", label: "PDF Report Export", format: (t: Tier) => t.pdf_export_enabled ? "✓" : "—" },
    { key: "white_label_enabled", label: "White-label Reports", format: (t: Tier) => t.white_label_enabled ? "✓" : "—" },
    { key: "priority_support",  label: "Priority Support",   format: (t: Tier) => t.priority_support  ? "✓" : "—" },
  ];

  return (
    <AppShell>
      <Topbar title="Plans & Pricing" subtitle="Choose the plan that fits your practice" />

      <div className="flex-1 overflow-y-auto p-[18px]">
        <div className="max-w-[900px] mx-auto flex flex-col gap-8">

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <span className={cn("text-[12px] font-sans whitespace-nowrap", billing === "monthly" ? "text-vastu-text font-medium" : "text-vastu-text-3")}>
              Monthly
            </span>
            <button
              onClick={() => setBilling(b => b === "monthly" ? "yearly" : "monthly")}
              className={cn(
                "w-[48px] h-[26px] rounded-full transition-colors duration-200 flex items-center px-[3px] flex-shrink-0 cursor-pointer",
                billing === "yearly" ? "bg-gold" : "bg-[rgba(200,175,120,0.25)]"
              )}
            >
              <span className={cn(
                "w-[20px] h-[20px] bg-white rounded-full shadow transition-transform duration-200",
                billing === "yearly" ? "translate-x-[22px]" : "translate-x-[0px]"
              )} />
            </button>
            <span className={cn("text-[12px] font-sans whitespace-nowrap", billing === "yearly" ? "text-vastu-text font-medium" : "text-vastu-text-3")}>
              Yearly <span className="text-[10px] text-green-600 font-medium ml-1">Save ~20%</span>
            </span>
          </div>

          {/* Tier cards */}
          {loading || userLoading ? (
            <div className="flex items-center justify-center py-16 text-vastu-text-3 text-[12px]">Loading plans…</div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(tiers.length, 3)}, 1fr)` }}>
              {tiers.map((tier) => {
                const isCurrent = tier.id === currentPlan;
                const price = billing === "monthly" ? tier.price_monthly : tier.price_yearly;

                return (
                  <div
                    key={tier.id}
                    className={cn(
                      "bg-bg-2 border rounded-[12px] p-5 flex flex-col gap-4 relative transition-all",
                      isCurrent
                        ? "border-gold shadow-[0_0_0_1px_rgba(200,175,120,0.4)]"
                        : "border-[rgba(100,70,20,0.20)] hover:border-[rgba(200,175,120,0.25)]"
                    )}
                  >
                    {isCurrent && (
                      <div className="absolute -top-[11px] left-1/2 -translate-x-1/2">
                        <span className="text-[9px] px-3 py-[3px] bg-gold text-bg font-medium rounded-full uppercase tracking-[1px] whitespace-nowrap">
                          Current Plan
                        </span>
                      </div>
                    )}

                    {/* Tier name + price */}
                    <div>
                      <div className="font-serif text-[20px] font-semibold text-gold-2 mb-1">{tier.name}</div>
                      <div className="text-[10px] text-vastu-text-3 leading-relaxed">{tier.description}</div>
                    </div>

                    <div className="flex items-end gap-1">
                      <span className="font-serif text-[32px] font-semibold text-vastu-text leading-none">
                        {fmtPrice(price)}
                      </span>
                      {price > 0 && (
                        <span className="text-[10px] text-vastu-text-3 mb-1">/{billing === "monthly" ? "mo" : "yr"}</span>
                      )}
                    </div>

                    {/* Features list */}
                    <div className="flex flex-col gap-[7px] flex-1">
                      {FEATURES.map(({ key, label, format }) => {
                        const val = format(tier);
                        const isCheck = val === "✓";
                        const isDash = val === "—";
                        return (
                          <div key={key} className="flex items-center justify-between gap-2">
                            <span className={cn("text-[11px]", isDash ? "text-vastu-text-3" : "text-vastu-text-2")}>{label}</span>
                            <span className={cn(
                              "text-[11px] font-mono font-medium",
                              isCheck ? "text-green-600" : isDash ? "text-vastu-text-3" : "text-gold-2"
                            )}>
                              {val}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* CTA */}
                    <div className="pt-2">
                      {isCurrent ? (
                        <div className="w-full text-center text-[11px] py-[8px] border border-[rgba(200,175,120,0.20)] rounded-[8px] text-gold-3 font-medium">
                          Current Plan
                        </div>
                      ) : (
                        <button
                          onClick={() => setUpgradeModal(tier)}
                          className={cn(
                            "w-full py-[9px] rounded-[8px] text-[12px] font-medium font-sans transition-all cursor-pointer",
                            "bg-gold text-bg hover:bg-gold-2"
                          )}
                        >
                          {price === 0 ? "Downgrade" : "Upgrade →"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Feature comparison note */}
          {!loading && (
            <div className="text-center text-[10px] text-vastu-text-3 pb-4">
              All plans include core Vastu Chakra analysis, 16-zone calculations, and perimeter drawing tools.
              <br />
              Prices shown in INR. GST applicable as per Indian tax regulations.
            </div>
          )}
        </div>
      </div>

      {/* Upgrade modal */}
      {upgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setUpgradeModal(null)}>
          <div className="bg-bg-2 border border-[rgba(100,70,20,0.25)] rounded-[14px] p-7 max-w-[400px] w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="font-serif text-[20px] text-gold-2 mb-2">Upgrade to {upgradeModal.name}</div>
            <div className="text-[12px] text-vastu-text-2 leading-relaxed mb-5">
              Online payment is being set up. To upgrade your plan right now, reach out and we&apos;ll activate it manually within 24 hours.
            </div>
            <div className="bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[8px] p-4 mb-5 flex flex-col gap-2">
              <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1.5px]">Contact to Upgrade</div>
              <a href="mailto:astraavastu@gmail.com" className="text-[13px] text-gold hover:text-gold-2 transition-colors font-mono">
                astraavastu@gmail.com
              </a>
              <a href="https://instagram.com/astraavastu" target="_blank" rel="noopener noreferrer" className="text-[12px] text-vastu-text-2 hover:text-gold transition-colors">
                @astraavastu on Instagram
              </a>
              <div className="text-[10px] text-vastu-text-3">Mention: upgrade to <strong className="text-vastu-text-2">{upgradeModal.name}</strong></div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setUpgradeModal(null)}
                className="flex-1 py-[8px] border border-[rgba(100,70,20,0.20)] text-vastu-text-2 rounded-[8px] text-[11px] hover:border-gold-3 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => { router.push("/settings/billing"); setUpgradeModal(null); }}
                className="flex-1 py-[8px] bg-gold text-bg rounded-[8px] text-[11px] font-medium hover:bg-gold-2 transition-colors cursor-pointer"
              >
                View Billing →
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
