"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type PurgeAction = "purge_projects" | "clear_ai_logs";
interface PurgeState { running: boolean; result: string; error: string; }
const initPurge: PurgeState = { running: false, result: "", error: "" };

interface Settings {
  maintenance_mode: boolean;
  maintenance_message: string;
  ai_daily_cap: number;
  ai_monthly_cap: number;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    maintenance_mode:    false,
    maintenance_message: "The platform is under scheduled maintenance. We will be back shortly.",
    ai_daily_cap:        1000,
    ai_monthly_cap:      20000,
  });
  const [loading, setSaving] = useState(false);
  const [saved, setSaved]    = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fetching, setFetching] = useState(true);
  const [purgeStates, setPurgeStates] = useState<Record<PurgeAction, PurgeState>>({
    purge_projects: initPurge,
    clear_ai_logs: initPurge,
  });
  const [confirmAction, setConfirmAction] = useState<PurgeAction | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((r) => {
        const d = r.data ?? {};
        setSettings({
          maintenance_mode:    d.maintenance_mode === true || d.maintenance_mode === "true",
          maintenance_message: typeof d.maintenance_message === "string" ? d.maintenance_message : settings.maintenance_message,
          ai_daily_cap:        typeof d.ai_daily_cap === "number" ? d.ai_daily_cap : 1000,
          ai_monthly_cap:      typeof d.ai_monthly_cap === "number" ? d.ai_monthly_cap : 20000,
        });
        setFetching(false);
      })
      .catch(() => setFetching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (patch: Partial<Settings>) => {
    const merged = { ...settings, ...patch };
    setSettings(merged);
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenance_mode:    merged.maintenance_mode,
          maintenance_message: merged.maintenance_message,
          ai_daily_cap:        merged.ai_daily_cap,
          ai_monthly_cap:      merged.ai_monthly_cap,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setSaveError(j.error ?? `Error ${res.status}`);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setSaveError("Network error — changes not saved.");
    }
    setSaving(false);
  };

  const runPurge = async (action: PurgeAction) => {
    setConfirmAction(null);
    setPurgeStates((s) => ({ ...s, [action]: { running: true, result: "", error: "" } }));
    try {
      const res = await fetch("/api/admin/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = await res.json();
      if (!res.ok) {
        setPurgeStates((s) => ({ ...s, [action]: { running: false, result: "", error: j.error ?? `Error ${res.status}` } }));
      } else {
        const label = action === "purge_projects"
          ? `Purged ${j.count} project${j.count !== 1 ? "s" : ""}`
          : `Cleared ${j.count.toLocaleString()} log entr${j.count !== 1 ? "ies" : "y"}`;
        setPurgeStates((s) => ({ ...s, [action]: { running: false, result: label, error: "" } }));
        setTimeout(() => setPurgeStates((s) => ({ ...s, [action]: initPurge })), 5000);
      }
    } catch {
      setPurgeStates((s) => ({ ...s, [action]: { running: false, result: "", error: "Network error" } }));
    }
  };

  if (fetching) return <div className="flex-1 flex items-center justify-center text-vastu-text-3 text-[12px]">Loading…</div>;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[rgba(100,70,20,0.12)] bg-bg-2 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[22px] font-semibold text-gold-2">Settings</h1>
          <p className="text-[11px] text-vastu-text-3 mt-[2px]">Platform configuration and controls</p>
        </div>
        {saved && <span className="text-[11px] text-green-700 font-medium">Saved ✓</span>}
        {saveError && <span className="text-[11px] text-red-500 font-medium">{saveError}</span>}
      </div>

      <div className="p-8 flex flex-col gap-6 max-w-[680px]">

        {/* Maintenance mode */}
        <div className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[13px] text-vastu-text font-medium font-sans">Maintenance Mode</div>
              <div className="text-[10px] text-vastu-text-3 mt-[2px]">When enabled, all users see the maintenance message instead of the app.</div>
            </div>
            <button
              onClick={() => save({ maintenance_mode: !settings.maintenance_mode })}
              disabled={loading}
              className={cn(
                "w-[46px] h-[26px] rounded-full transition-colors duration-200 relative flex-shrink-0 cursor-pointer",
                settings.maintenance_mode ? "bg-saffron" : "bg-bg-4"
              )}
            >
              <span className={cn(
                "absolute top-[3px] w-[20px] h-[20px] bg-white rounded-full shadow transition-transform duration-200",
                settings.maintenance_mode ? "translate-x-[23px]" : "translate-x-[3px]"
              )} />
            </button>
          </div>

          {settings.maintenance_mode && (
            <div className="bg-[rgba(196,108,14,0.08)] border border-[rgba(196,108,14,0.20)] rounded-[6px] px-3 py-2 text-[10px] text-saffron mb-3">
              ⚠ Maintenance mode is ON — users cannot access the platform.
            </div>
          )}

          <div>
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Maintenance Message</label>
            <textarea
              value={settings.maintenance_message}
              onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
              rows={2}
              className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[12px] outline-none focus:border-gold-3 resize-none leading-relaxed"
            />
            <button onClick={() => save({})}
              className="mt-2 text-[10px] px-3 py-[5px] bg-gold-2 text-[#faf7f0] rounded-[6px] hover:bg-gold cursor-pointer font-medium transition-all">
              {loading ? "Saving…" : "Save Message"}
            </button>
          </div>
        </div>

        {/* AI usage caps */}
        <div className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] p-5">
          <div className="text-[13px] text-vastu-text font-medium font-sans mb-1">AI Usage Caps</div>
          <div className="text-[10px] text-vastu-text-3 mb-4">Global limits on AI message generation across all users. These are informational thresholds — enforcement logic is in the chat API route.</div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Daily Cap (messages)</label>
              <input type="number" value={settings.ai_daily_cap}
                onChange={(e) => setSettings({ ...settings, ai_daily_cap: parseInt(e.target.value) })}
                className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[12px] font-mono outline-none focus:border-gold-3" />
            </div>
            <div>
              <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Monthly Cap (messages)</label>
              <input type="number" value={settings.ai_monthly_cap}
                onChange={(e) => setSettings({ ...settings, ai_monthly_cap: parseInt(e.target.value) })}
                className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[12px] font-mono outline-none focus:border-gold-3" />
            </div>
          </div>
          <button onClick={() => save({})}
            className="mt-3 text-[10px] px-3 py-[5px] bg-gold-2 text-[#faf7f0] rounded-[6px] hover:bg-gold cursor-pointer font-medium transition-all">
            {loading ? "Saving…" : "Save Caps"}
          </button>
        </div>

        {/* Danger zone */}
        <div className="bg-[rgba(200,50,50,0.04)] border border-[rgba(200,50,50,0.15)] rounded-[10px] p-5">
          <div className="text-[13px] text-red-800 font-medium font-sans mb-1">Danger Zone</div>
          <div className="text-[10px] text-red-600 mb-4">These actions are irreversible. Proceed with extreme care.</div>
          <div className="flex flex-col gap-2">
            {([
              { key: "purge_projects" as PurgeAction, label: "Purge Soft-Deleted Projects", desc: "Permanently remove all soft-deleted projects from the database.", confirm: "This will permanently delete all soft-deleted projects. This cannot be undone." },
              { key: "clear_ai_logs" as PurgeAction,  label: "Clear AI Usage Logs",          desc: "Delete all AI usage tracking data. Cannot be recovered.",                 confirm: "This will delete all AI usage log entries permanently." },
            ]).map(({ key, label, desc, confirm }) => {
              const ps = purgeStates[key];
              return (
                <div key={key} className="flex items-center justify-between py-3 border-b border-[rgba(200,50,50,0.10)] last:border-0">
                  <div>
                    <div className="text-[11px] text-red-800 font-medium">{label}</div>
                    <div className="text-[10px] text-red-500 mt-[1px]">{desc}</div>
                    {ps.result && <div className="text-[10px] text-green-600 mt-1 font-medium">✓ {ps.result}</div>}
                    {ps.error  && <div className="text-[10px] text-red-500 mt-1">{ps.error}</div>}
                  </div>
                  {confirmAction === key ? (
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <span className="text-[9px] text-red-600 max-w-[140px] text-right leading-tight">{confirm}</span>
                      <button
                        onClick={() => runPurge(key)}
                        className="text-[10px] px-3 py-[5px] bg-red-700 text-white rounded-[6px] hover:bg-red-600 transition-all cursor-pointer">
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmAction(null)}
                        className="text-[10px] px-3 py-[5px] border border-[rgba(200,50,50,0.30)] text-red-700 rounded-[6px] hover:bg-[rgba(200,50,50,0.08)] transition-all cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmAction(key)}
                      disabled={ps.running}
                      className="text-[10px] px-3 py-[5px] border border-[rgba(200,50,50,0.30)] text-red-700 rounded-[6px] hover:bg-[rgba(200,50,50,0.08)] transition-all cursor-pointer flex-shrink-0 ml-4 disabled:opacity-50">
                      {ps.running ? "Running…" : "Run"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
