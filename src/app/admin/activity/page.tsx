"use client";

import { useEffect, useState, useCallback } from "react";

interface ActivityRow {
  id: string;
  action: string;
  label: string;
  created_at: string;
  consultant_id: string;
  profiles: { full_name: string; email: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  admin_action:          "bg-amber-100 text-amber-800",
  admin_bulk_upgrade:    "bg-blue-100 text-blue-800",
  admin_settings_update: "bg-purple-100 text-purple-700",
};

export default function AdminActivityPage() {
  const [rows, setRows]   = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(100);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/activity?limit=${limit}`)
      .then((r) => r.json())
      .then((r) => { setRows(r.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (d: string) => new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  const actionLabel = (action: string) =>
    action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[rgba(100,70,20,0.12)] bg-bg-2 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[22px] font-semibold text-gold-2">Activity Log</h1>
          <p className="text-[11px] text-vastu-text-3 mt-[2px]">Platform-wide audit trail</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-vastu-text-3">Show</span>
          {[50, 100, 250, 500].map((n) => (
            <button key={n} onClick={() => setLimit(n)}
              className={`text-[10px] px-2 py-[4px] rounded-[5px] cursor-pointer transition-all ${limit === n ? "bg-gold-2 text-[#faf7f0]" : "bg-bg-3 border border-[rgba(100,70,20,0.20)] text-vastu-text-2 hover:border-gold-3"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8">
        <div className="bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[10px] overflow-hidden">
          {/* Column headers */}
          <div className="grid text-[9px] text-vastu-text-3 uppercase tracking-[1.5px] px-5 py-3 border-b border-[rgba(100,70,20,0.12)] bg-bg-3"
            style={{ gridTemplateColumns: "1.5fr 1.5fr 2fr 130px" }}>
            <span>User</span>
            <span>Action</span>
            <span>Detail</span>
            <span>Time</span>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-[12px] text-vastu-text-3">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-10 text-center text-[12px] text-vastu-text-3">No activity yet</div>
          ) : (
            rows.map((row) => (
              <div key={row.id}
                className="grid items-center px-5 py-3 border-b border-[rgba(100,70,20,0.08)] hover:bg-[rgba(100,70,20,0.04)] transition-colors duration-100"
                style={{ gridTemplateColumns: "1.5fr 1.5fr 2fr 130px" }}>
                <div>
                  <div className="text-[11px] text-vastu-text font-sans">{row.profiles?.full_name || "—"}</div>
                  <div className="text-[10px] text-vastu-text-3 font-mono truncate">{row.profiles?.email || row.consultant_id.slice(0, 8) + "…"}</div>
                </div>
                <div>
                  <span className={`text-[9px] px-2 py-[3px] rounded-full font-medium ${ACTION_COLORS[row.action] ?? "bg-bg-4 text-vastu-text-3"}`}>
                    {actionLabel(row.action)}
                  </span>
                </div>
                <div className="text-[11px] text-vastu-text-2 truncate pr-4">{row.label}</div>
                <div className="text-[10px] text-vastu-text-3 font-mono">{fmtDate(row.created_at)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
