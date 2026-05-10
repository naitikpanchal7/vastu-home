"use client";

import { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { calculateZoneAreas } from "@/lib/vastu/geometry";
import { VASTU_ZONES } from "@/lib/vastu/zones";
import { useUser } from "@/hooks/useUser";
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
  const { planFeatures } = useUser();
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

  // Load chat history — DB for real projects, localStorage for local (proj-*) ones
  useEffect(() => {
    const pid = store.projectId;
    if (!pid) return;

    if (pid.startsWith("proj-")) {
      try {
        const raw = localStorage.getItem(`vastu-chat-${pid}`);
        if (raw) {
          const loaded: ChatMessage[] = JSON.parse(raw);
          if (loaded.length) {
            setMessages([
              {
                id: "init",
                role: "assistant",
                content: "Namaste! I'm your Vastu advisor. Draw your floor plan perimeter first, then I can give you accurate zone analysis. What would you like to know?",
                timestamp: new Date().toISOString(),
                cite: "Vishwakarma Prakash",
              },
              ...loaded,
            ]);
          }
        }
      } catch { /* corrupt storage — ignore */ }
      return;
    }

    fetch(`/api/projects/${pid}/chat`)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (!json?.data?.length) return;
        const loaded: ChatMessage[] = json.data.map((row: { id: string; role: string; content: string; cite?: string | null; created_at: string }) => ({
          id: row.id,
          role: row.role as "user" | "assistant",
          content: row.content,
          timestamp: row.created_at,
          cite: row.cite ?? undefined,
        }));
        setMessages([
          {
            id: "init",
            role: "assistant",
            content: "Namaste! I'm your Vastu advisor. Draw your floor plan perimeter first, then I can give you accurate zone analysis. What would you like to know?",
            timestamp: new Date().toISOString(),
            cite: "Vishwakarma Prakash",
          },
          ...loaded,
        ]);
      })
      .catch(() => {});
  }, [store.projectId]);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Compute fresh zone analysis from live canvas state
  const getFreshZoneAnalysis = () => {
    const { perimeterPoints, brahmaX, brahmaY, northDeg, cuts, scale } = store;
    if (perimeterPoints.length < 3) return [];
    return calculateZoneAreas(
      perimeterPoints, brahmaX, brahmaY, northDeg,
      VASTU_ZONES, cuts, scale?.pixelsPerUnit
    );
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
      const zoneAnalysis = getFreshZoneAnalysis();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: text.trim() }],
          northDeg: store.northDeg,
          projectId: store.projectId,
          projectName: store.projectName,
          zoneAnalysis,
          cutsCount: store.cuts.length,
          areaSqFt: undefined,
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

      // Persist both turns — DB for real projects, localStorage for local ones
      const pid = store.projectId;
      if (pid && !pid.startsWith("proj-")) {
        fetch(`/api/projects/${pid}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "user",      content: text.trim(), cite: null },
              { role: "assistant", content: data.content ?? "", cite: data.cite ?? null },
            ],
          }),
        }).catch(() => {});
      } else if (pid) {
        setMessages((prev) => {
          try {
            const toSave = prev.filter((m) => m.id !== "init");
            localStorage.setItem(`vastu-chat-${pid}`, JSON.stringify(toSave));
          } catch { /* quota exceeded — skip */ }
          return prev;
        });
      }
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

  // ── AI chat feature gate ────────────────────────────────────────────────────
  if (planFeatures.ai_chat_enabled === false) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 text-center px-4">
        <span className="text-[24px]">◈</span>
        <div className="text-[12px] text-vastu-text font-medium">AI Chat not available</div>
        <div className="text-[11px] text-vastu-text-3 leading-relaxed">
          Vastu AI is included in the Professional and Firm plans.
        </div>
        <a href="/settings/billing?reason=ai_disabled" className="text-[10px] px-3 py-[5px] bg-gold-2 text-[#faf7f0] rounded-[6px] hover:bg-gold transition-all font-medium">
          Upgrade Plan →
        </a>
      </div>
    );
  }
  // ────────────────────────────────────────────────────────────────────────────

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
