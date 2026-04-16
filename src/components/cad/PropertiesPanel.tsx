'use client';

import { useCadStore } from '@/store/cadStore';
import type { CADWall, CADOpening, CADFurniture } from '@/lib/paper-geometry/types';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[3px]">
      <label className="text-[8px] uppercase tracking-[1px] text-vastu-text-3">{label}</label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full px-2 py-[4px] bg-bg-4 border border-[rgba(200,175,120,0.12)] rounded-[4px] text-vastu-text font-mono text-[11px] outline-none focus:border-gold-3"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-[4px] bg-bg-4 border border-[rgba(200,175,120,0.12)] rounded-[4px] text-vastu-text font-sans text-[11px] outline-none focus:border-gold-3 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Wall properties ───────────────────────────────────────────────────────────

function WallProps({ wall }: { wall: CADWall }) {
  const { updateWall, getWallLength, pixelsPerUnit, unit } = useCadStore();
  const lenPx = getWallLength(wall.id);

  return (
    <div className="flex flex-col gap-[9px]">
      <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1px]">Wall</div>

      <Field label="Length">
        <div className="text-[12px] font-mono text-gold-2">
          {pixelsPerUnit > 0
            ? `${(lenPx / pixelsPerUnit).toFixed(2)} ${unit}`
            : `${Math.round(lenPx)} px`}
        </div>
      </Field>

      <Field label="Thickness (px)">
        <NumberInput
          value={wall.thickness}
          min={1}
          max={50}
          step={1}
          onChange={(v) => updateWall(wall.id, { thickness: v })}
        />
      </Field>

      <Field label="Type">
        <div className="text-[11px] font-mono text-vastu-text-2 capitalize">{wall.type}</div>
      </Field>

      <Field label="Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={wall.color || '#c8af78'}
            onChange={(e) => updateWall(wall.id, { color: e.target.value })}
            className="w-8 h-6 rounded cursor-pointer border border-[rgba(200,175,120,0.2)] bg-transparent"
          />
          <span className="text-[10px] font-mono text-vastu-text-2">{wall.color}</span>
        </div>
      </Field>

      <Field label="Material">
        <SelectInput
          value={wall.material || 'brick'}
          onChange={(v) => updateWall(wall.id, { material: v })}
          options={[
            { value: 'brick', label: 'Brick' },
            { value: 'concrete', label: 'Concrete' },
            { value: 'wood', label: 'Wood' },
            { value: 'glass', label: 'Glass' },
            { value: 'gypsum', label: 'Gypsum Board' },
            { value: 'stone', label: 'Stone' },
            { value: 'other', label: 'Other' },
          ]}
        />
      </Field>

      <Field label="Name">
        <input
          type="text"
          value={wall.name || ''}
          onChange={(e) => updateWall(wall.id, { name: e.target.value })}
          placeholder="e.g. North Wall"
          className="w-full px-2 py-[4px] bg-bg-4 border border-[rgba(200,175,120,0.12)] rounded-[4px] text-vastu-text font-sans text-[11px] outline-none focus:border-gold-3"
        />
      </Field>
    </div>
  );
}

// ── Opening properties ────────────────────────────────────────────────────────

function OpeningProps({ opening }: { opening: CADOpening }) {
  const { updateOpening, pixelsPerUnit, unit } = useCadStore();

  return (
    <div className="flex flex-col gap-[9px]">
      <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1px]">Opening</div>

      <Field label="Type">
        <SelectInput
          value={opening.type}
          onChange={(v) =>
            updateOpening(opening.id, { type: v as CADOpening['type'] })
          }
          options={[
            { value: 'door', label: 'Door' },
            { value: 'main_door', label: 'Main Door (Vastu Entrance)' },
            { value: 'window', label: 'Window' },
            { value: 'sliding_door', label: 'Sliding Door' },
            { value: 'opening', label: 'Opening (no door)' },
          ]}
        />
      </Field>

      <Field label="Width">
        <div className="flex items-center gap-1">
          <NumberInput
            value={Math.round(opening.widthPx)}
            min={10}
            max={500}
            step={5}
            onChange={(v) => updateOpening(opening.id, { widthPx: v })}
          />
          <span className="text-[9px] text-vastu-text-3 flex-shrink-0">
            {pixelsPerUnit > 0
              ? `= ${(opening.widthPx / pixelsPerUnit).toFixed(1)} ${unit}`
              : 'px'}
          </span>
        </div>
      </Field>

      <Field label="Position along wall">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0.05}
            max={0.95}
            step={0.01}
            value={opening.positionAlongWall}
            onChange={(e) =>
              updateOpening(opening.id, {
                positionAlongWall: parseFloat(e.target.value),
              })
            }
            className="flex-1 accent-gold cursor-pointer"
          />
          <span className="text-[9px] font-mono text-vastu-text-2 w-8">
            {Math.round(opening.positionAlongWall * 100)}%
          </span>
        </div>
      </Field>

      {(opening.type === 'door' || opening.type === 'main_door') && (
        <Field label="Swing direction">
          <SelectInput
            value={opening.swingDirection || 'right'}
            onChange={(v) =>
              updateOpening(opening.id, {
                swingDirection: v as 'left' | 'right' | 'both',
              })
            }
            options={[
              { value: 'right', label: 'Right' },
              { value: 'left', label: 'Left' },
              { value: 'both', label: 'Both (double door)' },
            ]}
          />
        </Field>
      )}

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="main-entrance"
          checked={opening.isMainEntrance ?? false}
          onChange={(e) =>
            updateOpening(opening.id, { isMainEntrance: e.target.checked })
          }
          className="accent-gold cursor-pointer"
        />
        <label
          htmlFor="main-entrance"
          className="text-[10px] text-vastu-text-2 cursor-pointer"
        >
          Vastu Main Entrance ⛩
        </label>
      </div>
    </div>
  );
}

// ── Furniture properties ──────────────────────────────────────────────────────

function FurnitureProps({ furniture }: { furniture: CADFurniture }) {
  const { updateFurniture, deleteFurniture, pixelsPerUnit, unit } = useCadStore();

  return (
    <div className="flex flex-col gap-[9px]">
      <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1px]">Furniture</div>

      <Field label="Label">
        <input
          type="text"
          value={furniture.label}
          onChange={(e) => updateFurniture(furniture.id, { label: e.target.value })}
          className="w-full px-2 py-[4px] bg-bg-4 border border-[rgba(200,175,120,0.12)] rounded-[4px] text-vastu-text font-sans text-[11px] outline-none focus:border-gold-3"
        />
      </Field>

      <div className="grid grid-cols-2 gap-[6px]">
        <Field label="Width (px)">
          <NumberInput
            value={furniture.widthPx}
            min={10}
            max={500}
            step={5}
            onChange={(v) => updateFurniture(furniture.id, { widthPx: v })}
          />
        </Field>
        <Field label="Height (px)">
          <NumberInput
            value={furniture.heightPx}
            min={10}
            max={500}
            step={5}
            onChange={(v) => updateFurniture(furniture.id, { heightPx: v })}
          />
        </Field>
      </div>

      {pixelsPerUnit > 0 && (
        <div className="text-[9px] font-mono text-vastu-text-3">
          {(furniture.widthPx / pixelsPerUnit).toFixed(1)} × {(furniture.heightPx / pixelsPerUnit).toFixed(1)} {unit}
        </div>
      )}

      <Field label="Rotation (°)">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={furniture.rotation}
            onChange={(e) =>
              updateFurniture(furniture.id, { rotation: parseInt(e.target.value) })
            }
            className="flex-1 accent-gold cursor-pointer"
          />
          <span className="text-[9px] font-mono text-vastu-text-2 w-8">
            {furniture.rotation}°
          </span>
        </div>
      </Field>

      <Field label="Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={furniture.color || '#8B7355'}
            onChange={(e) => updateFurniture(furniture.id, { color: e.target.value })}
            className="w-8 h-6 rounded cursor-pointer border border-[rgba(200,175,120,0.2)] bg-transparent"
          />
        </div>
      </Field>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="furn-visible"
          checked={furniture.visible}
          onChange={(e) =>
            updateFurniture(furniture.id, { visible: e.target.checked })
          }
          className="accent-gold cursor-pointer"
        />
        <label htmlFor="furn-visible" className="text-[10px] text-vastu-text-2 cursor-pointer">
          Visible
        </label>
      </div>

      <button
        onClick={() => deleteFurniture(furniture.id)}
        className="w-full text-[10px] px-2 py-[5px] bg-transparent border border-[rgba(200,60,40,0.2)] text-red-400 rounded-[4px] hover:border-red-400 cursor-pointer font-sans mt-1"
      >
        ✕ Delete
      </button>
    </div>
  );
}

// ── Settings panel ────────────────────────────────────────────────────────────

function SettingsPanel() {
  const store = useCadStore();

  return (
    <div className="flex flex-col gap-[9px]">
      <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1px]">Canvas Settings</div>

      <Field label="Unit">
        <SelectInput
          value={store.unit}
          onChange={(v) =>
            store.setUnit(v as 'ft' | 'm', store.pixelsPerUnit)
          }
          options={[
            { value: 'ft', label: 'Feet (ft)' },
            { value: 'm', label: 'Meters (m)' },
          ]}
        />
      </Field>

      <Field label={`Scale: 1 ${store.unit} = ? px`}>
        <NumberInput
          value={store.pixelsPerUnit}
          min={1}
          max={200}
          step={1}
          onChange={(v) => store.setUnit(store.unit, v)}
        />
      </Field>

      <Field label="Grid size (px)">
        <div className="flex gap-[3px]">
          {[15, 20, 30, 40].map((size) => (
            <button
              key={size}
              onClick={() => store.setGridSize(size)}
              className={`flex-1 text-[9px] py-[3px] rounded-[3px] border cursor-pointer font-mono transition-all ${
                store.gridSize === size
                  ? 'bg-[rgba(200,175,120,0.15)] border-gold-3 text-gold-2'
                  : 'bg-transparent border-[rgba(200,175,120,0.1)] text-vastu-text-3 hover:text-vastu-text-2'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </Field>

      <div className="flex flex-col gap-[5px]">
        {[
          { key: 'showGrid',       label: '🔲 Show Grid',       set: store.setShowGrid,       val: store.showGrid },
          { key: 'snapEnabled',    label: '🔵 Snap to Points',  set: store.setSnapEnabled,    val: store.snapEnabled },
          { key: 'showDimensions', label: '📏 Show Dimensions', set: store.setShowDimensions, val: store.showDimensions },
        ].map((opt) => (
          <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={opt.val}
              onChange={(e) => opt.set(e.target.checked)}
              className="accent-gold cursor-pointer"
            />
            <span className="text-[10px] text-vastu-text-2">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Main PropertiesPanel ──────────────────────────────────────────────────────

export default function PropertiesPanel() {
  const store = useCadStore();
  const { selection, walls, openings, furniture } = store;

  let content: React.ReactNode = null;

  if (selection.length === 1) {
    const sel = selection[0];
    if (sel.type === 'wall') {
      const wall = walls.find((w) => w.id === sel.id);
      if (wall) content = <WallProps wall={wall} />;
    } else if (sel.type === 'opening') {
      const op = openings.find((o) => o.id === sel.id);
      if (op) content = <OpeningProps opening={op} />;
    } else if (sel.type === 'furniture') {
      const f = furniture.find((fi) => fi.id === sel.id);
      if (f) content = <FurnitureProps furniture={f} />;
    }
  }

  return (
    <div className="w-[186px] bg-bg-2 border-l border-[rgba(200,175,120,0.12)] flex flex-col overflow-y-auto flex-shrink-0">
      {/* Selected element properties */}
      {content ? (
        <div className="p-3 border-b border-[rgba(200,175,120,0.08)]">
          {content}
        </div>
      ) : (
        <div className="px-3 py-4 text-[9px] text-vastu-text-3 border-b border-[rgba(200,175,120,0.08)]">
          Select an element to edit its properties.
        </div>
      )}

      {/* Settings always visible below */}
      <div className="p-3">
        <SettingsPanel />
      </div>
    </div>
  );
}
