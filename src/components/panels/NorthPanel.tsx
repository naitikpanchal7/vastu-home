"use client";

import { useState } from "react";
import { useNorth } from "@/hooks/useNorth";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";

export default function NorthPanel() {
  const { northDeg, northMethod, applyManual, applyGPS } = useNorth();
  const { showToast } = useToast();
  const [inputVal, setInputVal] = useState(northDeg.toFixed(1));
  const [address, setAddress] = useState("");
  const [method, setMethod] = useState<"manual" | "gps" | "maps">("manual");

  const handleApply = () => {
    const v = parseFloat(inputVal);
    if (isNaN(v)) return;
    applyManual(Math.max(0, Math.min(360, v)));
    showToast(`✓ True North locked at ${v.toFixed(1)}°`);
  };

  const handleGPS = async () => {
    await applyGPS();
    showToast("📍 GPS location acquired");
  };

  const deg = parseFloat(inputVal) || northDeg;

  return (
    <div>
      {/* Method selector */}
      <div className="flex gap-1 mb-[11px]">
        {(["manual", "gps", "maps"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMethod(m);
              if (m === "gps") handleGPS();
            }}
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

      {/* Big north display */}
      <div className="text-center p-[11px] bg-bg-3 rounded-[7px] mb-[9px] border border-[rgba(200,175,120,0.15)]">
        <div className="font-serif text-[38px] font-light text-gold-2 leading-none">{northDeg.toFixed(1)}°</div>
        <div className="text-[8px] text-vastu-text-3 uppercase tracking-[1.5px] mt-[2px]">True North</div>
      </div>

      {/* Degree input */}
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

      {/* Mini compass */}
      <div className="flex justify-center my-2">
        <svg width="86" height="86" viewBox="0 0 86 86">
          <circle cx="43" cy="43" r="39" fill="var(--bg-3)" stroke="rgba(200,175,120,0.15)" strokeWidth="1" />
          <g style={{ transformOrigin: "43px 43px", transform: `rotate(${deg}deg)` }}>
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

      {/* Address */}
      <div className="mb-[9px]">
        <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Property Address</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter address…"
          className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3"
        />
      </div>

      <Button variant="primary" className="w-full justify-center text-[11px]" onClick={handleApply}>
        ✓ Apply &amp; Lock North
      </Button>

      {/* Info box */}
      <div className="mt-[9px] p-2 bg-bg-3 rounded-[5px] border border-[rgba(200,175,120,0.08)] text-[8px] text-vastu-text-3 leading-[1.9]">
        <strong className="text-vastu-text-2">Method:</strong> {method.charAt(0).toUpperCase() + method.slice(1)}<br />
        <strong className="text-vastu-text-2">True North:</strong> {northDeg.toFixed(1)}°<br />
        <strong className="text-vastu-text-2">Note:</strong> Magnetic declination correction applied via NOAA.
      </div>
    </div>
  );
}
