"use client";

import { useState } from "react";
import AnalysisPanel from "./AnalysisPanel";
import NorthPanel from "./NorthPanel";
import ChatPanel from "./ChatPanel";
import { cn } from "@/lib/utils";

type Tab = "analysis" | "north" | "chatbot";

interface RightPanelProps {
  onExport: () => void;
}

export default function RightPanel({ onExport }: RightPanelProps) {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("analysis");

  return (
    <>
      {/* Toggle button when closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex-shrink-0 w-[28px] bg-bg-2 border-l border-[rgba(100,70,20,0.20)] flex items-center justify-center text-vastu-text-3 hover:text-gold-2 cursor-pointer text-[10px] transition-colors"
        >
          ◁
        </button>
      )}

      {open && (
        <div
          className="w-[290px] bg-bg-2 border-l border-[rgba(100,70,20,0.20)] flex flex-col flex-shrink-0 overflow-hidden z-[5]"
        >
          {/* Tab header */}
          <div className="flex items-center h-9 border-b border-[rgba(100,70,20,0.12)] flex-shrink-0 px-[10px]">
            <div className="flex flex-1">
              {(["analysis", "north", "chatbot"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-[9px] text-center text-[10px] cursor-pointer border-b-2 transition-all duration-[130ms] font-sans whitespace-nowrap bg-transparent border-none",
                    activeTab === tab
                      ? "text-gold-2 border-b-gold border-b-2"
                      : "text-vastu-text-3 border-b-transparent hover:text-vastu-text-2"
                  )}
                  style={{ borderBottom: activeTab === tab ? "2px solid var(--gold)" : "2px solid transparent" }}
                >
                  {tab === "analysis" ? "Analysis" : tab === "north" ? "North" : "Vastu AI"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-[11px] text-vastu-text-3 cursor-pointer px-[3px] py-[3px] rounded-[3px] hover:text-gold-2 ml-1 bg-transparent border-none flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Pane content */}
          <div className={cn("flex-1 overflow-hidden", activeTab === "chatbot" ? "flex flex-col" : "overflow-y-auto")}>
            <div className={cn("p-[11px] h-full", activeTab === "chatbot" && "flex flex-col")}>
              {activeTab === "analysis" && <AnalysisPanel onExport={onExport} />}
              {activeTab === "north"    && <NorthPanel />}
              {activeTab === "chatbot" && <ChatPanel />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
