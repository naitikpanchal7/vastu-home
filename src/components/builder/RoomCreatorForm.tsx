"use client";

import { useState } from "react";
import { useBuilderStore } from "@/store/builderStore";
import { ROOM_TYPE_OPTIONS } from "@/lib/builder/roomTypes";
import type { RoomType } from "@/lib/builder/roomTypes";
import type { RoomShape, ShapeConfig } from "@/lib/builder/presetShapes";

// ── Shape definitions ─────────────────────────────────────────────────────────

const SHAPES: { value: RoomShape; label: string; preview: string; desc: string }[] = [
  { value: "rectangle",    label: "Rectangle",    preview: "▭", desc: "Standard room" },
  { value: "l-shape",      label: "L-shape",      preview: "⌐", desc: "Corner notch" },
  { value: "t-shape",      label: "T-shape",      preview: "⊤", desc: "Central stem" },
  { value: "u-shape",      label: "U-shape",      preview: "⋃", desc: "Courtyard" },
  { value: "diagonal-cut", label: "Cut Corner",   preview: "◪", desc: "45° chamfer" },
];

// ── Sub-dimension configs per shape ───────────────────────────────────────────

interface SubDimField { key: keyof ShapeConfig; label: string; hint: string; defaultFn: (w: number, h: number) => number }

const SHAPE_SUB_DIMS: Partial<Record<RoomShape, SubDimField[]>> = {
  "l-shape": [
    { key: "cutWidthFt",  label: "Notch Width",  hint: "ft", defaultFn: (w) => Math.round(w * 0.4) },
    { key: "cutHeightFt", label: "Notch Depth",  hint: "ft", defaultFn: (_, h) => Math.round(h * 0.45) },
  ],
  "t-shape": [
    { key: "stemWidthFt", label: "Stem Width",   hint: "ft", defaultFn: (w) => Math.round(w * 0.4) },
    { key: "barHeightFt", label: "Bar Depth",    hint: "ft", defaultFn: (_, h) => Math.round(h * 0.4) },
  ],
  "u-shape": [
    { key: "armWidthFt",       label: "Arm Width",    hint: "ft", defaultFn: (w) => Math.round(w * 0.28) },
    { key: "openingHeightFt",  label: "Opening Depth", hint: "ft", defaultFn: (_, h) => Math.round(h * 0.5) },
  ],
  "diagonal-cut": [
    { key: "chamferFt", label: "Chamfer Size", hint: "ft", defaultFn: (w, h) => Math.round(Math.min(w, h) * 0.25) },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RoomCreatorForm() {
  const { addRoomTemplate, setDrawingRoom, isDrawingRoom } = useBuilderStore();

  const [name, setName]       = useState("");
  const [type, setType]       = useState<RoomType>("living-room");
  const [shape, setShape]     = useState<RoomShape>("rectangle");
  const [widthFt, setWidth]   = useState(12);
  const [heightFt, setHeight] = useState(10);
  const [subDims, setSubDims] = useState<Partial<ShapeConfig>>({});
  const [error, setError]     = useState("");

  // When shape changes, reset sub-dimensions to sensible defaults
  const handleShapeChange = (newShape: RoomShape) => {
    setShape(newShape);
    const fields = SHAPE_SUB_DIMS[newShape] ?? [];
    const defaults: Partial<ShapeConfig> = {};
    for (const f of fields) {
      (defaults as Record<string, number>)[f.key] = f.defaultFn(widthFt, heightFt);
    }
    setSubDims(defaults);
    setError("");
  };

  // Regenerate sub-dim defaults when overall size changes
  const handleWidthChange = (v: number) => {
    setWidth(v);
    const fields = SHAPE_SUB_DIMS[shape] ?? [];
    const updated = { ...subDims };
    for (const f of fields) {
      (updated as Record<string, number>)[f.key] = f.defaultFn(v, heightFt);
    }
    setSubDims(updated);
  };

  const handleHeightChange = (v: number) => {
    setHeight(v);
    const fields = SHAPE_SUB_DIMS[shape] ?? [];
    const updated = { ...subDims };
    for (const f of fields) {
      (updated as Record<string, number>)[f.key] = f.defaultFn(widthFt, v);
    }
    setSubDims(updated);
  };

  const setSubDim = (key: keyof ShapeConfig, val: number) => {
    setSubDims((prev) => ({ ...prev, [key]: val }));
  };

  const submit = () => {
    if (!name.trim()) { setError("Room name is required."); return; }
    if (widthFt < 1 || widthFt > 200) { setError("Width must be 1–200 ft."); return; }
    if (heightFt < 1 || heightFt > 200) { setError("Length must be 1–200 ft."); return; }
    setError("");
    addRoomTemplate(name.trim(), type, shape, widthFt, heightFt, subDims);
    setName("");
  };

  const subFields = SHAPE_SUB_DIMS[shape] ?? [];

  return (
    <div className="space-y-3">
      {/* Room name */}
      <div>
        <label className="block text-[9px] uppercase tracking-[1.5px] text-vastu-text-3 mb-1">
          Room Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="e.g. Master Bedroom"
          className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-md text-vastu-text font-sans text-[11px] outline-none focus:border-gold-3 placeholder:text-vastu-text-3"
        />
      </div>

      {/* Room type */}
      <div>
        <label className="block text-[9px] uppercase tracking-[1.5px] text-vastu-text-3 mb-1">
          Room Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as RoomType)}
          className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-md text-vastu-text font-sans text-[11px] outline-none focus:border-gold-3"
        >
          {ROOM_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-bg-3">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Shape */}
      <div>
        <label className="block text-[9px] uppercase tracking-[1.5px] text-vastu-text-3 mb-1">
          Shape
        </label>
        <div className="grid grid-cols-3 gap-1">
          {SHAPES.map((s) => (
            <button
              key={s.value}
              onClick={() => handleShapeChange(s.value)}
              title={s.desc}
              className={`flex flex-col items-center gap-[2px] py-[6px] px-1 rounded-md border text-center transition-all ${
                shape === s.value
                  ? "border-gold-3 bg-[rgba(200,175,120,0.12)] text-gold-2"
                  : "border-[rgba(200,175,120,0.12)] text-vastu-text-3 hover:border-[rgba(200,175,120,0.25)] hover:text-vastu-text-2"
              }`}
            >
              <span className="text-[18px] leading-none">{s.preview}</span>
              <span className="text-[7px] font-sans leading-tight">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Overall dimensions */}
      <div>
        <label className="block text-[9px] uppercase tracking-[1.5px] text-vastu-text-3 mb-1">
          Overall Size (ft)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={200}
            value={widthFt}
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            placeholder="W"
            className="w-full px-2 py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-md text-vastu-text font-mono text-[11px] outline-none focus:border-gold-3 text-center"
          />
          <span className="text-vastu-text-3 text-[10px] flex-shrink-0 font-sans">×</span>
          <input
            type="number"
            min={1}
            max={200}
            value={heightFt}
            onChange={(e) => handleHeightChange(Number(e.target.value))}
            placeholder="L"
            className="w-full px-2 py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-md text-vastu-text font-mono text-[11px] outline-none focus:border-gold-3 text-center"
          />
        </div>
        <p className="text-[8px] text-vastu-text-3 mt-[3px] font-sans">
          Width × Length — leave defaults if unsure, edit shape on canvas
        </p>
      </div>

      {/* Shape-specific sub-dimensions */}
      {subFields.length > 0 && (
        <div className="bg-bg-3/50 rounded-md p-2 border border-[rgba(200,175,120,0.08)] space-y-2">
          <p className="text-[8px] uppercase tracking-[1.5px] text-vastu-text-3 font-sans">
            Shape Details
          </p>
          {subFields.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-2">
              <label className="text-[9px] text-vastu-text-2 font-sans flex-1">{f.label}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={Math.max(widthFt, heightFt) - 1}
                  value={(subDims as Record<string, number>)[f.key] ?? f.defaultFn(widthFt, heightFt)}
                  onChange={(e) => setSubDim(f.key, Number(e.target.value))}
                  className="w-[52px] px-2 py-[4px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded text-vastu-text font-mono text-[10px] outline-none focus:border-gold-3 text-center"
                />
                <span className="text-[8px] text-vastu-text-3 font-sans">{f.hint}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && <p className="text-[10px] text-red-400 font-sans">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={submit}
          className="flex-1 py-[7px] bg-gold text-bg font-sans font-medium text-[11px] rounded-md hover:bg-gold-2 transition-colors"
        >
          + Add to Library
        </button>
      </div>

      {/* Draw divider */}
      <div className="relative flex items-center gap-2 pt-1">
        <div className="flex-1 h-px bg-[rgba(200,175,120,0.08)]" />
        <span className="text-[8px] text-vastu-text-3 font-sans uppercase tracking-[1px]">or</span>
        <div className="flex-1 h-px bg-[rgba(200,175,120,0.08)]" />
      </div>

      {/* Draw on canvas */}
      <button
        onClick={() => setDrawingRoom(!isDrawingRoom)}
        className={`w-full py-[7px] font-sans font-medium text-[11px] rounded-md border transition-colors ${
          isDrawingRoom
            ? "bg-amber-900/30 border-amber-700/50 text-amber-300"
            : "bg-transparent border-[rgba(200,175,120,0.2)] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2"
        }`}
      >
        {isDrawingRoom ? "✕ Cancel Drawing" : "✏ Draw Custom Room"}
      </button>

      {isDrawingRoom && (
        <div className="bg-amber-900/10 border border-amber-800/30 rounded-md px-3 py-2">
          <p className="text-[9px] text-amber-300/80 font-sans leading-relaxed">
            <strong>Click</strong> on the canvas to place corners.<br />
            <strong>Double-click</strong> or click the first point to close the shape.<br />
            <strong>ESC</strong> to cancel.
          </p>
        </div>
      )}
    </div>
  );
}
