"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import RoomCreatorForm from "./RoomCreatorForm";
import RoomLibrary from "./RoomLibrary";
import FurnitureLibrary from "./FurnitureLibrary";
import RightPanel from "@/components/panels/RightPanel";
import { useBuilderStore } from "@/store/builderStore";
import { useCanvasStore } from "@/store/canvasStore";

// Load canvas client-side only (Konva requires browser)
const BuilderCanvas = dynamic(() => import("./BuilderCanvas"), { ssr: false });

export default function BuilderWorkspace() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [exportModal, setExportModal]     = useState(false);
  const clearCanvas                        = useBuilderStore((s) => s.clearCanvas);
  const placedRooms                        = useBuilderStore((s) => s.placedRooms);
  const placedFurniture                    = useBuilderStore((s) => s.placedFurniture);
  const selectedRoomId                     = useBuilderStore((s) => s.selectedRoomId);
  const selectedFurnitureId                = useBuilderStore((s) => s.selectedFurnitureId);
  const removePlacedRoom                   = useBuilderStore((s) => s.removePlacedRoom);
  const removePlacedFurniture              = useBuilderStore((s) => s.removePlacedFurniture);
  const rotatePlacedRoom                   = useBuilderStore((s) => s.rotatePlacedRoom);
  const isDrawingRoom                      = useBuilderStore((s) => s.isDrawingRoom);
  const setDrawingRoom                     = useBuilderStore((s) => s.setDrawingRoom);
  const chakraVisible                      = useCanvasStore((s) => s.chakraVisible);
  const toggleChakra                       = useCanvasStore((s) => s.toggleChakra);

  const handleClear = useCallback(() => {
    if (placedRooms.length === 0 && placedFurniture.length === 0) return;
    if (window.confirm("Clear the entire canvas? This cannot be undone.")) {
      clearCanvas();
      useCanvasStore.getState().resetPerimeter();
    }
  }, [clearCanvas, placedRooms.length, placedFurniture.length]);

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 h-[44px] bg-bg-2 border-b border-[rgba(200,175,120,0.12)] flex items-center px-4 gap-3">
        {/* Title */}
        <div className="flex items-center gap-2 mr-auto">
          <span className="text-[10px] uppercase tracking-[2px] text-vastu-text-3 font-sans">
            Floor Plan Builder
          </span>
          {placedRooms.length > 0 && (
            <span className="text-[8px] px-2 py-[1px] rounded-full bg-amber-900/30 text-amber-400 font-mono">
              {placedRooms.length} room{placedRooms.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Draw mode indicator */}
        {isDrawingRoom && (
          <div className="flex items-center gap-2 px-3 py-[3px] bg-amber-900/20 border border-amber-800/40 rounded-md">
            <span className="text-[9px] text-amber-300 font-sans">✏ Drawing Room</span>
            <button
              onClick={() => setDrawingRoom(false)}
              className="text-[9px] text-amber-400/70 hover:text-amber-300 font-sans"
            >
              ESC
            </button>
          </div>
        )}

        {/* Toolbar actions */}
        {selectedRoomId && !isDrawingRoom && (
          <>
            <button
              onClick={() => rotatePlacedRoom(selectedRoomId)}
              className="text-[10px] text-vastu-text-2 border border-[rgba(200,175,120,0.15)] px-2 py-[4px] rounded hover:border-gold-3 hover:text-vastu-text transition-colors font-sans"
            >
              ↻ Rotate
            </button>
            <button
              onClick={() => removePlacedRoom(selectedRoomId)}
              className="text-[10px] text-red-400 border border-red-900/30 px-2 py-[4px] rounded hover:border-red-700/50 transition-colors font-sans"
            >
              ✕ Remove
            </button>
          </>
        )}
        {selectedFurnitureId && !isDrawingRoom && (
          <button
            onClick={() => removePlacedFurniture(selectedFurnitureId)}
            className="text-[10px] text-red-400 border border-red-900/30 px-2 py-[4px] rounded hover:border-red-700/50 transition-colors font-sans"
          >
            ✕ Remove Item
          </button>
        )}

        <button
          onClick={toggleChakra}
          className={`text-[10px] border px-2 py-[4px] rounded transition-colors font-sans ${
            chakraVisible
              ? "border-gold-3/40 text-gold-2 bg-[rgba(200,175,120,0.08)]"
              : "border-[rgba(200,175,120,0.15)] text-vastu-text-3 hover:border-gold-3 hover:text-vastu-text"
          }`}
        >
          ◎ Chakra
        </button>

        <button
          onClick={handleClear}
          className="text-[10px] text-vastu-text-3 border border-[rgba(200,175,120,0.12)] px-2 py-[4px] rounded hover:border-red-900/40 hover:text-red-400 transition-colors font-sans"
        >
          Clear
        </button>

        <button
          onClick={() => setExportModal(true)}
          className="text-[10px] bg-gold text-bg font-sans font-medium px-3 py-[4px] rounded hover:bg-gold-2 transition-colors"
        >
          Export
        </button>
      </div>

      {/* ── Body: Left | Canvas | Right ────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div
          className={`flex-shrink-0 bg-bg-2 border-r border-[rgba(200,175,120,0.12)] flex flex-col transition-[width] duration-200 overflow-hidden ${
            leftCollapsed ? "w-[32px]" : "w-[230px]"
          }`}
        >
          {/* Toggle button */}
          <button
            onClick={() => setLeftCollapsed((v) => !v)}
            className="flex-shrink-0 h-[32px] flex items-center justify-center text-[10px] text-vastu-text-3 hover:text-gold-2 transition-colors border-b border-[rgba(200,175,120,0.08)]"
          >
            {leftCollapsed ? "▶" : "◀"}
          </button>

          {/* Scrollable content */}
          {!leftCollapsed && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Room creator */}
              <div>
                <p className="text-[9px] uppercase tracking-[1.5px] text-vastu-text-3 font-sans mb-2">
                  Create Room
                </p>
                <RoomCreatorForm />
              </div>

              {/* Room library */}
              <RoomLibrary />

              {/* Furniture library */}
              <FurnitureLibrary />
            </div>
          )}
        </div>

        {/* Canvas centre */}
        <div className="flex-1 overflow-auto relative bg-[#0f0e0b]">
          <BuilderCanvas />
        </div>

        {/* Right panel — reuse existing analysis/north/chat */}
        <div className="flex-shrink-0 flex">
          <RightPanel onExport={() => setExportModal(true)} />
        </div>
      </div>

      {/* Export modal (UI only in Phase 1) */}
      {exportModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
          onClick={() => setExportModal(false)}
        >
          <div
            className="bg-bg-2 border border-[rgba(200,175,120,0.2)] rounded-[12px] p-6 w-[340px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-[20px] text-gold-2 mb-1">Export Floor Plan</h2>
            <p className="text-[11px] text-vastu-text-2 font-sans mb-4">
              PDF export will be available in Phase 2. For now you can take a screenshot of the canvas.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setExportModal(false)}
                className="flex-1 py-[8px] bg-transparent border border-[rgba(200,175,120,0.15)] text-vastu-text-2 font-sans text-[11px] rounded-md hover:border-gold-3 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
