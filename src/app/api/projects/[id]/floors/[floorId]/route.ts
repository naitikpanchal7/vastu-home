// src/app/api/projects/[id]/floors/[floorId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateString, validateNumber, validationFail } from "@/lib/validate";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

// GET /api/projects/:id/floors/:floorId
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; floorId: string }> }
) {
  const { floorId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("floors")
    .select("*")
    .eq("id", floorId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  if (data?.floor_plan_image_path) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: signed } = await (supabase as any).storage
      .from("floor-plans")
      .createSignedUrl(data.floor_plan_image_path, 60 * 60 * 24 * 365);
    data.floor_plan_image_url = signed?.signedUrl ?? null;
  }

  return NextResponse.json({ data, status: "ok" });
}

// PATCH /api/projects/:id/floors/:floorId — save canvas state + consultant notes
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; floorId: string }> }
) {
  const { floorId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const invalid = validationFail([
    validateString(body.name, "name", { maxLength: 100 }),
    validateString(body.notes, "notes", { maxLength: 5000 }),
    validateString(body.consultantSummary, "consultantSummary", { maxLength: 5000 }),
    validateString(body.consultantActions, "consultantActions", { maxLength: 5000 }),
    validateNumber(body.order, "order", { min: 0, max: 50 }),
    validateNumber(body.zoomLevel, "zoomLevel", { min: 10, max: 500 }),
    validateNumber(body.panX, "panX", { min: -10000, max: 10000 }),
    validateNumber(body.panY, "panY", { min: -10000, max: 10000 }),
  ]);
  if (invalid) return invalid;

  const update: Record<string, unknown> = {};
  if (body.name               !== undefined) update.name               = body.name;
  if (body.order              !== undefined) update.order              = body.order;
  if (body.canvasState        !== undefined) update.canvas_state       = body.canvasState;
  if (body.notes              !== undefined) update.notes              = body.notes;
  if (body.consultantSummary  !== undefined) update.consultant_summary = body.consultantSummary;
  if (body.consultantActions  !== undefined) update.consultant_actions = body.consultantActions;
  if (body.zoomLevel          !== undefined) update.zoom_level         = body.zoomLevel;
  if (body.panX               !== undefined) update.pan_x              = body.panX;
  if (body.panY               !== undefined) update.pan_y              = body.panY;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("floors")
    .update(update)
    .eq("id", floorId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, status: "ok" });
}

// DELETE /api/projects/:id/floors/:floorId
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; floorId: string }> }
) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`${ip}:floors:delete`, 20, 60_000))
    return rateLimitResponse();

  const { id, floorId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the project belongs to this user before deleting the floor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project } = await (supabase as any)
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("floors")
    .delete()
    .eq("id", floorId)
    .eq("project_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok" });
}
