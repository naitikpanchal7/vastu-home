'use client';

import { useState } from 'react';
import { useCadStore } from '@/store/cadStore';
import { FURNITURE_TEMPLATES } from '@/lib/paper-geometry/types';
import type { CADTool } from '@/lib/paper-geometry/types';

interface ToolGroup {
  label: string;
  tools: { id: CADTool; icon: string; title: string }[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    label: 'Select',
    tools: [
      { id: 'select', icon: '⊹', title: 'Select / Move — drag wall to move entire project, drag node to reshape' },
    ],
  },
  {
    label: 'Walls',
    tools: [
      { id: 'wall_line', icon: '╱', title: 'Line Wall — click chain, double-click to finish' },
      { id: 'wall_arc',  icon: '⌒', title: 'Arc Wall — click start, through, end' },
    ],
  },
  {
    label: 'Furnish',
    tools: [
      { id: 'furniture', icon: '🪑', title: 'Place Furniture — select from library below' },
    ],
  },
];

const FURNITURE_CATEGORIES = [
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'living',  label: 'Living' },
  { id: 'dining',  label: 'Dining' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'bathroom',label: 'Bath' },
  { id: 'office',  label: 'Office' },
] as const;

export default function ToolPanel() {
  const { activeTool, setActiveTool, activeFurnitureTemplateId, setActiveFurnitureTemplate } = useCadStore();
  const [furnCat, setFurnCat] = useState<string>('bedroom');
  const [showFurnLib, setShowFurnLib] = useState(false);

  return (
    <div className="w-[52px] bg-bg-2 border-r border-[rgba(200,175,120,0.15)] flex flex-col overflow-y-auto flex-shrink-0 py-1 gap-[1px]">
      {TOOL_GROUPS.map((group) => (
        <div key={group.label}>
          {/* Group divider */}
          <div className="text-[6px] text-vastu-text-3 text-center px-1 py-[3px] uppercase tracking-[1px] select-none">
            {group.label}
          </div>
          {group.tools.map((t) => (
            <button
              key={t.id}
              title={t.title}
              onClick={() => {
                setActiveTool(t.id);
                if (t.id === 'furniture') setShowFurnLib(true);
              }}
              className={`w-full h-[38px] flex flex-col items-center justify-center gap-[1px] text-[16px] cursor-pointer transition-all duration-[120ms] border-l-2 ${
                activeTool === t.id
                  ? 'bg-[rgba(200,175,120,0.12)] border-l-gold text-gold-2'
                  : 'bg-transparent border-l-transparent text-vastu-text-3 hover:bg-[rgba(200,175,120,0.06)] hover:text-vastu-text-2'
              }`}
            >
              <span>{t.icon}</span>
              <span className="text-[6px] font-mono uppercase tracking-[0.5px]">
                {t.id.replace('wall_', '').replace('_', ' ')}
              </span>
            </button>
          ))}
        </div>
      ))}

      {/* Furniture library (inline panel if active) */}
      {showFurnLib && (
        <FurniturePalette
          activeCat={furnCat}
          onCatChange={setFurnCat}
          activeTemplateId={activeFurnitureTemplateId}
          onSelect={(id) => {
            setActiveFurnitureTemplate(id);
            setActiveTool('furniture');
          }}
          onClose={() => setShowFurnLib(false)}
        />
      )}
    </div>
  );
}

// ── Furniture palette flyout ──────────────────────────────────────────────────

function FurniturePalette({
  activeCat,
  onCatChange,
  activeTemplateId,
  onSelect,
  onClose,
}: {
  activeCat: string;
  onCatChange: (cat: string) => void;
  activeTemplateId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const filtered = FURNITURE_TEMPLATES.filter((t) => t.category === activeCat);

  return (
    <div
      className="fixed left-[52px] top-auto z-50 w-[180px] bg-bg-2 border border-[rgba(200,175,120,0.2)] rounded-r-[8px] shadow-xl flex flex-col"
      style={{ top: '30%' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-[6px] border-b border-[rgba(200,175,120,0.1)]">
        <span className="text-[10px] text-gold-2 font-sans">Furniture</span>
        <button
          onClick={onClose}
          className="text-[10px] text-vastu-text-3 hover:text-vastu-text cursor-pointer bg-transparent border-none"
        >✕</button>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-[2px] px-[6px] py-[5px] border-b border-[rgba(200,175,120,0.08)]">
        {FURNITURE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCatChange(cat.id)}
            className={`text-[8px] px-[5px] py-[2px] rounded-[3px] cursor-pointer border font-mono transition-all ${
              activeCat === cat.id
                ? 'bg-[rgba(200,175,120,0.15)] border-gold-3 text-gold-2'
                : 'bg-transparent border-[rgba(200,175,120,0.1)] text-vastu-text-3 hover:text-vastu-text-2'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="flex flex-col gap-[2px] px-[6px] py-[5px] max-h-[220px] overflow-y-auto">
        {filtered.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => onSelect(tpl.id)}
            className={`flex items-center gap-[7px] px-[6px] py-[5px] rounded-[4px] cursor-pointer border text-left transition-all ${
              activeTemplateId === tpl.id
                ? 'bg-[rgba(200,175,120,0.12)] border-gold-3 text-gold-2'
                : 'bg-transparent border-transparent text-vastu-text-2 hover:bg-[rgba(200,175,120,0.06)] hover:border-[rgba(200,175,120,0.1)]'
            }`}
          >
            <div
              className="w-[16px] h-[12px] rounded-[2px] flex-shrink-0"
              style={{ background: tpl.color }}
            />
            <span className="text-[10px] font-sans leading-tight">{tpl.label}</span>
            <span className="ml-auto text-[8px] text-vastu-text-3 font-mono">
              {tpl.defaultWidthPx}×{tpl.defaultHeightPx}
            </span>
          </button>
        ))}
      </div>

      <div className="px-2 py-[5px] border-t border-[rgba(200,175,120,0.08)] text-[8px] text-vastu-text-3">
        Click on canvas to place
      </div>
    </div>
  );
}
