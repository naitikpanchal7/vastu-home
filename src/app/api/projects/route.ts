// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
import { validateEnv } from "@/lib/env";
import { validateString, validateEnum, validationFail } from "@/lib/validate";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

validateEnv();

// GET /api/projects — list all projects for authenticated consultant
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("projects")
    .select("*, floors(id, name, order)")
    .eq("consultant_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, status: "ok" });
}

// POST /api/projects — create a new project + initial Floor 1
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`${ip}:projects:create`, 20, 60_000))
    return rateLimitResponse();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Partial<Project>;

  const invalid = validationFail([
    validateString(body.name, "name", { maxLength: 200 }),
    validateString(body.clientName, "clientName", { maxLength: 200 }),
    validateString(body.clientContact, "clientContact", { maxLength: 100 }),
    validateString(body.clientEmail, "clientEmail", { maxLength: 200 }),
    validateString(body.propertyAddress, "propertyAddress", { maxLength: 500 }),
    validateEnum(body.propertyType, "propertyType", ["Residential", "Commercial", "Industrial", "Plot"]),
  ]);
  if (invalid) return invalid;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projErr } = await (supabase as any)
    .from("projects")
    .insert({
      consultant_id: user.id,
      name:             body.name ?? "Untitled Project",
      client_name:      body.clientName ?? "",
      client_contact:   body.clientContact ?? null,
      client_email:     body.clientEmail ?? null,
      property_address: body.propertyAddress ?? null,
      property_type:    body.propertyType ?? "Residential",
      area_sq_ft:       body.areaSqFt ?? null,
      notes:            body.notes ?? null,
      status:           "draft",
    } as any)
    .select()
    .single();

  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 });

  // Create the initial Floor 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: floor, error: floorErr } = await (supabase as any)
    .from("floors")
    .insert({
      project_id:   project.id,
      name:         "Floor 1",
      order:        0,
      canvas_state: {},
      notes:        "",
      consultant_summary: "",
      consultant_actions: "",
    } as any)
    .select()
    .single();

  if (floorErr) return NextResponse.json({ error: floorErr.message }, { status: 500 });

  return NextResponse.json({ data: { ...project, floors: [floor] }, status: "ok" }, { status: 201 });
}
