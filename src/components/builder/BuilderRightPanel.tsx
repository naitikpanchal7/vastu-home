"use client";

// BuilderRightPanel — Analysis / North / AI tabs backed by builderStore only.
// Never reads from canvasStore.

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useBuilderStore } from "@/store/builderStore";
import { VASTU_ZONES } from "@/lib/vastu/zones";
import { calculateZoneAreas, calculateCutAnalysis } from "@/lib/vastu/geometry";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "analysis" | "north" | "chatbot";

const SEV_STYLE = {
  mild:     { bar: "#c8a028", badge: "rgba(120,80,0,0.35)",  text: "#c8a028" },
  moderate: { bar: "#e87820", badge: "rgba(160,70,0,0.35)",  text: "#e87820" },
  severe:   { bar: "#e05050", badge: "rgba(160,30,30,0.35)", text: "#e05050" },
} as const;

let msgIdCounter = 0;

// ── Analysis pane ─────────────────────────────────────────────────────────────
function BuilderAnalysis({ onExport }: { onExport: () => void }) {
  const {
    northDeg, cuts, projectName,
    assembledPerimeter, brahmaX, brahmaY,
  } = useBuilderStore();

  const hasPerimeter = assembledPerimeter.length >= 3;

  const zoneRows = useMemo(() => {
    if (!hasPerimeter) {
      return VASTU_ZONES.map((z) => ({
        zone: z, pct: 6.25, status: "good" as const, hasCut: false, cutPct: 0,
      }));
    }
    const results = calculateZoneAreas(
      assembledPerimeter, brahmaX, brahmaY, northDeg, VASTU_ZONES, cuts
    );
    // In the builder, cuts are drawn outside the assembled perimeter (missing corners),
    // so calculateZoneAreas clips them to zero. Use calculateCutAnalysis (centroid-based)
    // to correctly determine which zone each cut belongs to and its share of that zone.
    const cutAnalysis = cuts.length > 0
      ? calculateCutAnalysis(assembledPerimeter, brahmaX, brahmaY, northDeg, VASTU_ZONES, cuts)
      : [];

    return VASTU_ZONES.map((z) => {
      const r = results.find((res) => res.zoneName === z.shortName);
      const pct = r?.pctOfTotal ?? 0;
      const zoneAreaPx = r?.areaPixels ?? 0;

      // Determine cut membership by centroid (works for outside-perimeter cuts)
      const cutsInZone = cutAnalysis.filter((c) => c.primaryZone === z.shortName);
      const hasCut = cutsInZone.length > 0;
      const totalCutAreaPx = cutsInZone.reduce((sum, c) => sum + c.areaPixels, 0);
      const cutPct = hasCut && zoneAreaPx > 0 ? (totalCutAreaPx / zoneAreaPx) * 100 : 0;

      const status: "good" | "warning" | "critical" =
        pct >= 5 && pct <= 7.5 ? "good" : pct < 3 ? "critical" : "warning";
      return { zone: z, pct, status, hasCut, cutPct };
    });
  }, [assembledPerimeter, brahmaX, brahmaY, northDeg, cuts, hasPerimeter]);

  const cutRows = useMemo(() => {
    if (!hasPerimeter || cuts.length === 0) return [];
    return calculateCutAnalysis(assembledPerimeter, brahmaX, brahmaY, northDeg, VASTU_ZONES, cuts);
  }, [assembledPerimeter, brahmaX, brahmaY, northDeg, cuts, hasPerimeter]);

  const maxPct    = Math.max(...zoneRows.map((r) => r.pct), 10);
  const maxCutPct = Math.max(...cutRows.map((r) => r.pctOfCombined), 1);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto min-h-0 pr-[1px]">
        <div className="text-[8px] text-vastu-text-3 mb-[5px] uppercase tracking-[1px] truncate">
          {projectName || "Builder Canvas"}
        </div>
        <div className="flex gap-[9px] mb-[8px] text-[9px] text-vastu-text-3">
          <span>N: <strong className="text-gold-2 font-mono">{northDeg.toFixed(1)}°</strong></span>
          <span>Cuts: <strong className="text-[#c04040]">{cuts.length}</strong></span>
          <span>Ideal: <strong className="text-vastu-text-2">6.25%</strong></span>
        </div>

        <div className="flex items-center gap-[6px] mb-[5px]">
          <span className="text-[8px] text-vastu-text-3 uppercase tracking-[1px]">Zone Area Distribution</span>
          {!hasPerimeter && (
            <span className="text-[7px] text-vastu-text-3 italic">(add rooms to activate)</span>
          )}
        </div>

        <div className="flex flex-col">
          {zoneRows.map(({ zone, pct, status, hasCut, cutPct }) => (
            <div
              key={zone.shortName}
              className="group flex items-center gap-[5px] px-[3px] py-[3px] rounded-[4px] cursor-default hover:bg-[rgba(200,175,120,0.05)] relative"
            >
              <div className="w-[5px] h-[18px] rounded-[2px] flex-shrink-0" style={{ background: zone.color }} />
              <span className="font-mono text-[9px] text-vastu-text-2 w-[30px] flex-shrink-0">{zone.shortName}</span>
              <div className="flex-1">
                <div
                  className="h-[3px] rounded-[2px] transition-all duration-300"
                  style={{
                    width: `${(pct / maxPct) * 100}%`,
                    background: status === "good" ? zone.color : status === "warning" ? "#c8a028" : "#c04040",
                  }}
                />
              </div>
              <span className="font-mono text-[9px] text-vastu-text-3 w-8 text-right flex-shrink-0">{pct.toFixed(1)}%</span>
              <span className="text-[9px] w-[14px] text-center flex-shrink-0">
                {status === "good" ? "✓" : status === "warning" ? "⚠" : "✕"}
              </span>
              <div className="hidden group-hover:block absolute left-full top-1/2 -translate-y-1/2 ml-[6px] bg-bg-2 border border-[rgba(200,175,120,0.15)] rounded-[6px] px-[10px] py-[7px] min-w-[190px] z-50 pointer-events-none shadow-lg">
                <div className="text-[10px] text-gold-2 font-medium mb-[4px]">{zone.name}</div>
                <div className="text-[9px] text-vastu-text-2 leading-[1.8]">
                  <span className="text-vastu-text-3">Deity:</span> {zone.deity}<br />
                  <span className="text-vastu-text-3">Element:</span> {zone.element}<br />
                  <span className="text-vastu-text-3">Governs:</span> {zone.governs}<br />
                  <span className="text-vastu-text-3">Ideal use:</span> {zone.idealUse[0]}
                  {hasCut && (
                    <><br /><span style={{ color: "#e05050" }}>✕ Cut — {cutPct.toFixed(1)}% of zone</span></>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="mt-[8px] pt-[8px] border-t border-[rgba(200,175,120,0.08)]">
          <div className="text-[8px] text-vastu-text-3 mb-[4px]">Zone Distribution</div>
          <div className="flex items-end gap-[2px] h-[44px]">
            {zoneRows.map(({ zone, pct, status }) => (
              <div
                key={zone.shortName}
                className="flex-1 rounded-t-[2px] min-w-0 transition-all duration-300"
                style={{
                  height: `${Math.max((pct / maxPct) * 100, 4)}%`,
                  background: status === "good" ? zone.color : status === "warning" ? "#c8a028" : "#c04040",
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
          <div className="flex gap-[2px] mt-[2px]">
            {zoneRows.map(({ zone }) => (
              <div key={zone.shortName} className="flex-1 text-center font-mono overflow-hidden min-w-0" style={{ fontSize: "5px", color: "var(--vastu-text-3)" }}>
                {zone.shortName}
              </div>
            ))}
          </div>
        </div>

        {/* Cut analysis */}
        {cutRows.length > 0 && (
          <div className="mt-[10px] pt-[9px] border-t border-[rgba(200,175,120,0.12)]">
            <div className="flex items-center justify-between mb-[7px]">
              <div className="flex items-center gap-[5px]">
                <span className="text-[8px] text-vastu-text-3 uppercase tracking-[1px]">Cut Analysis</span>
                <span className="text-[7px] font-mono px-[5px] py-[1px] rounded-full" style={{ background: "rgba(200,60,40,0.15)", color: "#e05050" }}>
                  {cutRows.length}
                </span>
              </div>
              <div className="text-[7px] text-vastu-text-3 italic">% of floor + cuts</div>
            </div>
            <div className="flex flex-col gap-[3px]">
              {cutRows.map((row) => {
                const s = SEV_STYLE[row.severity];
                return (
                  <div key={row.id} className="flex items-center gap-[5px] px-[3px] py-[3px] rounded-[4px] hover:bg-[rgba(200,175,120,0.04)]">
                    <div className="w-[5px] h-[18px] rounded-[2px] flex-shrink-0" style={{ background: s.bar, opacity: 0.75 }} />
                    <span className="font-mono text-[8px] text-vastu-text-3 flex-shrink-0 min-w-[32px]">{row.label}</span>
                    <span className="text-[7px] font-mono px-[4px] py-[1px] rounded-[3px] flex-shrink-0" style={{ background: "rgba(200,175,120,0.1)", color: "var(--gold-3)" }}>
                      {row.primaryZone}
                    </span>
                    <div className="flex-1">
                      <div className="h-[3px] rounded-[2px] transition-all duration-300" style={{ width: `${(row.pctOfCombined / maxCutPct) * 100}%`, background: s.bar, opacity: 0.9 }} />
                    </div>
                    <span className="font-mono text-[9px] w-8 text-right flex-shrink-0" style={{ color: s.text }}>{row.pctOfCombined.toFixed(1)}%</span>
                    <span className="text-[6px] px-[4px] py-[1px] rounded-[3px] uppercase font-sans font-semibold flex-shrink-0 tracking-[0.5px]" style={{ background: s.badge, color: s.text }}>
                      {row.severity}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-[6px] text-[7px] text-vastu-text-3 leading-[1.9]">
              <span style={{ color: "#c8a028" }}>●</span> mild &lt;5%&ensp;
              <span style={{ color: "#e87820" }}>●</span> moderate 5–15%&ensp;
              <span style={{ color: "#e05050" }}>●</span> severe &gt;15%
              <span className="ml-1 italic">(% of floor plan)</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-[6px] pt-[9px] flex-shrink-0">
        <Button variant="primary" className="flex-1 justify-center text-[10px] py-[5px]" onClick={onExport}>
          ⎙ Export
        </Button>
      </div>
    </div>
  );
}

// ── North pane ────────────────────────────────────────────────────────────────
function BuilderNorthPanel() {
  const { northDeg, setNorth } = useBuilderStore();
  const { showToast } = useToast();
  const [inputVal, setInputVal] = useState(northDeg.toFixed(1));
  const [method, setMethod]     = useState<"manual" | "gps" | "maps">("manual");

  // Keep input in sync when northDeg changes externally
  useEffect(() => {
    setInputVal(northDeg.toFixed(1));
  }, [northDeg]);

  const handleApply = useCallback(() => {
    const v = parseFloat(inputVal);
    if (isNaN(v)) return;
    const clamped = Math.max(0, Math.min(360, v));
    setNorth(clamped, "manual");
    showToast(`✓ True North locked at ${clamped.toFixed(1)}°`);
  }, [inputVal, setNorth, showToast]);

  const handleGPS = useCallback(async () => {
    if (!navigator.geolocation) return;
    setMethod("gps");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(`/api/north/declination?lat=${latitude}&lon=${longitude}`);
        const json = await res.json();
        const decl = json.declination ?? 0;
        const trueNorth = ((northDeg + decl) % 360 + 360) % 360;
        setNorth(trueNorth, "gps");
        setInputVal(trueNorth.toFixed(1));
        showToast("📍 GPS location acquired");
      } catch {
        showToast("GPS failed — set manually");
      }
    });
  }, [northDeg, setNorth, showToast]);

  const deg = parseFloat(inputVal) || northDeg;

  return (
    <div>
      <div className="flex gap-1 mb-[11px]">
        {(["manual", "gps", "maps"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMethod(m); if (m === "gps") handleGPS(); }}
            className={`flex-1 py-[6px] px-[3px] text-center text-[10px] rounded-[5px] cursor-pointer font-sans transition-all duration-[130ms] border ${
              method === m
                ? "bg-[rgba(200,175,120,0.12)] border-gold text-gold-2"
                : "bg-bg-3 border-[rgba(200,175,120,0.08)] text-vastu-text-3 hover:border-gold-3 hover:text-vastu-text-2"
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div className="text-center p-[11px] bg-bg-3 rounded-[7px] mb-[9px] border border-[rgba(200,175,120,0.15)]">
        <div className="font-serif text-[38px] font-light text-gold-2 leading-none">{northDeg.toFixed(1)}°</div>
        <div className="text-[8px] text-vastu-text-3 uppercase tracking-[1.5px] mt-[2px]">True North</div>
      </div>

      <div className="mb-[9px]">
        <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">
          Degree (0°–360°, clockwise from top)
        </label>
        <input
          type="number"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
          min={0} max={360} step={0.5}
          className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3"
        />
      </div>

      <div className="flex justify-center my-2">
        <svg width="86" height="86" viewBox="0 0 86 86">
          <circle cx="43" cy="43" r="39" fill="var(--bg-3)" stroke="rgba(200,175,120,0.15)" strokeWidth="1" />
          <g style={{ transformOrigin: "43px 43px", transform: `rotate(${-deg}deg)` }}>
            <line x1="43" y1="8" x2="43" y2="78" stroke="rgba(200,175,120,0.2)" strokeWidth="0.6" />
            <line x1="8" y1="43" x2="78" y2="43" stroke="rgba(200,175,120,0.2)" strokeWidth="0.6" />
            <polygon points="43,10 39,26 47,26" fill="var(--gold)" />
            <circle cx="43" cy="43" r="3" fill="var(--gold)" />
            <text x="43" y="7" textAnchor="middle" fill="var(--gold-2)" fontSize="8" fontWeight="600" fontFamily="monospace">N</text>
            <text x="43" y="83" textAnchor="middle" fill="rgba(112,96,80,0.8)" fontSize="7" fontFamily="monospace">S</text>
            <text x="81" y="46" textAnchor="middle" fill="rgba(112,96,80,0.8)" fontSize="7" fontFamily="monospace">E</text>
            <text x="5"  y="46" textAnchor="middle" fill="rgba(112,96,80,0.8)" fontSize="7" fontFamily="monospace">W</text>
          </g>
        </svg>
      </div>

      <Button variant="primary" className="w-full justify-center text-[11px]" onClick={handleApply}>
        ✓ Apply &amp; Lock North
      </Button>

      <div className="mt-[9px] p-2 bg-bg-3 rounded-[5px] border border-[rgba(200,175,120,0.08)] text-[8px] text-vastu-text-3 leading-[1.9]">
        <strong className="text-vastu-text-2">Method:</strong> {method.charAt(0).toUpperCase() + method.slice(1)}<br />
        <strong className="text-vastu-text-2">True North:</strong> {northDeg.toFixed(1)}°<br />
        <strong className="text-vastu-text-2">Note:</strong> Magnetic declination correction applied via NOAA.
      </div>
    </div>
  );
}

// ── Chat pane ─────────────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  "What does the SW cut mean for this property?",
  "How is the NE zone looking?",
  "Suggest non-demolition remedies for the cuts",
  "What room should go in the NE zone?",
];

function BuilderChatPanel() {
  const { northDeg, cuts, assembledPerimeter } = useBuilderStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      content: "Namaste! I'm your Vastu advisor. Add rooms to your builder canvas first, then I can give you accurate zone analysis. What would you like to know?",
      timestamp: new Date().toISOString(),
      cite: "Vishwakarma Prakash",
    },
  ]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [messages, loading]);

  const buildContext = () => {
    if (assembledPerimeter.length >= 3) {
      return `Floor plan has ${assembledPerimeter.length} boundary points. Cuts: ${cuts.length}. North: ${northDeg.toFixed(1)}°.`;
    }
    return `North: ${northDeg.toFixed(1)}°. Floor plan not yet assembled — add rooms to the canvas.`;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    const userMsg: ChatMessage = { id: `msg-${++msgIdCounter}`, role: "user", content: text.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history, context: buildContext() }),
      });
      const json = await res.json();
      const aiMsg: ChatMessage = {
        id: `msg-${++msgIdCounter}`, role: "assistant",
        content: json.message ?? "Sorry, I could not process that.",
        timestamp: new Date().toISOString(),
        cite: json.cite,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [...prev, { id: `msg-${++msgIdCounter}`, role: "assistant", content: "Network error — please try again.", timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={historyRef} className="flex-1 overflow-y-auto space-y-[8px] min-h-0 pr-[2px]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-[10px] py-[7px] rounded-[8px] text-[10px] leading-[1.7] font-sans ${
                msg.role === "user"
                  ? "bg-[rgba(200,175,120,0.12)] text-vastu-text border border-[rgba(200,175,120,0.2)]"
                  : "bg-bg-3 text-vastu-text-2 border border-[rgba(200,175,120,0.08)]"
              }`}
            >
              {msg.content}
              {msg.cite && (
                <div className="mt-[4px] text-[8px] text-vastu-text-3 italic">— {msg.cite}</div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-bg-3 border border-[rgba(200,175,120,0.08)] px-[10px] py-[7px] rounded-[8px] text-[10px] text-vastu-text-3 font-sans">
              Consulting classical texts…
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-[4px] mt-[8px]">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => sendMessage(chip)}
            className="text-[8px] px-[7px] py-[3px] rounded-full border border-[rgba(200,175,120,0.15)] text-vastu-text-3 hover:border-gold-3 hover:text-vastu-text-2 transition-colors font-sans cursor-pointer bg-transparent"
          >
            {chip.length > 32 ? chip.slice(0, 30) + "…" : chip}
          </button>
        ))}
      </div>

      <div className="flex gap-[6px] mt-[8px] flex-shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Ask about zones, remedies…"
          className="flex-1 px-[9px] py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[5px] text-vastu-text font-sans text-[11px] outline-none focus:border-gold-3"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="px-[10px] py-[6px] bg-gold text-bg font-sans font-medium text-[10px] rounded-[5px] hover:bg-gold-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ── Root panel ────────────────────────────────────────────────────────────────
export default function BuilderRightPanel({ onExport }: { onExport: () => void }) {
  const [open, setOpen]         = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("analysis");

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex-shrink-0 w-[28px] bg-bg-2 border-l border-[rgba(200,175,120,0.15)] flex items-center justify-center text-vastu-text-3 hover:text-gold-2 cursor-pointer text-[10px] transition-colors"
        >
          ◁
        </button>
      )}

      {open && (
        <div className="w-[290px] bg-bg-2 border-l border-[rgba(200,175,120,0.15)] flex flex-col flex-shrink-0 overflow-hidden z-[5]">
          <div className="flex items-center h-9 border-b border-[rgba(200,175,120,0.08)] flex-shrink-0 px-[10px]">
            <div className="flex flex-1">
              {(["analysis", "north", "chatbot"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-[9px] text-center text-[10px] cursor-pointer border-b-2 transition-all duration-[130ms] font-sans whitespace-nowrap bg-transparent border-none",
                    activeTab === tab
                      ? "text-gold-2 border-b-gold border-b-2"
                      : "text-vastu-text-3 border-b-transparent hover:text-vastu-text-2"
                  )}
                  style={{ borderBottom: activeTab === tab ? "2px solid var(--gold)" : "2px solid transparent" }}
                >
                  {tab === "analysis" ? "Analysis" : tab === "north" ? "North" : "Vastu AI"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-[11px] text-vastu-text-3 cursor-pointer px-[3px] py-[3px] rounded-[3px] hover:text-gold-2 ml-1 bg-transparent border-none flex-shrink-0"
            >
              ✕
            </button>
          </div>

          <div className={cn("flex-1 overflow-hidden", activeTab === "chatbot" ? "flex flex-col" : "overflow-y-auto")}>
            <div className={cn("p-[11px] h-full", activeTab === "chatbot" && "flex flex-col")}>
              {activeTab === "analysis" && <BuilderAnalysis onExport={onExport} />}
              {activeTab === "north"    && <BuilderNorthPanel />}
              {activeTab === "chatbot" && <BuilderChatPanel />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
