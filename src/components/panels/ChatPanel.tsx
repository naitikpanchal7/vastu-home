"use client";

import { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import type { ChatMessage } from "@/lib/types";

const QUICK_CHIPS = [
  "What does the SW cut mean for this property?",
  "How is the NE zone looking?",
  "Suggest non-demolition remedies for the cuts",
  "What room should go in the NE zone?",
];

let msgIdCounter = 0;

export default function ChatPanel() {
  const store = useCanvasStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      content: "Namaste! I'm your Vastu advisor. Draw your floor plan perimeter first, then I can give you accurate zone analysis. What would you like to know?",
      timestamp: new Date().toISOString(),
      cite: "Vishwakarma Prakash",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const buildContext = () => {
    const zones = store.zoneAnalysis;
    return zones.length > 0
      ? `Current zone analysis: ${zones.map((z) => `${z.zoneName}=${z.pctOfTotal.toFixed(1)}%`).join(", ")}. Cuts: ${store.cuts.length}. North: ${store.northDeg.toFixed(1)}°.`
      : `North: ${store.northDeg.toFixed(1)}°. Floor plan not yet drawn.`;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: `msg-${++msgIdCounter}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: text.trim() }],
          context: buildContext(),
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `msg-${++msgIdCounter}`,
        role: "assistant",
        content: data.content ?? "I couldn't process that. Please try again.",
        timestamp: new Date().toISOString(),
        cite: data.cite,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${++msgIdCounter}`,
          role: "assistant",
          content: "Sorry, I couldn't connect to the Vastu AI. Please check your API key and try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-[6px]">
      {/* Header */}
      <div className="text-[8px] text-vastu-text-3 pb-[6px] border-b border-[rgba(100,70,20,0.12)] flex-shrink-0">
        ✦ Vastu AI · Grounded in Vishwakarma Prakash
      </div>

      {/* Chat history */}
      <div
        ref={historyRef}
        className="flex flex-col gap-[7px] flex-1 overflow-y-auto min-h-0 pb-1"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[92%] px-[10px] py-[7px] rounded-[8px] text-[11px] leading-relaxed ${
              msg.role === "user"
                ? "self-end bg-[rgba(100,70,20,0.16)] border border-[rgba(100,70,20,0.20)] text-vastu-text-2 rounded-br-[2px]"
                : "self-start bg-bg-3 border border-[rgba(100,70,20,0.12)] text-vastu-text-2 rounded-bl-[2px]"
            }`}
          >
            {msg.content}
            {msg.cite && (
              <div className="text-[9px] text-gold-3 mt-1 italic">— {msg.cite}</div>
            )}
          </div>
        ))}

        {loading && (
          <div className="self-start bg-bg-3 border border-[rgba(100,70,20,0.12)] rounded-[8px] rounded-bl-[2px] px-[10px] py-[7px]">
            <div className="inline-flex items-center gap-[3px] p-[2px_3px]">
              {[0, 0.2, 0.4].map((delay, i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-gold-3"
                  style={{ animation: `pulse 1.2s ease-in-out ${delay}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-1 flex-shrink-0">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => sendMessage(chip)}
            className="text-[9px] px-[7px] py-[3px] bg-bg-3 border border-[rgba(100,70,20,0.12)] rounded-full cursor-pointer text-vastu-text-3 hover:border-gold-3 hover:text-gold-2 transition-all duration-[130ms] font-sans"
          >
            {chip.length > 28 ? chip.slice(0, 27) + "…" : chip}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-[5px] flex-shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Ask about this floor plan…"
          className="flex-1 px-[9px] py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text text-[11px] font-sans outline-none focus:border-gold-3 resize-none"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="w-[30px] h-[30px] bg-gold border-none rounded-[5px] cursor-pointer text-[13px] text-[#faf7f0] flex items-center justify-center hover:bg-gold-2 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
