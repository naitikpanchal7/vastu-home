// src/app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/projects/:id — load project with floors
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
    .from("projects")
    .select("*, floors(*)")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Sort floors by order
  if (data?.floors) data.floors.sort((a: any, b: any) => a.order - b.order);

  // Generate signed URLs for floor plan images
  if (data?.floors) {
    for (const floor of data.floors) {
      if (floor.floor_plan_image_path) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: signed } = await (supabase as any).storage
          .from("floor-plans")
          .createSignedUrl(floor.floor_plan_image_path, 60 * 60 * 24 * 365);
        floor.floor_plan_image_url = signed?.signedUrl ?? null;
      }
    }
  }

  // Update last_opened_at
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("projects").update({ last_opened_at: new Date().toISOString() }).eq("id", id);

  return NextResponse.json({ data, status: "ok" });
}

// PATCH /api/projects/:id — update project metadata
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.name             !== undefined) update.name             = body.name;
  if (body.clientName       !== undefined) update.client_name      = body.clientName;
  if (body.clientContact    !== undefined) update.client_contact   = body.clientContact;
  if (body.clientEmail      !== undefined) update.client_email     = body.clientEmail;
  if (body.propertyAddress  !== undefined) update.property_address = body.propertyAddress;
  if (body.propertyType     !== undefined) update.property_type    = body.propertyType;
  if (body.areaSqFt         !== undefined) update.area_sq_ft       = body.areaSqFt;
  if (body.notes            !== undefined) update.notes            = body.notes;
  if (body.status           !== undefined) update.status           = body.status;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("projects")
    .update(update)
    .eq("id", id)
    .eq("consultant_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, status: "ok" });
}

// DELETE /api/projects/:id — soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("consultant_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok" });
}
