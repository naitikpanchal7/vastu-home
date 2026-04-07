"use client";

import React, { useRef, useState, useCallback } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { useCanvas } from "@/hooks/useCanvas";
import ShaktiChakra from "./ShaktiChakra";
import BrahmasthanDot from "./BrahmasthanDot";
import CompassRose from "./NorthArrow";
import type { Point } from "@/lib/vastu/geometry";

const SVG_W = 760;
const SVG_H = 620;

// Default demo floor plan (L-shaped)
const DEFAULT_PERIMETER = "110,75 620,75 620,300 475,300 475,530 110,530";

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

  const {
    currentTool, perimeterPoints, perimeterComplete,
    northDeg, brahmaX, brahmaY, chakraVisible, chakraOpacity,
    zoomLevel, cuts, floorPlanImage, setFloorPlanImage,
    addPerimeterPoint, closePerimeter,
    addCut, setScale, setTool, setZoom,
  } = store;

  // ── Cut drawing state (local, not in store until complete) ──
  const [cutPts, setCutPts] = useState<Point[]>([]);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
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
    : DEFAULT_PERIMETER;

  const scaleInfo = store.scale
    ? `Scale: 1px = ${(1 / store.scale.pixelsPerUnit).toFixed(2)} ${store.scale.unit}`
    : "Scale: not calibrated";

  const perimeterStatus = perimeterComplete
    ? `Perimeter: ${perimeterPoints.length} pts — closed`
    : perimeterPoints.length > 0
    ? `Perimeter: ${perimeterPoints.length} pts drawn`
    : "Perimeter: not drawn";

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col min-h-0 bg-bg">
      {/* Canvas stage */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center min-h-0"
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
        {/* Grid background */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(200,175,120,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(200,175,120,.04) 1px,transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        {/* Floor plan image (if uploaded) */}
        {floorPlanImage && (
          <img
            src={floorPlanImage}
            alt="Floor plan"
            className="absolute z-[1] max-w-[88%] max-h-[88%] object-contain pointer-events-none"
            style={{ transform: `scale(${zoomLevel / 100})` }}
          />
        )}

        {/* Main SVG */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{
            width: `min(${SVG_W}px, 100%)`,
            height: `min(${SVG_H}px, 100%)`,
            cursor: svgCursor,
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: "center center",
            position: "relative",
            zIndex: 2,
          }}
          onClick={handleClick}
          onDoubleClick={handleDblClick}
          onMouseMove={handleMouseMove}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Default / user floor plan */}
          {!perimeterPts ? (
            <g opacity="1">
              <polygon
                points={DEFAULT_PERIMETER}
                fill="rgba(200,175,120,0.055)"
                stroke="rgba(200,175,120,0.65)"
                strokeWidth="2"
              />
              {[
                [110, 248, 355, 248], [355, 75, 355, 530],
                [355, 352, 620, 352], [110, 392, 355, 392],
              ].map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(200,175,120,.18)" strokeWidth="1" />
              ))}
              {[
                [205, 162, "Living Room"], [512, 192, "Master Bedroom"],
                [205, 324, "Bedroom 2"],  [205, 462, "Kitchen"],
                [415, 450, "Dining"],
              ].map(([x, y, label]) => (
                <text key={label as string} x={x} y={y} textAnchor="middle" fill="rgba(200,175,120,.28)" fontFamily="DM Sans" fontSize="12">
                  {label}
                </text>
              ))}
            </g>
          ) : (
            /* User-drawn perimeter */
            <g>
              <polygon
                points={perimeterStr}
                fill="rgba(200,175,120,0.04)"
                stroke="rgba(200,175,120,0.9)"
                strokeWidth="2"
                strokeDasharray={perimeterComplete ? "none" : "6,3"}
              />
              {perimeterPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
                  r={i === 0 ? 5 : 3.5}
                  fill={i === 0 ? "var(--gold)" : "rgba(200,175,120,0.7)"}
                  stroke="var(--gold-2)" strokeWidth="1"
                />
              ))}
              {/* Preview line while drawing */}
              {!perimeterComplete && mousePos && perimeterPoints.length > 0 && (
                <polyline
                  points={[...perimeterPoints, mousePos].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke="rgba(200,175,120,0.5)"
                  strokeWidth="1.5"
                  strokeDasharray="5,3"
                />
              )}
            </g>
          )}

          {/* Shakti Chakra overlay */}
          <ShaktiChakra
            cx={brahmaX}
            cy={brahmaY}
            northDeg={northDeg}
            opacity={chakraOpacity}
            visible={chakraVisible}
          />

          {/* Cuts */}
          {cuts.map((cut) => {
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
                  stroke="rgba(200,175,120,0.5)" strokeWidth="1.5" strokeDasharray="4,3"
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
          <div className="absolute bottom-11 left-1/2 -translate-x-1/2 bg-bg-2 border border-[rgba(200,175,120,0.15)] rounded-[8px] p-[11px_15px] min-w-[250px] z-20 animate-fade-up">
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
                className="flex-1 px-[9px] py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3"
                min={1}
              />
              <select
                value={scaleUnit}
                onChange={(e) => setScaleUnit(e.target.value as "ft" | "m")}
                className="w-[60px] px-[6px] py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none"
              >
                <option value="ft">ft</option>
                <option value="m">m</option>
              </select>
            </div>
            <div className="flex gap-[6px]">
              <button onClick={cancelScale} className="flex-1 text-[10px] px-[9px] py-1 bg-transparent border border-[rgba(200,175,120,0.15)] text-vastu-text-2 rounded-md hover:border-gold-3 cursor-pointer font-sans">
                Cancel
              </button>
              <button onClick={confirmScale} className="flex-1 text-[10px] px-[9px] py-1 bg-gold text-bg rounded-md hover:bg-gold-2 cursor-pointer font-sans font-medium">
                ✓ Set Scale
              </button>
            </div>
          </div>
        )}

        {/* Brahmasthan confirm dialog */}
        {showBrahmaDlg && (
          <div className="absolute bottom-11 left-1/2 -translate-x-1/2 bg-bg-2 border border-[rgba(200,175,120,0.15)] rounded-[8px] p-[11px_15px] min-w-[250px] z-20 animate-fade-up">
            <h4 className="text-[12px] text-vastu-text mb-[2px]">✦ Brahmasthan Located</h4>
            <p className="text-[9px] text-vastu-text-3 mb-[9px] leading-relaxed">
              Center calculated from your floor plan perimeter. Drag the gold dot to fine-tune if needed.
            </p>
            <div className="flex gap-[6px]">
              <button
                onClick={() => { setShowBrahmaDlg(false); setTool("brahma"); }}
                className="flex-1 text-[10px] px-[9px] py-1 bg-transparent border border-[rgba(200,175,120,0.15)] text-vastu-text-2 rounded-md hover:border-gold-3 cursor-pointer font-sans"
              >
                Adjust
              </button>
              <button
                onClick={() => { store.confirmBrahma(); setShowBrahmaDlg(false); }}
                className="flex-1 text-[10px] px-[9px] py-1 bg-gold text-bg rounded-md hover:bg-gold-2 cursor-pointer font-sans font-medium"
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
                <span className="inline-flex items-center gap-1 text-[10px] px-[13px] py-[6px] bg-gold text-bg rounded-md hover:bg-gold-2 font-sans font-medium">
                  📂 Choose File
                </span>
              </label>
              <button
                onClick={() => setShowDropZone(false)}
                className="text-[10px] px-[13px] py-[6px] bg-transparent border border-[rgba(200,175,120,0.15)] text-vastu-text-2 rounded-md hover:border-gold-3 cursor-pointer font-sans"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="h-8 bg-bg-2 border-t border-[rgba(200,175,120,0.15)] flex items-center px-3 gap-[9px] text-[10px] text-vastu-text-3 flex-shrink-0">
        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(zoomLevel - 10)}
            className="w-[19px] h-[19px] bg-bg-3 border border-[rgba(200,175,120,0.08)] rounded-[3px] flex items-center justify-center text-[11px] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2 cursor-pointer"
          >
            −
          </button>
          <span className="font-mono min-w-[32px] text-center">{zoomLevel}%</span>
          <button
            onClick={() => setZoom(zoomLevel + 10)}
            className="w-[19px] h-[19px] bg-bg-3 border border-[rgba(200,175,120,0.08)] rounded-[3px] flex items-center justify-center text-[11px] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2 cursor-pointer"
          >
            +
          </button>
          <button
            onClick={() => setZoom(100)}
            className="w-[19px] h-[19px] bg-bg-3 border border-[rgba(200,175,120,0.08)] rounded-[3px] flex items-center justify-center text-[10px] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2 cursor-pointer"
          >
            ⊙
          </button>
        </div>
        <div className="w-[1px] h-[13px] bg-[rgba(200,175,120,0.08)]" />
        <span>{scaleInfo}</span>
        <div className="w-[1px] h-[13px] bg-[rgba(200,175,120,0.08)]" />
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
