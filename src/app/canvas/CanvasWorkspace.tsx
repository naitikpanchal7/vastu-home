"use client";

import { useState } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import VastuCanvas from "@/components/canvas/VastuCanvas";
import RightPanel from "@/components/panels/RightPanel";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { CanvasTool } from "@/store/canvasStore";

interface ExportModalState { open: boolean }

export default function CanvasWorkspace() {
  const store = useCanvasStore();
  const [exportModal, setExportModal] = useState<ExportModalState>({ open: false });
  const [leftExpanded, setLeftExpanded] = useState(false);

  const {
    currentTool, northDeg, projectName, clientName,
    chakraVisible, notes, undoStack,
    setTool, setNorth, toggleChakra, setChakraOpacity, chakraOpacity,
    setNotes, undo, perimeterPoints, perimeterComplete, resetPerimeter, cuts,
  } = store;

  const TOOLS: { id: CanvasTool; icon: string; title: string }[] = [
    { id: "select",    icon: "⊹", title: "Select" },
    { id: "perimeter", icon: "⬡", title: "Draw Perimeter (P)" },
    { id: "cut",       icon: "✂", title: "Draw Cut (C)" },
    { id: "scale",     icon: "⊷", title: "Set Scale (S)" },
    { id: "brahma",    icon: "◉", title: "Move Brahmasthan (B)" },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Canvas topbar */}
      <div className="h-[42px] bg-bg-2 border-b border-[rgba(200,175,120,0.15)] flex items-center px-[11px] gap-[7px] flex-shrink-0 overflow-hidden">
        {/* Project info */}
        <div className="min-w-0 flex-shrink-0">
          <div className="font-serif text-[14px] font-medium text-vastu-text whitespace-nowrap truncate max-w-[180px]">
            {projectName || "Untitled Project"}
          </div>
          {clientName && (
            <div className="text-[9px] text-vastu-text-3 whitespace-nowrap">{clientName}</div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-[rgba(200,175,120,0.15)] flex-shrink-0" />

        {/* North input */}
        <span className="text-[10px] text-vastu-text-3 whitespace-nowrap flex-shrink-0">🧭 N:</span>
        <input
          type="number"
          value={northDeg.toFixed(1)}
          min={0} max={360} step={0.5}
          onChange={(e) => setNorth(parseFloat(e.target.value) || 0)}
          className="w-[54px] px-[6px] py-[3px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[4px] text-gold-2 font-mono text-[11px] font-semibold outline-none focus:border-gold-3 flex-shrink-0"
        />

        <div className="w-[1px] h-4 bg-[rgba(200,175,120,0.15)] flex-shrink-0" />

        {/* Tool buttons */}
        <div className="flex gap-[2px]">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              title={t.title}
              onClick={() => setTool(t.id)}
              className={`w-[27px] h-[27px] flex items-center justify-center rounded-[5px] text-[12px] cursor-pointer transition-all duration-[120ms] border font-sans ${
                currentTool === t.id
                  ? "bg-[rgba(200,175,120,0.15)] border-gold text-gold-2"
                  : "bg-bg-3 border-[rgba(200,175,120,0.15)] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2"
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Undo */}
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="text-[10px] px-[5px] py-[2px] rounded-[3px] cursor-pointer text-vastu-text-3 hover:text-gold-2 disabled:opacity-30 disabled:cursor-default bg-transparent border-none transition-colors"
        >
          ↩ Undo
        </button>

        <div className="w-[1px] h-4 bg-[rgba(200,175,120,0.15)] flex-shrink-0" />

        <Button
          variant="ghost"
          className="text-[10px] py-1 px-[9px]"
          onClick={toggleChakra}
        >
          ◎ {chakraVisible ? "Hide" : "Show"} Chakra
        </Button>
        <Button
          variant="primary"
          className="text-[10px] py-1 px-[9px]"
          onClick={() => setExportModal({ open: true })}
        >
          ⎙ Export
        </Button>
      </div>

      {/* Workspace */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left panel */}
        <div
          className={`bg-bg-2 border-r border-[rgba(200,175,120,0.15)] flex flex-col flex-shrink-0 overflow-hidden transition-[width] duration-200 z-[5] ${
            leftExpanded ? "w-[186px]" : "w-[52px]"
          }`}
        >
          {/* Toggle */}
          <div
            onClick={() => setLeftExpanded((v) => !v)}
            className="px-[9px] py-[9px] flex justify-center border-b border-[rgba(200,175,120,0.08)] cursor-pointer text-vastu-text-3 text-[12px] hover:text-gold-2 transition-colors flex-shrink-0"
          >
            ≡
          </div>

          {!leftExpanded ? (
            /* Icon column */
            <div className="flex flex-col gap-[2px] px-[6px] py-[7px] flex-1 overflow-y-auto">
              {[
                { icon: "🏠", label: "Plan" },
                { icon: "◫", label: "Layers" },
                { icon: "📝", label: "Notes" },
              ].map((btn) => (
                <div
                  key={btn.label}
                  onClick={() => setLeftExpanded(true)}
                  className="w-10 h-10 flex flex-col items-center justify-center rounded-[6px] cursor-pointer text-vastu-text-3 text-[14px] hover:bg-[rgba(200,175,120,0.07)] hover:text-gold-2 transition-all border border-transparent hover:border-[rgba(200,175,120,0.08)] flex-shrink-0"
                >
                  {btn.icon}
                  <span className="text-[6px] mt-[2px] font-mono uppercase tracking-[0.5px]">{btn.label}</span>
                </div>
              ))}
            </div>
          ) : (
            /* Expanded sections */
            <div className="flex flex-col flex-1 overflow-y-auto">
              {/* Floor Plan */}
              <LpSection title="Floor Plan" defaultOpen>
                <Button variant="ghost" className="w-full justify-center text-[9px] py-[6px] mb-1" onClick={() => setTool("perimeter")}>
                  ⬡ Draw Perimeter
                </Button>
                {perimeterComplete && (
                  <Button variant="danger" className="w-full justify-center text-[9px] py-[6px]" onClick={resetPerimeter}>
                    ✕ Reset
                  </Button>
                )}
                <div className="px-[2px] pt-[6px] text-[8px] text-vastu-text-3">
                  Scale: <span className="text-vastu-text-2">{store.scale ? `1px = ${(1 / store.scale.pixelsPerUnit).toFixed(2)} ${store.scale.unit}` : "Not set"}</span>
                </div>
              </LpSection>

              {/* Layers */}
              <LpSection title="Layers" defaultOpen>
                <div className="flex flex-col gap-[2px]">
                  {[
                    { label: "Vastu Chakra", color: "rgba(200,175,120,.4)", action: toggleChakra },
                    { label: "Perimeter",    color: "rgba(200,175,120,.6)", action: () => {} },
                    { label: "Cuts",         color: "rgba(200,60,40,.6)",  action: () => {} },
                  ].map((layer) => (
                    <div
                      key={layer.label}
                      onClick={layer.action}
                      className="flex items-center gap-[7px] px-[5px] py-[5px] rounded-[4px] cursor-pointer text-[10px] text-vastu-text-2 hover:bg-[rgba(200,175,120,0.06)]"
                    >
                      <div className="w-[7px] h-[7px] rounded-[2px] flex-shrink-0" style={{ background: layer.color }} />
                      <span>{layer.label}</span>
                      <span className="ml-auto text-[11px] opacity-50">👁</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-[5px] px-[5px] py-[3px_5px_7px]">
                    <span className="text-[8px] text-vastu-text-3 flex-shrink-0">Opacity</span>
                    <input
                      type="range" min={10} max={80}
                      value={Math.round(chakraOpacity * 100)}
                      onChange={(e) => setChakraOpacity(parseInt(e.target.value))}
                      className="flex-1 accent-gold cursor-pointer"
                    />
                    <span className="text-[8px] text-vastu-text-2 font-mono w-6 text-right flex-shrink-0">
                      {Math.round(chakraOpacity * 100)}%
                    </span>
                  </div>
                </div>
              </LpSection>

              {/* Brahmasthan */}
              <LpSection title="Brahmasthan" defaultOpen>
                <div className="text-[9px] text-vastu-text-3 mb-1">Center of floor plan</div>
                <div className="flex gap-[7px] text-[9px] text-vastu-text-2 font-mono mb-[6px]">
                  <span>X: {Math.round(store.brahmaX)}</span>
                  <span>Y: {Math.round(store.brahmaY)}</span>
                </div>
                <Button variant="ghost" className="w-full justify-center text-[9px] py-[5px] mb-1" onClick={() => setTool("brahma")}>
                  ⊹ Drag to Adjust
                </Button>
                <Button variant="ghost" className="w-full justify-center text-[9px] py-[5px]" onClick={store.autoDetectBrahma}>
                  ⟳ Auto-detect
                </Button>
              </LpSection>

              {/* Notes */}
              <LpSection title="Project Notes" defaultOpen>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Client concerns, observations…"
                  className="w-full px-2 py-[6px] bg-bg-4 border border-[rgba(200,175,120,0.08)] rounded-[5px] text-vastu-text-2 font-sans text-[10px] outline-none resize-none leading-relaxed min-h-[70px] focus:border-gold-3"
                />
                <div className="text-[8px] text-vastu-text-3 mt-1">Saved automatically</div>
              </LpSection>
            </div>
          )}
        </div>

        {/* Main canvas */}
        <VastuCanvas />

        {/* Right panel */}
        <RightPanel onExport={() => setExportModal({ open: true })} />
      </div>

      {/* Export Modal */}
      <Modal
        open={exportModal.open}
        onClose={() => setExportModal({ open: false })}
        title="⎙ Export Report"
        subtitle="Select what to include in the PDF report for your client."
        wide
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setExportModal({ open: false })}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => setExportModal({ open: false })}>⎙ Generate PDF</Button>
          </>
        }
      >
        {[
          { section: "Cover Page", items: ["Project name, client name, consultant name, date", "Company logo (upload in Settings)"] },
          { section: "Floor Plan", items: ["Floor plan image (clean, no overlay)", "Floor plan with Vastu Shakti Chakra overlay", "Floor plan with cuts highlighted"] },
          { section: "Analysis",   items: ["Zone area table (all 16 zones)", "Bar Graph: Zone area distribution", "Bar Graph: Cut area by zone"] },
          { section: "Recommendations", items: ["AI-generated zone-by-zone recommendations", "Remedy suggestions (non-demolition)", "Classical text references (Vishwakarma Prakash)"] },
        ].map(({ section, items }) => (
          <div key={section}>
            <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1px] my-[9px] pb-[3px] border-b border-[rgba(200,175,120,0.08)]">
              {section}
            </div>
            <div className="flex flex-col gap-[5px]">
              {items.map((item, i) => (
                <label key={i} className="flex items-center gap-2 px-[7px] py-[5px] rounded-[4px] bg-bg-3 cursor-pointer text-[11px] text-vastu-text-2">
                  <input type="checkbox" defaultChecked={i === 0} className="accent-gold cursor-pointer" />
                  {item}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-[10px] p-[9px] bg-bg-3 border border-[rgba(200,175,120,0.08)] rounded-[6px] text-[9px] text-vastu-text-3">
          PDF generation requires completing the floor plan analysis first. Draw your perimeter and confirm Brahmasthan to unlock full export.
        </div>
      </Modal>
    </div>
  );
}

function LpSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[rgba(200,175,120,0.08)]">
      <div
        className="flex items-center justify-between px-[11px] py-2 text-[9px] uppercase tracking-[1.5px] text-vastu-text-3 cursor-pointer hover:text-vastu-text-2 select-none"
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        <span className="text-[7px] transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </div>
      {open && <div className="px-2 pb-[9px]">{children}</div>}
    </div>
  );
}
