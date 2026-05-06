// src/app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { validateString, validateEnum, validateNumber, validationFail } from "@/lib/validate";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

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

  const invalid = validationFail([
    validateString(body.name, "name", { maxLength: 200 }),
    validateString(body.clientName, "clientName", { maxLength: 200 }),
    validateString(body.clientContact, "clientContact", { maxLength: 100 }),
    validateString(body.clientEmail, "clientEmail", { maxLength: 200 }),
    validateString(body.propertyAddress, "propertyAddress", { maxLength: 500 }),
    validateString(body.notes, "notes", { maxLength: 5000 }),
    validateEnum(body.propertyType, "propertyType", ["Residential", "Commercial", "Industrial", "Plot"]),
    validateEnum(body.status, "status", ["draft", "active", "completed", "archived"]),
    validateNumber(body.areaSqFt, "areaSqFt", { min: 0, max: 10_000_000 }),
  ]);
  if (invalid) return invalid;

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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`${ip}:projects:delete`, 20, 60_000))
    return rateLimitResponse();

  const { id } = await params;

  // Verify the user is authenticated first
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Use service role client to bypass RLS for the soft-delete update.
  // Ownership is enforced by the consultant_id check below.
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Collect all floor plan image paths for this project before soft-deleting.
  // Use the user-scoped client (not admin) so RLS ensures we only read floors
  // the authenticated user actually owns — prevents deleting another user's files.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: floors } = await (supabase as any)
    .from("floors")
    .select("floor_plan_image_path")
    .eq("project_id", id)
    .not("floor_plan_image_path", "is", null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("consultant_id", user.id);

  if (error) {
    console.error("[DELETE project] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enqueue floor plan images for deletion after 15 days — matching when the DB
  // rows are hard-deleted, so a project can be fully recovered within that window.
  const deleteAfter = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
  const queueEntries = (floors ?? [])
    .map((f: { floor_plan_image_path: string }) => f.floor_plan_image_path)
    .filter(Boolean)
    .map((path: string) => ({ bucket: "floor-plans", path, delete_after: deleteAfter }));
  if (queueEntries.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("storage_cleanup_queue").insert(queueEntries);
  }

  return NextResponse.json({ status: "ok" });
}
