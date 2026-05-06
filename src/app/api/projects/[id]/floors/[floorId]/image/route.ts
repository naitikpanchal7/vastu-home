// src/app/api/projects/[id]/floors/[floorId]/image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/projects/:id/floors/:floorId/image — upload floor plan image to Storage
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; floorId: string }> }
) {
  const { id, floorId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Server-side size check — reject before reading into memory
  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 413 });

  // File type whitelist — reject anything that isn't a real image
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json(
      { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
      { status: 415 }
    );

  const ext = file.name.split(".").pop() ?? "png";
  const storagePath = `${user.id}/${id}/${floorId}/floor-plan.${ext}`;
  const folderPrefix = `${user.id}/${id}/${floorId}`;

  // Remove any existing files in this floor's folder before uploading so that
  // switching extensions (e.g. .jpg → .png) doesn't orphan the old file.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any).storage
    .from("floor-plans")
    .list(folderPrefix);
  const existingPaths = ((existing ?? []) as { name: string }[]).map(
    (f) => `${folderPrefix}/${f.name}`
  );
  if (existingPaths.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).storage.from("floor-plans").remove(existingPaths);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: uploadErr } = await (supabase as any).storage
    .from("floor-plans")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  // Update the floor record with the storage path
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("floors")
    .update({ floor_plan_image_path: storagePath })
    .eq("id", floorId);

  // Return a 1-year signed URL for immediate use
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: signed } = await (supabase as any).storage
    .from("floor-plans")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  return NextResponse.json({
    data: { url: signed?.signedUrl ?? null, path: storagePath },
    status: "ok",
  });
}

// DELETE /api/projects/:id/floors/:floorId/image — remove floor plan image from storage + clear DB path
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; floorId: string }> }
) {
  const { id, floorId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify project ownership via RLS-enforced query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project } = await (supabase as any)
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .single();
  if (!project) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: floor } = await (supabase as any)
    .from("floors")
    .select("floor_plan_image_path")
    .eq("id", floorId)
    .single();

  if (floor?.floor_plan_image_path) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).storage
      .from("floor-plans")
      .remove([floor.floor_plan_image_path]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("floors")
      .update({ floor_plan_image_path: null })
      .eq("id", floorId);
  }

  return NextResponse.json({ status: "ok" });
}
