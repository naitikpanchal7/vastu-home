"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import RoomCreatorForm from "./RoomCreatorForm";
import RoomLibrary from "./RoomLibrary";
import FurnitureLibrary from "./FurnitureLibrary";
import BuilderRightPanel from "./BuilderRightPanel";
import { useBuilderStore } from "@/store/builderStore";
import { useProjectStore } from "@/store/projectStore";

// Load canvas client-side only (Konva requires browser)
const BuilderCanvas = dynamic(() => import("./BuilderCanvas"), { ssr: false });

export default function BuilderWorkspace() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [exportModal, setExportModal]     = useState(false);
  const [editingName, setEditingName]     = useState(false);
  const [nameVal, setNameVal]             = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  const updateProject = useProjectStore((s) => s.updateProject);

  const clearCanvas         = useBuilderStore((s) => s.clearCanvas);
  const placedRooms         = useBuilderStore((s) => s.placedRooms);
  const placedFurniture     = useBuilderStore((s) => s.placedFurniture);
  const selectedRoomId      = useBuilderStore((s) => s.selectedRoomId);
  const selectedFurnitureId = useBuilderStore((s) => s.selectedFurnitureId);
  const removePlacedRoom    = useBuilderStore((s) => s.removePlacedRoom);
  const removePlacedFurniture = useBuilderStore((s) => s.removePlacedFurniture);
  const rotatePlacedRoom    = useBuilderStore((s) => s.rotatePlacedRoom);
  const isDrawingRoom       = useBuilderStore((s) => s.isDrawingRoom);
  const setDrawingRoom      = useBuilderStore((s) => s.setDrawingRoom);
  const isCuttingMode       = useBuilderStore((s) => s.isCuttingMode);
  const setCuttingMode      = useBuilderStore((s) => s.setCuttingMode);
  const isMovingAll         = useBuilderStore((s) => s.isMovingAll);
  const setMovingAll        = useBuilderStore((s) => s.setMovingAll);
  const showChakra          = useBuilderStore((s) => s.showChakra);
  const toggleChakra        = useBuilderStore((s) => s.toggleChakra);
  const projectName         = useBuilderStore((s) => s.projectName);
  const setProjectName      = useBuilderStore((s) => s.setProjectName);
  const clientName          = useBuilderStore((s) => s.clientName);
  const projectId           = useBuilderStore((s) => s.projectId);
  const cuts                = useBuilderStore((s) => s.cuts);
  const removeCut           = useBuilderStore((s) => s.removeCut);

  const startEditingName = useCallback(() => {
    setNameVal(projectName || "Untitled Project");
    setEditingName(true);
    setTimeout(() => nameRef.current?.select(), 0);
  }, [projectName]);

  const commitName = useCallback(() => {
    const trimmed = nameVal.trim() || "Untitled Project";
    setProjectName(trimmed);
    if (projectId) updateProject(projectId, { name: trimmed });
    setEditingName(false);
  }, [nameVal, setProjectName, projectId, updateProject]);

  const handleClear = useCallback(() => {
    if (placedRooms.length === 0 && placedFurniture.length === 0) return;
    if (window.confirm("Clear the entire canvas? This cannot be undone.")) {
      clearCanvas();
    }
  }, [clearCanvas, placedRooms.length, placedFurniture.length]);

  const handleCutMode = () => {
    setCuttingMode(!isCuttingMode);
    setDrawingRoom(false);
    setMovingAll(false);
  };

  const handleMoveAll = () => {
    setMovingAll(!isMovingAll);
  };

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 h-[44px] bg-bg-2 border-b border-[rgba(200,175,120,0.12)] flex items-center px-4 gap-3">
        {/* Project title */}
        <div className="flex items-center gap-2 mr-auto min-w-0">
          <span className="text-[10px] uppercase tracking-[2px] text-vastu-text-3 font-sans flex-shrink-0">
            Builder
          </span>
          <span className="text-vastu-text-3 text-[10px]">·</span>
          {editingName ? (
            <input
              ref={nameRef}
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setEditingName(false); }}
              className="font-serif text-[14px] font-medium text-vastu-text bg-bg-3 border border-gold-3 rounded-[3px] px-1 outline-none max-w-[200px]"
            />
          ) : (
            <div
              onClick={startEditingName}
              title="Click to rename"
              className="font-serif text-[14px] font-medium text-vastu-text whitespace-nowrap truncate max-w-[200px] cursor-text hover:text-gold-2 transition-colors group flex items-center gap-[4px]"
            >
              {projectName || "Untitled Project"}
              <span className="text-[9px] text-vastu-text-3 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
            </div>
          )}
          {clientName && !editingName && (
            <span className="text-[9px] text-vastu-text-3 font-sans truncate hidden sm:block">— {clientName}</span>
          )}
          {placedRooms.length > 0 && (
            <span className="text-[8px] px-2 py-[1px] rounded-full bg-amber-900/30 text-amber-400 font-mono flex-shrink-0">
              {placedRooms.length} room{placedRooms.length !== 1 ? "s" : ""}
            </span>
          )}
          {cuts.length > 0 && (
            <span className="text-[8px] px-2 py-[1px] rounded-full bg-red-900/30 text-red-400 font-mono flex-shrink-0">
              {cuts.length} cut{cuts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Mode indicators */}
        {isDrawingRoom && (
          <div className="flex items-center gap-2 px-3 py-[3px] bg-amber-900/20 border border-amber-800/40 rounded-md">
            <span className="text-[9px] text-amber-300 font-sans">✏ Drawing Room</span>
            <button onClick={() => setDrawingRoom(false)} className="text-[9px] text-amber-400/70 hover:text-amber-300 font-sans">ESC</button>
          </div>
        )}
        {isCuttingMode && (
          <div className="flex items-center gap-2 px-3 py-[3px] bg-red-900/20 border border-red-800/40 rounded-md">
            <span className="text-[9px] text-red-300 font-sans">✕ Cut Mode</span>
            <button onClick={() => setCuttingMode(false)} className="text-[9px] text-red-400/70 hover:text-red-300 font-sans">ESC</button>
          </div>
        )}
        {isMovingAll && (
          <div className="flex items-center gap-2 px-3 py-[3px] bg-blue-900/20 border border-blue-800/40 rounded-md">
            <span className="text-[9px] text-blue-300 font-sans">⤢ Move All</span>
            <button onClick={() => setMovingAll(false)} className="text-[9px] text-blue-400/70 hover:text-blue-300 font-sans">ESC</button>
          </div>
        )}

        {/* Room actions */}
        {selectedRoomId && !isDrawingRoom && !isCuttingMode && (
          <>
            <button onClick={() => rotatePlacedRoom(selectedRoomId)}
              className="text-[10px] text-vastu-text-2 border border-[rgba(200,175,120,0.15)] px-2 py-[4px] rounded hover:border-gold-3 hover:text-vastu-text transition-colors font-sans">
              ↻ Rotate
            </button>
            <button onClick={() => removePlacedRoom(selectedRoomId)}
              className="text-[10px] text-red-400 border border-red-900/30 px-2 py-[4px] rounded hover:border-red-700/50 transition-colors font-sans">
              ✕ Remove
            </button>
          </>
        )}
        {selectedFurnitureId && !isDrawingRoom && !isCuttingMode && (
          <button onClick={() => removePlacedFurniture(selectedFurnitureId)}
            className="text-[10px] text-red-400 border border-red-900/30 px-2 py-[4px] rounded hover:border-red-700/50 transition-colors font-sans">
            ✕ Remove Item
          </button>
        )}

        {/* Chakra toggle */}
        <button
          onClick={toggleChakra}
          className={`text-[10px] border px-2 py-[4px] rounded transition-colors font-sans ${
            showChakra
              ? "border-gold-3/40 text-gold-2 bg-[rgba(200,175,120,0.08)]"
              : "border-[rgba(200,175,120,0.15)] text-vastu-text-3 hover:border-gold-3 hover:text-vastu-text"
          }`}
        >
          ◎ Chakra
        </button>

        {/* Move all */}
        {(placedRooms.length > 0 || placedFurniture.length > 0) && (
          <button
            onClick={handleMoveAll}
            title="Drag to shift the entire layout"
            className={`text-[10px] border px-2 py-[4px] rounded transition-colors font-sans ${
              isMovingAll
                ? "border-blue-700/50 text-blue-300 bg-blue-900/20"
                : "border-[rgba(200,175,120,0.15)] text-vastu-text-3 hover:border-blue-800/40 hover:text-blue-400"
            }`}
          >
            ⤢ Move All
          </button>
        )}

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
        <div className={`flex-shrink-0 bg-bg-2 border-r border-[rgba(200,175,120,0.12)] flex flex-col transition-[width] duration-200 overflow-hidden ${leftCollapsed ? "w-[32px]" : "w-[230px]"}`}>
          <button
            onClick={() => setLeftCollapsed((v) => !v)}
            className="flex-shrink-0 h-[32px] flex items-center justify-center text-[10px] text-vastu-text-3 hover:text-gold-2 transition-colors border-b border-[rgba(200,175,120,0.08)]"
          >
            {leftCollapsed ? "▶" : "◀"}
          </button>

          {!leftCollapsed && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div>
                <p className="text-[9px] uppercase tracking-[1.5px] text-vastu-text-3 font-sans mb-2">Create Room</p>
                <RoomCreatorForm />
              </div>

              {/* Mark Cut section */}
              <div>
                <p className="text-[9px] uppercase tracking-[1.5px] text-vastu-text-3 font-sans mb-2">Mark Cut</p>
                <button
                  onClick={handleCutMode}
                  className={`w-full text-left text-[10px] border px-2 py-[6px] rounded-[5px] transition-colors font-sans flex items-center gap-2 cursor-pointer ${
                    isCuttingMode
                      ? "border-red-700/50 text-red-300 bg-red-900/20"
                      : "border-[rgba(200,175,120,0.15)] text-vastu-text-3 hover:border-red-800/40 hover:text-red-400"
                  }`}
                >
                  <span className="text-[12px]">✂</span>
                  <span>{isCuttingMode ? "Drawing… (dbl-click to close)" : "Draw Cut Area"}</span>
                </button>
                {isCuttingMode && (
                  <p className="mt-[5px] text-[8px] text-red-400/60 font-sans leading-[1.6]">
                    Click to place points · Double-click or click first point to close · ESC to cancel
                  </p>
                )}
              </div>

              <RoomLibrary />
              <FurnitureLibrary />

              {/* Cut list */}
              {cuts.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-[1.5px] text-vastu-text-3 font-sans mb-2">Cuts Marked</p>
                  <div className="space-y-[4px]">
                    {cuts.map((cut) => (
                      <div key={cut.id} className="flex items-center justify-between px-2 py-[4px] bg-bg-3 rounded border border-[rgba(200,175,120,0.08)]">
                        <span className="text-[9px] text-red-400 font-mono">{cut.label}</span>
                        <button onClick={() => removeCut(cut.id)} className="text-[9px] text-vastu-text-3 hover:text-red-400 font-sans cursor-pointer">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Canvas centre */}
        <div className="flex-1 overflow-auto relative bg-[#0f0e0b]">
          <BuilderCanvas />
        </div>

        {/* Right panel — builder-specific, reads from builderStore only */}
        <div className="flex-shrink-0 flex">
          <BuilderRightPanel onExport={() => setExportModal(true)} />
        </div>
      </div>

      {/* Export modal */}
      {exportModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setExportModal(false)}>
          <div className="bg-bg-2 border border-[rgba(200,175,120,0.2)] rounded-[12px] p-6 w-[340px]" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-[20px] text-gold-2 mb-1">Export Floor Plan</h2>
            <p className="text-[11px] text-vastu-text-2 font-sans mb-4">
              PDF export will be available in Phase 2. For now you can take a screenshot of the canvas.
            </p>
            <button
              onClick={() => setExportModal(false)}
              className="w-full py-[8px] bg-transparent border border-[rgba(200,175,120,0.15)] text-vastu-text-2 font-sans text-[11px] rounded-md hover:border-gold-3 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
