"use client";

import React, { useRef, useState, useCallback } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { useCanvas } from "@/hooks/useCanvas";
import ShaktiChakra from "./ShaktiChakra";
import BrahmasthanDot from "./BrahmasthanDot";
import CompassRose from "./NorthArrow";
import type { Point } from "@/lib/vastu/geometry";
import { VASTU_ZONES } from "@/lib/vastu/zones";

const SVG_W = 760;
const SVG_H = 620;

type PanOrigin = { mx: number; my: number; px: number; py: number };


export default function VastuCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { store, getSVGCoords, recalcZones } = useCanvas();
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [scaleStep, setScaleStep] = useState(0);
  const [scalePt1, setScalePt1] = useState<Point | null>(null);
  const [scalePt2, setScalePt2] = useState<Point | null>(null);
  const [showScaleDlg, setShowScaleDlg] = useState(false);
  const [scaleDistance, setScaleDistance] = useState("");
  const [scaleUnit, setScaleUnit] = useState<"ft" | "m">("ft");
  const [showBrahmaDlg, setShowBrahmaDlg] = useState(false);
  const [showDropZone, setShowDropZone] = useState(false);
  const lastClickTime = useRef(0);

  // Pan state — isPanning is local UI-only (cursor); panX/panY live in the store (per floor)
  const [isPanning, setIsPanning] = useState(false);
  const panOrigin = useRef<PanOrigin | null>(null);
  const didPan = useRef(false);

  const {
    currentTool, perimeterPoints, perimeterComplete,
    northDeg, brahmaX, brahmaY, chakraVisible, chakraOpacity,
    zoomLevel, panX, panY, cuts, floorPlanImage, setFloorPlanImage,
    addPerimeterPoint, closePerimeter,
    addCut, setScale, setTool, setZoom, setPan,
    zoneMode, perimeterVisible, cutsVisible,
  } = store;

  // ── Cut drawing state (local, not in store until complete) ──
  const [cutPts, setCutPts] = useState<Point[]>([]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (currentTool !== "select") return;
      if ((e.target as Element).closest("[data-brahma]")) return;
      if (e.button !== 0) return;
      panOrigin.current = { mx: e.clientX, my: e.clientY, px: panX, py: panY };
      didPan.current = false;
      setIsPanning(true);
    },
    [currentTool, panX, panY]
  );

  const handleMouseUp = useCallback(() => {
    panOrigin.current = null;
    setIsPanning(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (didPan.current) { didPan.current = false; return; }
      if ((e.target as Element).closest("[data-brahma]")) return;
      const now = Date.now();
      if (now - lastClickTime.current < 350) return;
      lastClickTime.current = now;

      const pt = getSVGCoords(e);

      if (currentTool === "perimeter" && !perimeterComplete) {
        addPerimeterPoint(pt);
      } else if (currentTool === "cut") {
        setCutPts((prev) => [...prev, pt]);
      } else if (currentTool === "scale") {
        if (scaleStep === 0) {
          setScalePt1(pt);
          setScaleStep(1);
        } else if (scaleStep === 1) {
          setScalePt2(pt);
          setScaleStep(2);
          setShowScaleDlg(true);
        }
      }
    },
    [currentTool, perimeterComplete, scaleStep, addPerimeterPoint, getSVGCoords]
  );

  const handleDblClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      lastClickTime.current = Date.now();
      if (currentTool === "perimeter" && perimeterPoints.length >= 3 && !perimeterComplete) {
        closePerimeter();
        recalcZones();
        setShowBrahmaDlg(true);
        setTool("select");
      } else if (currentTool === "cut" && cutPts.length >= 3) {
        addCut([...cutPts]);
        setCutPts([]);
        recalcZones();
        setTool("select");
      }
    },
    [currentTool, perimeterPoints.length, perimeterComplete, cutPts, closePerimeter, addCut, recalcZones, setTool]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (panOrigin.current) {
        const dx = e.clientX - panOrigin.current.mx;
        const dy = e.clientY - panOrigin.current.my;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan.current = true;
        setPan(panOrigin.current.px + dx, panOrigin.current.py + dy);
        return;
      }
      const pt = getSVGCoords(e);
      setMousePos(pt);
    },
    [getSVGCoords]
  );

  const confirmScale = useCallback(() => {
    if (!scalePt1 || !scalePt2) return;
    const d = parseFloat(scaleDistance);
    if (!d || d <= 0) return;
    const px = Math.hypot(scalePt2.x - scalePt1.x, scalePt2.y - scalePt1.y);
    setScale({ pt1: scalePt1, pt2: scalePt2, realDistance: d, unit: scaleUnit, pixelsPerUnit: px / d });
    setShowScaleDlg(false);
    setScaleStep(0);
    setScalePt1(null);
    setScalePt2(null);
    setScaleDistance("");
    recalcZones();
    setTool("select");
  }, [scalePt1, scalePt2, scaleDistance, scaleUnit, setScale, recalcZones, setTool]);

  const cancelScale = () => {
    setShowScaleDlg(false);
    setScaleStep(0);
    setScalePt1(null);
    setScalePt2(null);
    setTool("select");
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFloorPlanImage(url);
    setShowDropZone(false);
  };

  const svgCursor = {
    select:    "default",
    perimeter: "crosshair",
    cut:       "crosshair",
    scale:     "crosshair",
    brahma:    "move",
    entrance:  "crosshair",
    facing:    "crosshair",
  }[currentTool] ?? "default";

  const toolMsg: Record<string, string> = {
    perimeter: "⬡ Perimeter Mode — Click to place points. Double-click to close.",
    cut:       "✂ Cut Mode — Click to draw cut area. Double-click to close.",
    scale:     "⊷ Scale Mode — Click two points, then enter real distance.",
    brahma:    "◉ Brahmasthan Mode — Drag the gold center dot.",
    entrance:  "⛩ Entrance Mode — Click on a perimeter wall to mark the entrance.",
    facing:    "⬆ Facing Mode — Click to set the facing direction.",
    select:    "",
  };
  const toolMsgText = toolMsg[currentTool] ?? "";

  const perimeterPts = perimeterPoints.length > 0 ? perimeterPoints : null;
  const perimeterStr = perimeterPts
    ? perimeterPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
    : "";

  const scaleInfo = store.scale
    ? `Scale: 1px = ${(1 / store.scale.pixelsPerUnit).toFixed(2)} ${store.scale.unit}`
    : "Scale: not calibrated";

  const perimeterStatus = perimeterComplete
    ? `Perimeter: ${perimeterPoints.length} pts — closed`
    : perimeterPoints.length > 0
    ? `Perimeter: ${perimeterPoints.length} pts drawn`
    : "Perimeter: not drawn";

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col min-h-0 bg-white">
      {/* Canvas stage */}
      <div
        className="flex-1 relative overflow-hidden min-h-0"
        onDragOver={(e) => { e.preventDefault(); setShowDropZone(true); }}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file?.type.startsWith("image/")) {
            setFloorPlanImage(URL.createObjectURL(file));
          }
          setShowDropZone(false);
        }}
        onDragLeave={() => setShowDropZone(false)}
      >

        {/* SVG fills the full container so every pixel is interactive — no dead zones
            when panels collapse. preserveAspectRatio keeps the viewBox centred.
            The floor plan image lives INSIDE the SVG so it shares the same coordinate
            space as the perimeter/cuts and scales together with them perfectly. */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            cursor: isPanning ? "grabbing" : currentTool === "select" ? "grab" : svgCursor,
            transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel / 100})`,
            transformOrigin: "center center",
            zIndex: 2,
          }}
          onClick={handleClick}
          onDoubleClick={handleDblClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Floor plan image — inside SVG so it shares the same coordinate space
              as the perimeter/cuts and scales identically when panels resize. */}
          {floorPlanImage && (
            <image
              href={floorPlanImage}
              x="0" y="0"
              width={SVG_W}
              height={SVG_H}
              preserveAspectRatio="xMidYMid meet"
            />
          )}

          {/* User-drawn perimeter */}
          {perimeterPts && perimeterVisible && (
            <g>
              <polygon
                points={perimeterStr}
                fill="rgba(100,70,20,0.06)"
                stroke="rgba(120,85,20,0.90)"
                strokeWidth="2"
                strokeDasharray={perimeterComplete ? "none" : "6,3"}
              />
              {perimeterPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
                  r={i === 0 ? 5 : 3.5}
                  fill={i === 0 ? "var(--gold)" : "rgba(120,85,20,0.65)"}
                  stroke="var(--gold-2)" strokeWidth="1"
                />
              ))}
              {/* Preview line while drawing */}
              {!perimeterComplete && mousePos && perimeterPoints.length > 0 && (
                <polyline
                  points={[...perimeterPoints, mousePos].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke="rgba(100,70,20,0.45)"
                  strokeWidth="1.5"
                  strokeDasharray="5,3"
                />
              )}
            </g>
          )}

          {/* Zone division lines — radiating from Brahmasthan, clipped to perimeter */}
          {zoneMode !== "off" && perimeterComplete && perimeterPts && (() => {
            const FAR = 2000;
            const LABEL_R = zoneMode === "8" ? 110 : 90;

            // 8-zone compass: N NE E SE S SW W NW at 45° intervals
            const EIGHT_ZONES = [
              { shortName: "N",  angle: 0 },
              { shortName: "NE", angle: 45 },
              { shortName: "E",  angle: 90 },
              { shortName: "SE", angle: 135 },
              { shortName: "S",  angle: 180 },
              { shortName: "SW", angle: 225 },
              { shortName: "W",  angle: 270 },
              { shortName: "NW", angle: 315 },
            ];

            const zones16 = VASTU_ZONES.map((z) => ({
              shortName: z.shortName,
              // boundary line at zone start; label at zone mid
              lineAngle: z.startDeg,
              labelAngle: z.startDeg + 11.25,
            }));

            const zones8 = EIGHT_ZONES.map((z) => ({
              shortName: z.shortName,
              // boundary line sits 22.5° before zone center, dividing the 45° sector
              lineAngle: z.angle - 22.5,
              // label sits at zone center — inside the sector, not on the line
              labelAngle: z.angle,
            }));

            const zones = zoneMode === "16" ? zones16 : zones8;

            return (
              <g>
                <defs>
                  <clipPath id="zone-perimeter-clip">
                    <polygon points={perimeterStr} />
                  </clipPath>
                </defs>

                {/* Lines clipped to perimeter */}
                <g clipPath="url(#zone-perimeter-clip)">
                  {zones.map((z) => {
                    // Convention matches geometry.ts: screenAngle = vastu angle - northDeg
                    const screenAngle = ((z.lineAngle - northDeg) % 360 + 360) % 360;
                    const rad = (screenAngle * Math.PI) / 180;
                    return (
                      <line
                        key={`zone-line-${z.shortName}`}
                        x1={brahmaX} y1={brahmaY}
                        x2={brahmaX + Math.sin(rad) * FAR}
                        y2={brahmaY - Math.cos(rad) * FAR}
                        stroke="#4a90e2"
                        strokeWidth="2"
                        strokeOpacity="0.85"
                      />
                    );
                  })}
                </g>

                {/* Labels clipped to perimeter */}
                <g clipPath="url(#zone-perimeter-clip)">
                  {zones.map((z) => {
                    const screenAngle = ((z.labelAngle - northDeg) % 360 + 360) % 360;
                    const rad = (screenAngle * Math.PI) / 180;
                    const lx = brahmaX + Math.sin(rad) * LABEL_R;
                    const ly = brahmaY - Math.cos(rad) * LABEL_R;
                    return (
                      <text
                        key={`zone-label-${z.shortName}`}
                        x={lx} y={ly}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#4a90e2"
                        fontSize="8.5"
                        fontFamily="var(--font-dm-mono), monospace"
                        fontWeight="700"
                        opacity="0.9"
                      >
                        {z.shortName}
                      </text>
                    );
                  })}
                </g>
              </g>
            );
          })()}

          {/* Shakti Chakra overlay — isolated so its screen blend-mode composes
              against the group's transparent background, not the floor plan image
              (screen + white floor plan = invisible without this). */}
          <g style={{ isolation: "isolate" }}>
            <ShaktiChakra
              cx={brahmaX}
              cy={brahmaY}
              northDeg={northDeg}
              opacity={chakraOpacity}
              visible={chakraVisible}
            />
          </g>

          {/* Cuts */}
          {cutsVisible && cuts.map((cut) => {
            const cx2 = cut.points.reduce((s, p) => s + p.x, 0) / cut.points.length;
            const cy2 = cut.points.reduce((s, p) => s + p.y, 0) / cut.points.length;
            return (
              <g key={cut.id}>
                <polygon
                  points={cut.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                  fill="rgba(200,60,40,0.2)"
                  stroke="rgba(200,60,40,0.7)"
                  strokeWidth="1.8"
                  strokeDasharray="6,3"
                />
                <text
                  x={cx2.toFixed(1)} y={(cy2 - 4).toFixed(1)}
                  textAnchor="middle"
                  fill="#e05050"
                  fontSize="11"
                  fontFamily="var(--font-dm-mono), monospace"
                  fontWeight="600"
                >
                  {cut.label}
                </text>
              </g>
            );
          })}

          {/* Cut preview while drawing */}
          {currentTool === "cut" && cutPts.length > 0 && (
            <g>
              <polyline
                points={[...cutPts, ...(mousePos ? [mousePos] : [])].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                fill="none"
                stroke="rgba(200,60,40,0.6)"
                strokeWidth="1.5"
                strokeDasharray="4,3"
              />
              {cutPts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill="rgba(200,60,40,0.8)" />
              ))}
            </g>
          )}

          {/* Scale calibration line */}
          {scalePt1 && (
            <>
              <circle cx={scalePt1.x} cy={scalePt1.y} r="4" fill="var(--gold)" />
              {scalePt2 && (
                <>
                  <line
                    x1={scalePt1.x} y1={scalePt1.y}
                    x2={scalePt2.x} y2={scalePt2.y}
                    stroke="var(--gold)" strokeWidth="2" strokeDasharray="4,3"
                  />
                  <circle cx={scalePt2.x} cy={scalePt2.y} r="4" fill="var(--gold)" />
                </>
              )}
              {!scalePt2 && mousePos && (
                <line
                  x1={scalePt1.x} y1={scalePt1.y}
                  x2={mousePos.x} y2={mousePos.y}
                  stroke="rgba(100,70,20,0.45)" strokeWidth="1.5" strokeDasharray="4,3"
                />
              )}
            </>
          )}

          {/* Brahmasthan dot */}
          <BrahmasthanDot svgRef={svgRef} onMove={recalcZones} />
        </svg>

        {/* Compass rose */}
        <CompassRose northDeg={northDeg} />

        {/* Mode indicator */}
        {toolMsgText && (
          <div className="absolute top-[10px] left-1/2 -translate-x-1/2 bg-bg-2 border border-gold-3 rounded-full px-[14px] py-1 text-[10px] text-gold-2 z-[15] pointer-events-none animate-fade-in">
            {toolMsgText}
          </div>
        )}

        {/* Scale input dialog */}
        {showScaleDlg && (
          <div className="absolute bottom-11 left-1/2 -translate-x-1/2 bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[8px] p-[11px_15px] min-w-[250px] z-20 animate-fade-up">
            <h4 className="text-[12px] text-vastu-text mb-[2px]">⊷ Set Scale Reference</h4>
            <p className="text-[9px] text-vastu-text-3 mb-[9px] leading-relaxed">
              Enter the real-world distance between the two points you marked.
            </p>
            <div className="flex gap-[7px] items-center mb-[9px]">
              <input
                type="number"
                value={scaleDistance}
                onChange={(e) => setScaleDistance(e.target.value)}
                placeholder="e.g. 22"
                className="flex-1 px-[9px] py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3"
                min={1}
              />
              <select
                value={scaleUnit}
                onChange={(e) => setScaleUnit(e.target.value as "ft" | "m")}
                className="w-[60px] px-[6px] py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none"
              >
                <option value="ft">ft</option>
                <option value="m">m</option>
              </select>
            </div>
            <div className="flex gap-[6px]">
              <button onClick={cancelScale} className="flex-1 text-[10px] px-[9px] py-1 bg-transparent border border-[rgba(100,70,20,0.20)] text-vastu-text-2 rounded-md hover:border-gold-3 cursor-pointer font-sans">
                Cancel
              </button>
              <button onClick={confirmScale} className="flex-1 text-[10px] px-[9px] py-1 bg-gold text-[#faf7f0] rounded-md hover:bg-gold-2 cursor-pointer font-sans font-medium">
                ✓ Set Scale
              </button>
            </div>
          </div>
        )}

        {/* Brahmasthan confirm dialog */}
        {showBrahmaDlg && (
          <div className="absolute bottom-11 left-1/2 -translate-x-1/2 bg-bg-2 border border-[rgba(100,70,20,0.20)] rounded-[8px] p-[11px_15px] min-w-[250px] z-20 animate-fade-up">
            <h4 className="text-[12px] text-vastu-text mb-[2px]">✦ Brahmasthan Located</h4>
            <p className="text-[9px] text-vastu-text-3 mb-[9px] leading-relaxed">
              Center calculated from your floor plan perimeter. Drag the gold dot to fine-tune if needed.
            </p>
            <div className="flex gap-[6px]">
              <button
                onClick={() => { setShowBrahmaDlg(false); setTool("brahma"); }}
                className="flex-1 text-[10px] px-[9px] py-1 bg-transparent border border-[rgba(100,70,20,0.20)] text-vastu-text-2 rounded-md hover:border-gold-3 cursor-pointer font-sans"
              >
                Adjust
              </button>
              <button
                onClick={() => { store.confirmBrahma(); setShowBrahmaDlg(false); }}
                className="flex-1 text-[10px] px-[9px] py-1 bg-gold text-[#faf7f0] rounded-md hover:bg-gold-2 cursor-pointer font-sans font-medium"
              >
                ✓ Confirm
              </button>
            </div>
          </div>
        )}

        {/* Drop zone */}
        {showDropZone && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[10px] bg-bg/88 z-30">
            <div className="w-[148px] h-[148px] rounded-full border-2 border-dashed border-gold-3 flex flex-col items-center justify-center gap-[7px]">
              <span className="text-[34px] opacity-50">🏠</span>
              <span className="text-[12px] text-vastu-text-2">Drop floor plan here</span>
              <span className="text-[9px] text-vastu-text-3">JPG · PNG · SVG</span>
            </div>
            <div className="flex gap-2 mt-[14px]">
              <label className="cursor-pointer">
                <input type="file" accept="image/*,.svg" className="hidden" onChange={handleFileInput} />
                <span className="inline-flex items-center gap-1 text-[10px] px-[13px] py-[6px] bg-gold text-[#faf7f0] rounded-md hover:bg-gold-2 font-sans font-medium">
                  📂 Choose File
                </span>
              </label>
              <button
                onClick={() => setShowDropZone(false)}
                className="text-[10px] px-[13px] py-[6px] bg-transparent border border-[rgba(100,70,20,0.20)] text-vastu-text-2 rounded-md hover:border-gold-3 cursor-pointer font-sans"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="h-8 bg-bg-2 border-t border-[rgba(100,70,20,0.20)] flex items-center px-3 gap-[9px] text-[10px] text-vastu-text-3 flex-shrink-0">
        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(zoomLevel - 10)}
            className="w-[19px] h-[19px] bg-bg-3 border border-[rgba(100,70,20,0.12)] rounded-[3px] flex items-center justify-center text-[11px] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2 cursor-pointer"
          >
            −
          </button>
          <span className="font-mono min-w-[32px] text-center">{zoomLevel}%</span>
          <button
            onClick={() => setZoom(zoomLevel + 10)}
            className="w-[19px] h-[19px] bg-bg-3 border border-[rgba(100,70,20,0.12)] rounded-[3px] flex items-center justify-center text-[11px] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2 cursor-pointer"
          >
            +
          </button>
          <button
            onClick={() => { setZoom(100); setPan(0, 0); }}
            className="w-[19px] h-[19px] bg-bg-3 border border-[rgba(100,70,20,0.12)] rounded-[3px] flex items-center justify-center text-[10px] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2 cursor-pointer"
            title="Reset zoom & pan"
          >
            ⊙
          </button>
        </div>
        <div className="w-[1px] h-[13px] bg-[rgba(100,70,20,0.12)]" />
        <span>{scaleInfo}</span>
        <div className="w-[1px] h-[13px] bg-[rgba(100,70,20,0.12)]" />
        <span>{perimeterStatus}</span>
        <div className="flex-1" />
        {mousePos && (
          <span className="font-mono text-[9px]">
            {mousePos.x.toFixed(0)}, {mousePos.y.toFixed(0)}
          </span>
        )}
      </div>
    </div>
  );
}
