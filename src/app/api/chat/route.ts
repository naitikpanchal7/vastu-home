// src/app/api/chat/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VASTU_ZONES } from "@/lib/vastu/zones";
import type { ChatMessage, ZoneAnalysis } from "@/lib/types";
import { validateEnv } from "@/lib/env";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

const MAX_BODY_BYTES = 50_000; // 50 KB

validateEnv();

const client = new Anthropic();

const VASTU_SYSTEM_PROMPT = `You are a professional Vastu Shastra advisor with deep expertise in classical texts — primarily Vishwakarma Prakash, Mayamatam, and Brihat Samhita. You are integrated into Astraa Vastu, a professional consultant platform.

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!rateLimit(user.id + ":chat", 20, 60_000)) return rateLimitResponse();

    // ── Suspension + AI chat limit check ─────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles").select("suspended_at").eq("id", user.id).single();
    if (profile?.suspended_at)
      return NextResponse.json({ error: "Your account has been suspended. Contact support." }, { status: 403 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sub } = await (supabase as any)
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: tier } = await (supabase as any)
      .from("plan_tiers")
      .select("ai_messages_limit, ai_chat_enabled")
      .eq("id", sub?.plan ?? "starter")
      .single();
    // If tier not found (deleted tier), fall back to starter limits
    if (!tier && sub?.plan !== "starter") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: starterTier } = await (supabase as any)
        .from("plan_tiers").select("ai_messages_limit, ai_chat_enabled").eq("id", "starter").single();
      tier = starterTier;
    }

    if (tier?.ai_chat_enabled === false) {
      return NextResponse.json(
        { error: "AI chat is not available on your current plan. Upgrade to access Vastu AI.", limitReached: true },
        { status: 402 }
      );
    }

    if (tier?.ai_messages_limit !== -1 && tier?.ai_messages_limit != null) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from("ai_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());

      if ((count ?? 0) >= tier.ai_messages_limit) {
        return NextResponse.json(
          { error: `Monthly AI message limit reached (${tier.ai_messages_limit} messages). Resets next month or upgrade your plan.`, limitReached: true },
          { status: 402 }
        );
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES)
      return NextResponse.json({ error: "Message payload too large." }, { status: 413 });
    const body = JSON.parse(rawBody);
    const {
      messages,
      northDeg,
      projectName,
      zoneAnalysis,
      cutsCount,
      areaSqFt,
      projectId,
    }: {
      messages: ChatMessage[];
      northDeg: number;
      projectName: string;
      zoneAnalysis: ZoneAnalysis[];
      cutsCount: number;
      areaSqFt?: number;
      projectId?: string;
    } = body;

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

    const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    if (apiMessages.length === 1) {
      apiMessages[0] = {
        role: "user",
        content: `${contextPrompt}\n\nUser question: ${messages[0].content}`,
      };
    } else {
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

    // ── Log AI token usage ─────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("ai_usage_logs").insert({
      user_id:       user.id,
      project_id:    projectId ?? null,
      input_tokens:  response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      model:         "claude-sonnet-4-20250514",
    });
    // ──────────────────────────────────────────────────────────────────────────

    const hasCite = /vishwakarma|mayamatam|brihat|shastra|classical/i.test(text);

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
