"use client";

import { useState } from "react";
import { useBuilderStore } from "@/store/builderStore";
import {
  FURNITURE_LIBRARY,
  FURNITURE_CATEGORIES,
  type FurnitureCategory,
} from "@/lib/builder/furniture";

export default function FurnitureLibrary() {
  const addPlacedFurniture = useBuilderStore((s) => s.addPlacedFurniture);
  const [collapsed, setCollapsed]   = useState(true);
  const [activeCategory, setActive] = useState<FurnitureCategory | "all">("all");
  const [tooltip, setTooltip]       = useState<string | null>(null);

  const categories: ("all" | FurnitureCategory)[] = [
    "all",
    ...Object.keys(FURNITURE_CATEGORIES) as FurnitureCategory[],
  ];

  const visible =
    activeCategory === "all"
      ? FURNITURE_LIBRARY
      : FURNITURE_LIBRARY.filter((f) => f.category === activeCategory);

  return (
    <div className="bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[9px] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-[9px] hover:bg-[rgba(200,175,120,0.04)] transition-colors"
      >
        <span className="text-[9px] uppercase tracking-[1.5px] text-vastu-text-3 font-sans">
          Furniture & Elements
        </span>
        <span className="text-vastu-text-3 text-[10px]">{collapsed ? "▶" : "▼"}</span>
      </button>

      {!collapsed && (
        <div className="border-t border-[rgba(200,175,120,0.08)]">
          {/* Category tabs — horizontal scroll */}
          <div className="flex gap-1 px-2 py-[6px] overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`flex-shrink-0 text-[8px] px-[8px] py-[3px] rounded-full font-sans transition-colors ${
                  activeCategory === cat
                    ? "bg-gold-3/40 text-gold-2 border border-gold-3/40"
                    : "text-vastu-text-3 border border-transparent hover:text-vastu-text-2"
                }`}
              >
                {cat === "all"
                  ? "All"
                  : FURNITURE_CATEGORIES[cat as FurnitureCategory]}
              </button>
            ))}
          </div>

          {/* Grid of items */}
          <div className="grid grid-cols-4 gap-1 px-2 pb-2">
            {visible.map((item) => (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => addPlacedFurniture(item)}
                  onMouseEnter={() => setTooltip(item.id)}
                  onMouseLeave={() => setTooltip(null)}
                  className="w-full flex flex-col items-center gap-[2px] py-2 rounded-md border border-[rgba(200,175,120,0.10)] hover:border-gold-3/50 hover:bg-[rgba(200,175,120,0.06)] transition-all"
                >
                  <span className="text-[18px] leading-none">{item.emoji}</span>
                  <span className="text-[7px] text-vastu-text-3 font-sans text-center leading-tight px-1 truncate w-full">
                    {item.name}
                  </span>
                </button>

                {/* Tooltip */}
                {tooltip === item.id && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[180px] bg-bg-2 border border-[rgba(200,175,120,0.2)] rounded-md p-2 z-50 shadow-lg pointer-events-none">
                    <div className="text-[10px] text-gold-2 font-sans font-medium mb-1">
                      {item.emoji} {item.name}
                    </div>
                    <div className="text-[8px] text-vastu-text-2 font-sans leading-relaxed mb-1">
                      {item.vastuNote}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {item.idealZones.map((z) => (
                        <span key={z} className="text-[7px] px-1 py-[1px] bg-emerald-900/30 text-emerald-400 rounded font-mono">
                          ✓ {z}
                        </span>
                      ))}
                      {item.avoidZones.slice(0, 3).map((z) => (
                        <span key={z} className="text-[7px] px-1 py-[1px] bg-red-900/30 text-red-400 rounded font-mono">
                          ✗ {z}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
