"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

const APP_URL = typeof window !== "undefined" ? window.location.origin : "";

interface Tier {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  projects_limit: number;
  storage_limit_gb: number;
  ai_messages_limit: number;
  pdf_exports_limit: number;
  ai_chat_enabled: boolean;
  pdf_export_enabled: boolean;
  white_label_enabled: boolean;
  priority_support: boolean;
  is_active: boolean;
  is_base_tier: boolean;
  sort_order: number;
  razorpay_plan_id_monthly?: string;
  razorpay_plan_id_yearly?: string;
  userCount: number;
}

interface Promo {
  id: string;
  code: string;
  description?: string;
  discount_pct: number;
  applies_to?: string;
  max_uses?: number;
  uses_count: number;
  valid_until?: string;
  is_active: boolean;
  commission_pct: number;
  razorpay_offer_id?: string;
}

interface ReferralConversion {
  id: string;
  amount_paise: number;
  commission_paise: number;
  status: string;
  created_at: string;
  razorpay_payment_id?: string;
  promo_codes?: { code: string; discount_pct: number; commission_pct: number };
  profiles?: { id: string; full_name: string; email: string };
}

const BOOL_FEATURES: Array<{ key: keyof Tier; label: string }> = [
  { key: "ai_chat_enabled",     label: "AI Chat" },
  { key: "pdf_export_enabled",  label: "PDF Export" },
  { key: "white_label_enabled", label: "White-label Reports" },
  { key: "priority_support",    label: "Priority Support" },
];

const NUM_FIELDS: Array<{ label: string; key: keyof Tier }> = [
  { label: "Projects Limit (−1 = ∞)", key: "projects_limit" },
  { label: "Storage (GB)",             key: "storage_limit_gb" },
  { label: "AI Messages/mo (−1 = ∞)", key: "ai_messages_limit" },
  { label: "PDF Exports (−1 = ∞)",    key: "pdf_exports_limit" },
];

function limitDisplay(v: number) { return v < 0 ? "∞" : v.toString(); }
function numVal(v: unknown): string | number { if (v == null) return ""; const n = Number(v); return Number.isNaN(n) ? "" : n; }

const BLANK_TIER: Omit<Tier, "id" | "userCount"> = {
  name: "", description: "", price_monthly: 0, price_yearly: 0,
  projects_limit: 5, storage_limit_gb: 1, ai_messages_limit: 50, pdf_exports_limit: 5,
  ai_chat_enabled: true, pdf_export_enabled: true, white_label_enabled: false,
  priority_support: false, is_active: true, is_base_tier: false, sort_order: 0,
  razorpay_plan_id_monthly: "", razorpay_plan_id_yearly: "",
};

export default function AdminTiersPage() {
  const [tiers, setTiers]   = useState<Tier[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editTier, setEditTier]     = useState<Tier | null>(null);
  const [newTier, setNewTier]       = useState<Omit<Tier, "id" | "userCount"> | null>(null);
  const [saving, setSaving]         = useState(false);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [bulkDialog, setBulkDialog] = useState<{ fromTier: string } | null>(null);
  const [bulkTarget, setBulkTarget] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ tierId: string; tierName: string; userCount: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [newPromo, setNewPromo] = useState({ code: "", description: "", discountPct: 10, commissionPct: 10, razorpayOfferId: "", appliesTo: "", maxUses: "", validUntil: "" });
  const [referrals, setReferrals] = useState<ReferralConversion[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/tiers").then((r) => r.json()),
      fetch("/api/admin/promos").then((r) => r.json()),
      fetch("/api/admin/referrals").then((r) => r.json()),
    ]).then(([tiersRes, promosRes, referralsRes]) => {
      setTiers((tiersRes.data ?? []).map((t: Tier) => ({ ...t, sort_order: t.sort_order ?? 0 })));
      setPromos(promosRes.data ?? []);
      setReferrals(referralsRes.data ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveTier = async () => {
    if (!editTier) return;
    setSaving(true);
    await fetch("/api/admin/tiers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editTier),
    });
    setSaving(false);
    setEditTier(null);
    load();
  };

  const createTier = async () => {
    if (!newTier || !newTier.name.trim()) return;
    setSaving(true);
    await fetch("/api/admin/tiers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTier),
    });
    setSaving(false);
    setNewTier(null);
    load();
  };

  const deleteTier = async () => {
    if (!deleteDialog) return;
    if (deleteDialog.userCount > 0 && !deleteTarget) return;
    setDeleting(true);
    await fetch("/api/admin/tiers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteDialog.tierId, moveTo: deleteTarget || undefined }),
    });
    setDeleting(false);
    setDeleteDialog(null);
    setDeleteTarget("");
    load();
  };

  const bulkUpgrade = async () => {
    if (!bulkDialog || !bulkTarget) return;
    await fetch("/api/admin/tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromTier: bulkDialog.fromTier, toTier: bulkTarget }),
    });
    setBulkDialog(null);
    setBulkTarget("");
    load();
  };

  const createPromo = async () => {
    await fetch("/api/admin/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code:             newPromo.code,
        description:      newPromo.description,
        discountPct:      newPromo.discountPct,
        commissionPct:    newPromo.commissionPct,
        razorpayOfferId:  newPromo.razorpayOfferId || null,
        appliesTo:        newPromo.appliesTo || null,
        maxUses:          newPromo.maxUses ? parseInt(newPromo.maxUses) : null,
        validUntil:       newPromo.validUntil || null,
      }),
    });
    setShowPromoForm(false);
    setNewPromo({ code: "", description: "", discountPct: 10, commissionPct: 10, razorpayOfferId: "", appliesTo: "", maxUses: "", validUntil: "" });
    load();
  };

  const copyLink = (code: string) => {
    const link = `${APP_URL}?promo=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePromo = async (id: string, is_active: boolean) => {
    await fetch("/api/admin/promos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active }),
    });
    load();
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-vastu-text-3 text-[12px]">Loading…</div>;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[rgba(100,70,20,0.12)] bg-bg-2 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[22px] font-semibold text-gold-2">Tiers & Pricing</h1>
          <p className="text-[11px] text-vastu-text-3 mt-[2px]">Manage plan configurations and promo codes</p>
        </div>
        <button onClick={() => setNewTier({ ...BLANK_TIER })}
          className="text-[11px] px-4 py-[7px] bg-gold-2 text-[#faf7f0] rounded-[7px] hover:bg-gold transition-all cursor-pointer font-medium">
          + New Tier
        </button>
      </div>

      <div className="p-8 flex flex-col gap-8">

        {/* Tier cards */}
        <div>
          <div className="text-[9px] text-vastu-text-3 uppercase tracking-[2px] mb-4">Plans</div>
          <div className="grid grid-cols-3 gap-4">
            {[...tiers].sort((a, b) => a.sort_order - b.sort_order).map((tier) => (
              <div key={tier.id} className={cn(
                "bg-bg-2 border rounded-[12px] p-5 flex flex-col gap-3",
                tier.is_active ? "border-[rgba(100,70,20,0.20)]" : "border-[rgba(100,70,20,0.10)] opacity-60"
              )}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-serif text-[17px] text-gold-2 font-semibold">{tier.name}</div>
                      {tier.is_base_tier && (
                        <span className="text-[8px] px-[6px] py-[2px] rounded-full bg-[rgba(42,122,114,0.15)] text-teal-700 font-medium uppercase tracking-[0.5px]">Default</span>
                      )}
                    </div>
                    <div className="text-[10px] text-vastu-text-3 mt-[2px]">{tier.description}</div>
                  </div>
                  <span className="text-[10px] px-2 py-1 bg-bg-3 rounded-[5px] text-vastu-text-2 font-mono">
                    {tier.userCount} users
                  </span>
                </div>

                <div className="flex gap-4">
                  <div>
                    <div className="font-serif text-[20px] text-vastu-text">
                      {tier.price_monthly === 0 ? "Free" : `₹${tier.price_monthly}`}
                    </div>
                    {tier.price_monthly > 0 && <div className="text-[9px] text-vastu-text-3">/month</div>}
                  </div>
                  {tier.price_yearly > 0 && (
                    <div>
                      <div className="font-serif text-[20px] text-vastu-text-2">₹{tier.price_yearly}</div>
                      <div className="text-[9px] text-vastu-text-3">/year</div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-[5px] text-[11px]">
                  <div className="flex justify-between"><span className="text-vastu-text-3">Projects</span><span className="font-mono text-vastu-text-2">{limitDisplay(tier.projects_limit)}</span></div>
                  <div className="flex justify-between"><span className="text-vastu-text-3">Storage</span><span className="font-mono text-vastu-text-2">{tier.storage_limit_gb} GB</span></div>
                  <div className="flex justify-between"><span className="text-vastu-text-3">AI Messages</span><span className="font-mono text-vastu-text-2">{limitDisplay(tier.ai_messages_limit)}/mo</span></div>
                  <div className="flex justify-between"><span className="text-vastu-text-3">PDF Exports</span><span className="font-mono text-vastu-text-2">{tier.pdf_export_enabled ? limitDisplay(tier.pdf_exports_limit) : "Not included"}</span></div>
                </div>

                <div className="flex flex-wrap gap-[5px]">
                  {BOOL_FEATURES.map((f) => (
                    <span key={f.key} className={cn(
                      "text-[9px] px-[6px] py-[2px] rounded-full",
                      tier[f.key] ? "bg-[rgba(154,120,32,0.15)] text-gold-2" : "bg-bg-4 text-vastu-text-3 line-through"
                    )}>{f.label}</span>
                  ))}
                </div>

                <div className="flex gap-2 mt-auto pt-2 border-t border-[rgba(100,70,20,0.10)]">
                  <button onClick={() => setEditTier({ ...tier })}
                    className="flex-1 py-[6px] text-[10px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[6px] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2 transition-all cursor-pointer">
                    Edit
                  </button>
                  <button onClick={() => { setBulkDialog({ fromTier: tier.id }); setBulkTarget(""); }}
                    className="flex-1 py-[6px] text-[10px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[6px] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2 transition-all cursor-pointer">
                    Bulk Move
                  </button>
                  <button onClick={() => { setDeleteDialog({ tierId: tier.id, tierName: tier.name, userCount: tier.userCount }); setDeleteTarget(""); }}
                    className="py-[6px] px-3 text-[10px] bg-bg-3 border border-[rgba(200,50,50,0.20)] rounded-[6px] text-red-700 hover:border-[rgba(200,50,50,0.40)] hover:bg-[rgba(200,50,50,0.05)] transition-all cursor-pointer">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Promo codes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[9px] text-vastu-text-3 uppercase tracking-[2px]">Promo Codes</div>
            <button onClick={() => setShowPromoForm(true)}
              className="text-[10px] px-3 py-[5px] bg-gold-2 text-[#faf7f0] rounded-[6px] hover:bg-gold transition-all cursor-pointer font-medium">
              + New Promo
            </button>
          </div>

          <div className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] overflow-hidden">
            <div className="grid text-[9px] text-vastu-text-3 uppercase tracking-[1.5px] px-5 py-3 border-b border-[rgba(100,70,20,0.12)] bg-bg-3"
              style={{ gridTemplateColumns: "120px 1fr 70px 70px 60px 70px 90px 80px" }}>
              <span>Code</span><span>Referral Link</span>
              <span>Disc%</span><span>Comm%</span><span>Uses</span><span>Expires</span><span>Status</span><span>Action</span>
            </div>
            {promos.length === 0 ? (
              <div className="px-5 py-8 text-center text-[11px] text-vastu-text-3">No promo codes yet</div>
            ) : promos.map((p) => {
              const link = `${APP_URL}?promo=${p.code}`;
              return (
                <div key={p.id} className="grid items-center px-5 py-3 border-b border-[rgba(100,70,20,0.08)] last:border-0"
                  style={{ gridTemplateColumns: "120px 1fr 70px 70px 60px 70px 90px 80px" }}>
                  <span className="font-mono text-[12px] text-vastu-text font-medium">{p.code}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-vastu-text-3 font-mono truncate">{link}</span>
                    <button
                      onClick={() => copyLink(p.code)}
                      className="flex-shrink-0 text-[9px] px-2 py-[3px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[4px] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2 transition-all cursor-pointer whitespace-nowrap"
                    >
                      {copiedId === p.code ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <span className="font-mono text-[11px] text-vastu-text-2">{p.discount_pct}%</span>
                  <span className="font-mono text-[11px] text-vastu-text-2">{p.commission_pct}%</span>
                  <span className="font-mono text-[11px] text-vastu-text-2">{p.uses_count}{p.max_uses ? `/${p.max_uses}` : ""}</span>
                  <span className="text-[10px] text-vastu-text-3">{p.valid_until ? new Date(p.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</span>
                  <span className={cn("text-[9px] px-[6px] py-[2px] rounded-full font-medium w-fit", p.is_active ? "bg-green-100 text-green-800" : "bg-bg-4 text-vastu-text-3")}>
                    {p.is_active ? "Active" : "Off"}
                  </span>
                  <button onClick={() => togglePromo(p.id, !p.is_active)}
                    className="text-[10px] px-2 py-[4px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2 transition-all cursor-pointer">
                    {p.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Referral Conversions */}
        <div>
          <div className="text-[9px] text-vastu-text-3 uppercase tracking-[2px] mb-4">Referral Conversions</div>
          <div className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] overflow-hidden">
            <div className="grid text-[9px] text-vastu-text-3 uppercase tracking-[1.5px] px-5 py-3 border-b border-[rgba(100,70,20,0.12)] bg-bg-3"
              style={{ gridTemplateColumns: "100px 1fr 90px 90px 80px 80px" }}>
              <span>Code</span><span>Subscriber</span>
              <span>Amount</span><span>Commission</span><span>Status</span><span>Date</span>
            </div>
            {referrals.length === 0 ? (
              <div className="px-5 py-8 text-center text-[11px] text-vastu-text-3">No referral conversions yet</div>
            ) : referrals.map((r) => (
              <div key={r.id} className="grid items-center px-5 py-3 border-b border-[rgba(100,70,20,0.08)] last:border-0"
                style={{ gridTemplateColumns: "100px 1fr 90px 90px 80px 80px" }}>
                <span className="font-mono text-[11px] text-vastu-text font-medium">{r.promo_codes?.code ?? "—"}</span>
                <span className="text-[11px] text-vastu-text-2 truncate">{r.profiles?.full_name ?? "—"}</span>
                <span className="font-mono text-[11px] text-vastu-text-2">₹{(r.amount_paise / 100).toLocaleString("en-IN")}</span>
                <span className="font-mono text-[11px] text-green-600">₹{(r.commission_paise / 100).toLocaleString("en-IN")}</span>
                <span className={cn(
                  "text-[9px] px-[6px] py-[2px] rounded-full font-medium w-fit",
                  r.status === "pending" ? "bg-amber-900/30 text-amber-400" :
                  r.status === "paid"    ? "bg-green-900/30 text-green-400" :
                                           "bg-red-900/30 text-red-400"
                )}>
                  {r.status}
                </span>
                <span className="text-[10px] text-vastu-text-3">
                  {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Edit tier modal ── */}
      {editTier && (
        <TierModal
          title={`Edit ${editTier.name}`}
          subtitle="Changes apply to the plan definition. Use 'Sync to Subscribers' to push limit changes."
          tier={editTier}
          setTier={setEditTier as (t: Partial<Tier>) => void}
          saving={saving}
          onClose={() => setEditTier(null)}
          onSave={saveTier}
          showIdField
        />
      )}

      {/* ── New tier modal ── */}
      {newTier && (
        <TierModal
          title="New Tier"
          subtitle="Create a custom plan. Users can be manually assigned to it."
          tier={newTier as Tier}
          setTier={setNewTier as (t: Partial<Tier>) => void}
          saving={saving}
          onClose={() => setNewTier(null)}
          onSave={createTier}
          showIdField={false}
        />
      )}

      {/* ── Bulk move modal ── */}
      {bulkDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setBulkDialog(null)}>
          <div className="bg-bg border border-[rgba(100,70,20,0.20)] rounded-[12px] p-6 w-[360px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="font-serif text-[16px] text-gold-2 mb-1">Bulk Move Users</div>
            <div className="text-[11px] text-vastu-text-3 mb-4">
              Move <strong>all users</strong> on <span className="font-mono text-vastu-text-2">{bulkDialog.fromTier}</span> to a new plan.
            </div>
            <div className="mb-4">
              <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Move to</label>
              <select value={bulkTarget} onChange={(e) => setBulkTarget(e.target.value)}
                className="w-full px-3 py-2 bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[6px] text-[12px] text-vastu-text outline-none focus:border-gold-3">
                <option value="">Select plan…</option>
                {tiers.filter((t) => t.id !== bulkDialog.fromTier).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="bg-[rgba(200,50,50,0.06)] border border-[rgba(200,50,50,0.15)] rounded-[6px] px-3 py-2 text-[10px] text-red-700 mb-4">
              This cannot be undone automatically. This will move all {tiers.find((t) => t.id === bulkDialog.fromTier)?.userCount ?? 0} users.
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setBulkDialog(null)} className="px-4 py-[6px] text-[11px] border border-[rgba(100,70,20,0.20)] rounded-[6px] text-vastu-text-2 hover:border-gold-3 cursor-pointer">Cancel</button>
              <button onClick={bulkUpgrade} disabled={!bulkTarget} className="px-4 py-[6px] text-[11px] bg-gold-2 text-[#faf7f0] rounded-[6px] hover:bg-gold disabled:opacity-40 cursor-pointer font-medium">Confirm Move</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete tier modal ── */}
      {deleteDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setDeleteDialog(null)}>
          <div className="bg-bg border border-[rgba(200,50,50,0.25)] rounded-[12px] p-6 w-[380px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="font-serif text-[16px] text-red-700 mb-1">Delete "{deleteDialog.tierName}"</div>
            <div className="text-[11px] text-vastu-text-3 mb-4">
              This permanently removes the tier from the database. This cannot be undone.
            </div>

            {deleteDialog.userCount > 0 ? (
              <div className="mb-4">
                <div className="bg-[rgba(200,50,50,0.06)] border border-[rgba(200,50,50,0.15)] rounded-[6px] px-3 py-2 text-[10px] text-red-700 mb-3">
                  {deleteDialog.userCount} user{deleteDialog.userCount !== 1 ? "s" : ""} are on this tier. You must move them before deleting.
                </div>
                <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Move users to</label>
                <select value={deleteTarget} onChange={(e) => setDeleteTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[6px] text-[12px] text-vastu-text outline-none focus:border-gold-3">
                  <option value="">Select a plan…</option>
                  {tiers.filter((t) => t.id !== deleteDialog.tierId).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-[rgba(200,50,50,0.06)] border border-[rgba(200,50,50,0.15)] rounded-[6px] px-3 py-2 text-[10px] text-red-700 mb-4">
                No users on this tier. Safe to delete immediately.
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteDialog(null)} className="px-4 py-[6px] text-[11px] border border-[rgba(100,70,20,0.20)] rounded-[6px] text-vastu-text-2 hover:border-gold-3 cursor-pointer">Cancel</button>
              <button
                onClick={deleteTier}
                disabled={deleting || (deleteDialog.userCount > 0 && !deleteTarget)}
                className="px-4 py-[6px] text-[11px] bg-red-700 text-white rounded-[6px] hover:bg-red-800 disabled:opacity-40 cursor-pointer font-medium transition-all"
              >
                {deleting ? "Deleting…" : "Delete Tier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New promo modal ── */}
      {showPromoForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowPromoForm(false)}>
          <div className="bg-bg border border-[rgba(100,70,20,0.20)] rounded-[12px] p-6 w-[420px] max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="font-serif text-[16px] text-gold-2 mb-4">New Promo Code</div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Code</label>
                <input value={newPromo.code} onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                  placeholder="NAITIK10" className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-mono text-[12px] outline-none focus:border-gold-3 uppercase" />
              </div>
              <div>
                <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Description</label>
                <input value={newPromo.description} onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
                  placeholder="Referral code for Naitik" className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[12px] outline-none focus:border-gold-3" />
              </div>
              <div>
                <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Applicable On</label>
                <select value={newPromo.appliesTo} onChange={(e) => setNewPromo({ ...newPromo, appliesTo: e.target.value })}
                  className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[12px] outline-none focus:border-gold-3">
                  <option value="">All Plans</option>
                  {tiers.filter(t => t.is_active && t.price_yearly > 0).map((t) => (
                    <option key={t.id} value={t.id}>{t.name} (₹{t.price_yearly}/yr)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Discount % (user gets)</label>
                  <input type="number" min={1} max={100} value={newPromo.discountPct} onChange={(e) => setNewPromo({ ...newPromo, discountPct: parseInt(e.target.value) })}
                    className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[12px] outline-none focus:border-gold-3" />
                </div>
                <div>
                  <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Commission % (consultant gets)</label>
                  <input type="number" min={0} max={100} value={newPromo.commissionPct} onChange={(e) => setNewPromo({ ...newPromo, commissionPct: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[12px] outline-none focus:border-gold-3" />
                </div>
              </div>
              <div>
                <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Razorpay Offer ID</label>
                <input value={newPromo.razorpayOfferId} onChange={(e) => setNewPromo({ ...newPromo, razorpayOfferId: e.target.value })}
                  placeholder="offer_XXXXXXXXXX" className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-mono text-[11px] outline-none focus:border-gold-3" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Max Uses (blank = ∞)</label>
                  <input type="number" value={newPromo.maxUses} onChange={(e) => setNewPromo({ ...newPromo, maxUses: e.target.value })}
                    placeholder="∞" className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[12px] outline-none focus:border-gold-3" />
                </div>
                <div>
                  <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Expires (blank = never)</label>
                  <input type="date" value={newPromo.validUntil} onChange={(e) => setNewPromo({ ...newPromo, validUntil: e.target.value })}
                    className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[12px] outline-none focus:border-gold-3" />
                </div>
              </div>
              {newPromo.code && (
                <div className="bg-bg-3 border border-[rgba(100,70,20,0.15)] rounded-[6px] px-3 py-2">
                  <div className="text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Referral link preview</div>
                  <div className="font-mono text-[10px] text-gold-3 break-all">{APP_URL}?promo={newPromo.code}</div>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[rgba(100,70,20,0.12)]">
              <button onClick={() => setShowPromoForm(false)} className="px-4 py-[6px] text-[11px] border border-[rgba(100,70,20,0.20)] rounded-[6px] text-vastu-text-2 hover:border-gold-3 cursor-pointer">Cancel</button>
              <button onClick={createPromo} disabled={!newPromo.code} className="px-4 py-[6px] text-[11px] bg-gold-2 text-[#faf7f0] rounded-[6px] hover:bg-gold disabled:opacity-40 cursor-pointer font-medium">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared tier form modal ──────────────────────────────────────────────────
function TierModal({
  title, subtitle, tier, setTier, saving, onClose, onSave, showIdField,
}: {
  title: string;
  subtitle: string;
  tier: Tier;
  setTier: (t: Partial<Tier>) => void;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  showIdField: boolean;
}) {
  const update = (key: keyof Tier, value: unknown) => setTier({ ...tier, [key]: value });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-bg border border-[rgba(100,70,20,0.20)] rounded-[12px] p-6 w-[520px] max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="font-serif text-[18px] text-gold-2 mb-1">{title}</div>
        <div className="text-[11px] text-vastu-text-3 mb-5">{subtitle}</div>

        <div className="flex flex-col gap-4">

          {/* Name & Description */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Tier Name</label>
              <input value={tier.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Enterprise"
                className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[12px] outline-none focus:border-gold-3" />
            </div>
            <div>
              <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Description</label>
              <input value={tier.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Short description shown on pricing cards"
                className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[12px] outline-none focus:border-gold-3" />
            </div>
          </div>

          {/* Tier ID (read-only for existing tiers) */}
          {showIdField && (
            <div>
              <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Tier ID (used in subscriptions)</label>
              <input value={tier.id} readOnly
                className="w-full px-3 py-[6px] bg-bg-4 border border-[rgba(100,70,20,0.10)] rounded-[5px] text-vastu-text-3 text-[11px] font-mono outline-none cursor-not-allowed" />
            </div>
          )}

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            {([
              { label: "Monthly Price (₹)", key: "price_monthly" as keyof Tier },
              { label: "Yearly Price (₹)",  key: "price_yearly"  as keyof Tier },
            ] as const).map(({ label, key }) => (
              <div key={key}>
                <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">{label}</label>
                <input type="number" value={numVal(tier[key])}
                  onChange={(e) => update(key, e.target.value === "" ? 0 : parseFloat(e.target.value))}
                  className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[12px] outline-none focus:border-gold-3" />
              </div>
            ))}
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3">
            {NUM_FIELDS.map(({ label, key }) => (
              <div key={key}>
                <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">{label}</label>
                <input type="number" value={numVal(tier[key])}
                  onChange={(e) => update(key, e.target.value === "" ? 0 : parseFloat(e.target.value))}
                  className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[12px] outline-none focus:border-gold-3" />
              </div>
            ))}
          </div>

          {/* Feature flags */}
          <div>
            <div className="text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-2">Features</div>
            <div className="flex flex-col gap-2">
              {BOOL_FEATURES.map((f) => (
                <label key={f.key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={tier[f.key] as boolean}
                    onChange={(e) => update(f.key, e.target.checked)}
                    className="accent-gold-2" />
                  <span className="text-[12px] text-vastu-text-2">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Sort Order (lower = cheaper, shown left to right)</label>
            <input type="number" value={numVal(tier.sort_order)}
              onChange={(e) => update("sort_order", e.target.value === "" ? 0 : parseInt(e.target.value))}
              className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[12px] outline-none focus:border-gold-3" />
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={tier.is_active}
              onChange={(e) => update("is_active", e.target.checked)}
              className="accent-gold-2" />
            <span className="text-[12px] text-vastu-text-2">Tier is active (visible to users)</span>
          </label>

          {/* Base tier toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={tier.is_base_tier}
              onChange={(e) => update("is_base_tier", e.target.checked)}
              className="accent-gold-2" />
            <span className="text-[12px] text-vastu-text-2">Default signup tier <span className="text-vastu-text-3">(new users get this plan)</span></span>
          </label>

          {/* Razorpay IDs */}
          <div className="grid grid-cols-2 gap-3">
            {([
              { label: "Razorpay Plan ID (Monthly)", key: "razorpay_plan_id_monthly" as keyof Tier },
              { label: "Razorpay Plan ID (Yearly)",  key: "razorpay_plan_id_yearly"  as keyof Tier },
            ] as const).map(({ label, key }) => (
              <div key={key}>
                <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">{label}</label>
                <input value={(tier[key] as string) ?? ""}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder="plan_XXXX"
                  className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[11px] font-mono outline-none focus:border-gold-3" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[rgba(100,70,20,0.12)]">
          <button onClick={onClose} className="px-4 py-[6px] text-[11px] border border-[rgba(100,70,20,0.20)] rounded-[6px] text-vastu-text-2 hover:border-gold-3 cursor-pointer">Cancel</button>
          <button onClick={onSave} disabled={saving} className="px-4 py-[6px] text-[11px] bg-gold-2 text-[#faf7f0] rounded-[6px] hover:bg-gold disabled:opacity-40 cursor-pointer font-medium">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
