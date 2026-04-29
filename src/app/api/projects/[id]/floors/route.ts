// src/app/api/projects/[id]/floors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/projects/:id/floors — list all floors for a project
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("floors")
    .select("*")
    .eq("project_id", id)
    .order("order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate signed URLs for floor plan images
  for (const floor of data ?? []) {
    if (floor.floor_plan_image_path) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: signed } = await (supabase as any).storage
        .from("floor-plans")
        .createSignedUrl(floor.floor_plan_image_path, 60 * 60 * 24 * 365);
      floor.floor_plan_image_url = signed?.signedUrl ?? null;
    }
  }

  return NextResponse.json({ data, status: "ok" });
}

// POST /api/projects/:id/floors — add a new floor
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("floors")
    .insert({
      project_id:          id,
      name:                body.name ?? "Floor",
      order:               body.order ?? 0,
      canvas_state:        body.canvasState ?? {},
      notes:               body.notes ?? "",
      consultant_summary:  body.consultantSummary ?? "",
      consultant_actions:  body.consultantActions ?? "",
      zoom_level:          body.zoomLevel ?? 100,
      pan_x:               body.panX ?? 0,
      pan_y:               body.panY ?? 0,
    } as any)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, status: "ok" }, { status: 201 });
}
