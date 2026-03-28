// src/app/api/chat/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { VASTU_ZONES } from "@/lib/vastu/zones";
import type { ChatMessage, ZoneAnalysis } from "@/lib/types";

const client = new Anthropic();

const VASTU_SYSTEM_PROMPT = `You are a professional Vastu Shastra advisor with deep expertise in classical texts — primarily Vishwakarma Prakash, Mayamatam, and Brihat Samhita. You are integrated into vastu@home, a professional consultant platform.

Your role:
- Provide accurate, text-grounded Vastu analysis for the current floor plan
- Always reference specific zone names, deity names, and elements in your answers
- Cite the classical text (e.g., "Per Vishwakarma Prakash, Chapter 7...") when possible
- Prefer non-demolition remedies: metals (copper/iron strips), colors, yantras, element balancing, furniture placement
- Be precise about percentages and zone data — use the actual numbers provided
- Answer in 3-5 sentences for panel view, or longer if the user asks for detailed analysis
- Respond in the same language as the user's question

Classical remedy priority order:
1. Yantras (Shri Yantra for NE cuts, Vastu Yantra for general)
2. Metal strips (copper for SE/fire, iron/brass for SW/earth, aluminum for N/W)
3. Colors (as per zone element: blue/green for N/NE/E, red/orange for SE/S, yellow/brown for SW/SSW)
4. Element balancing (water features in N, earth elements in SW, fire in SE)
5. Furniture repositioning (heavy furniture to SW, light furniture in N/NE)

CRITICAL: Never invent zone percentages or analysis data. Only use what is provided in the context.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      northDeg,
      projectName,
      zoneAnalysis,
      cutsCount,
      areaSqFt,
    }: {
      messages: ChatMessage[];
      northDeg: number;
      projectName: string;
      zoneAnalysis: ZoneAnalysis[];
      cutsCount: number;
      areaSqFt?: number;
    } = body;

    // Build zone context string
    const zoneContext = zoneAnalysis.length > 0
      ? VASTU_ZONES.map((zone) => {
          const analysis = zoneAnalysis.find((z) => z.zoneName === zone.shortName);
          if (!analysis) return null;
          return `${zone.shortName} (${zone.deity}, ${zone.element}): ${analysis.pctOfTotal.toFixed(1)}% — ${analysis.hasCut ? `🔴 CUT (${analysis.cutPctOfZone.toFixed(0)}% of zone — ${analysis.cutSeverity})` : "✅ Clear"} — Governs: ${zone.governs}`;
        }).filter(Boolean).join("\n")
      : "Zone analysis not yet calculated — user has not drawn the perimeter.";

    const contextPrompt = `
Current Floor Plan Context:
- Project: ${projectName}
- True North: ${northDeg.toFixed(1)}°
- Total Area: ${areaSqFt ? `${areaSqFt} sq ft` : "Not calibrated yet"}
- Cuts detected: ${cutsCount}

Zone Analysis (16 zones):
${zoneContext}

Instructions: Use the above data to give specific, accurate analysis. If zone data shows "not yet calculated", tell the user to draw the floor plan perimeter first.`;

    // Convert chat history for Anthropic API (multi-turn)
    const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    // Inject context as first user message if no history yet
    if (apiMessages.length === 1) {
      apiMessages[0] = {
        role: "user",
        content: `${contextPrompt}\n\nUser question: ${messages[0].content}`,
      };
    } else {
      // Prepend context to the latest user message
      const last = apiMessages[apiMessages.length - 1];
      if (last.role === "user") {
        apiMessages[apiMessages.length - 1] = {
          role: "user",
          content: `${contextPrompt}\n\nUser question: ${last.content}`,
        };
      }
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: VASTU_SYSTEM_PROMPT,
      messages: apiMessages,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Extract citation if the response mentions classical texts
    const hasCite =
      /vishwakarma|mayamatam|brihat|shastra|classical/i.test(text);

    return NextResponse.json({
      content: text,
      cite: hasCite ? "— Vishwakarma Prakash / Classical Vastu Shastra" : null,
      status: "ok",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to get AI response", status: "error" },
      { status: 500 }
    );
  }
}
