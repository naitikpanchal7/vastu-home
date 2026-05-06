// src/app/api/profiles/logo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_BYTES = 1 * 1024 * 1024; // 1 MB

// POST /api/profiles/logo — upload company logo to the logos bucket
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "Logo must be under 1 MB." }, { status: 413 });

  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Only PNG, JPG, WebP, and SVG are allowed." }, { status: 415 });

  const ext = file.name.split(".").pop() ?? "png";
  const storagePath = `${user.id}/logo.${ext}`;

  // Delete any existing logo files first — the user might switch from logo.png to
  // logo.jpg, and upsert only overwrites if the path is identical, so we'd end up
  // with both files in storage if we don't clear the folder first.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any).storage.from("logos").list(user.id);
  const existingPaths = ((existing ?? []) as { name: string }[]).map((f) => `${user.id}/${f.name}`);
  if (existingPaths.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).storage.from("logos").remove(existingPaths);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: uploadErr } = await (supabase as any).storage
    .from("logos")
    .upload(storagePath, buffer, { contentType: file.type, upsert: true });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: { publicUrl } } = (supabase as any).storage
    .from("logos")
    .getPublicUrl(storagePath);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (supabase as any)
    .from("profiles")
    .update({ logo_url: publicUrl })
    .eq("id", user.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ data: { url: publicUrl }, status: "ok" });
}

// DELETE /api/profiles/logo — remove company logo
export async function DELETE(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // List all files in this user's logos folder and remove them
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: files } = await (supabase as any).storage
    .from("logos")
    .list(user.id);

  const paths = ((files ?? []) as { name: string }[]).map((f) => `${user.id}/${f.name}`);
  if (paths.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).storage.from("logos").remove(paths);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("profiles")
    .update({ logo_url: null })
    .eq("id", user.id);

  return NextResponse.json({ status: "ok" });
}
