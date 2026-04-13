"use client";

import { useState } from "react";
import { useBuilderStore } from "@/store/builderStore";
import { ROOM_TYPES } from "@/lib/builder/roomTypes";

export default function RoomLibrary() {
  const { roomTemplates, deleteRoomTemplate, addPlacedRoom } = useBuilderStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[9px] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-[9px] hover:bg-[rgba(200,175,120,0.04)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-[1.5px] text-vastu-text-3 font-sans">
            Room Library
          </span>
          <span className="text-[9px] px-[6px] py-[1px] rounded-full bg-amber-900/40 text-amber-400 font-medium">
            {roomTemplates.length}
          </span>
        </div>
        <span className="text-vastu-text-3 text-[10px]">{collapsed ? "▶" : "▼"}</span>
      </button>

      {/* Room list */}
      {!collapsed && (
        <div className="border-t border-[rgba(200,175,120,0.08)] divide-y divide-[rgba(200,175,120,0.06)]">
          {roomTemplates.length === 0 && (
            <p className="px-3 py-4 text-[10px] text-vastu-text-3 font-sans text-center">
              No rooms yet. Use the form above to create rooms.
            </p>
          )}
          {roomTemplates.map((tpl) => {
            const config = ROOM_TYPES[tpl.type];
            return (
              <div key={tpl.id} className="px-3 py-2 hover:bg-[rgba(200,175,120,0.03)] group">
                <div className="flex items-center gap-2">
                  {/* Color swatch */}
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ background: config.borderColor }}
                  />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-vastu-text font-sans truncate leading-tight">
                      {tpl.name}
                    </div>
                    <div className="text-[9px] text-vastu-text-3 font-mono mt-[1px]">
                      {tpl.widthFt}×{tpl.heightFt} ft · {tpl.shape}
                    </div>
                  </div>
                </div>

                {/* Action buttons — visible on hover */}
                <div className="flex gap-1 mt-[6px]">
                  <button
                    onClick={() => addPlacedRoom(tpl.id)}
                    className="flex-1 py-[4px] bg-gold text-bg font-sans font-medium text-[9px] rounded hover:bg-gold-2 transition-colors"
                  >
                    + Add to Canvas
                  </button>
                  <button
                    onClick={() => deleteRoomTemplate(tpl.id)}
                    className="px-2 py-[4px] text-[9px] text-vastu-text-3 border border-[rgba(200,175,120,0.12)] rounded hover:border-red-800/50 hover:text-red-400 transition-colors font-sans"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
