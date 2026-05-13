// src/app/api/projects/[id]/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

const MAX_MESSAGE_LENGTH = 10_000;

// GET /api/projects/:id/chat — load chat history for a project
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify project ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project } = await (supabase as any)
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("chat_messages")
    .select("id, role, content, cite, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, status: "ok" });
}

// POST /api/projects/:id/chat — save a message (call after each AI exchange)
// Body: { messages: [{ role, content, cite? }] } — pass both user + assistant together
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit: 20 messages per minute per IP
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`chat:${ip}`, 20, 60_000)) return rateLimitResponse();

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify project ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project } = await (supabase as any)
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const messages: Array<{ role: string; content: string; cite?: string | null }> = body.messages ?? [];

  if (messages.length === 0) return NextResponse.json({ status: "ok" });

  // Message size cap
  for (const m of messages) {
    if (typeof m.content === "string" && m.content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }
  }

  const rows = messages.map((m) => ({
    project_id: id,
    role:       m.role,
    content:    m.content,
    cite:       m.cite ?? null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("chat_messages")
    .insert(rows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, status: "ok" });
}
