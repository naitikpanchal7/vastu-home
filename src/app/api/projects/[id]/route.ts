// src/app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/projects/:id — load a project with its canvas state
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, status: "error" }, { status: 404 });
  }

  // Update last_opened_at
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("projects").update({ last_opened_at: new Date().toISOString() }).eq("id", id);

  return NextResponse.json({ data, status: "ok" });
}

// PATCH /api/projects/:id — save canvas state and project updates
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("projects")
    .update({
      canvas_state: body.canvasState,
      notes: body.notes,
      status: body.status,
      name: body.name,
    })
    .eq("id", id)
    .eq("consultant_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, status: "error" }, { status: 500 });
  }

  return NextResponse.json({ data, status: "ok" });
}

// DELETE /api/projects/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("consultant_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message, status: "error" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
