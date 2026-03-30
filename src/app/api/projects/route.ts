// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";

// GET /api/projects — list all projects for authenticated consultant
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Phase 1: no auth — return empty (projects live in Zustand/localStorage)
  // Phase 2: uncomment auth check
  // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!user) {
    return NextResponse.json({ data: [], status: "ok" });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("projects")
    .select("*")
    .eq("consultant_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message, status: "error" }, { status: 500 });
  }

  return NextResponse.json({ data, status: "ok" });
}

// POST /api/projects — create a new project
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Phase 1: allow without auth (state lives in browser)
    return NextResponse.json({ data: { id: crypto.randomUUID() }, status: "ok" });
  }

  const body = await req.json() as Partial<Project>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("projects")
    .insert({
      consultant_id: user.id,
      name: body.name ?? "Untitled Project",
      client_name: body.clientName ?? "",
      client_contact: body.clientContact,
      client_email: body.clientEmail,
      property_address: body.propertyAddress,
      property_type: body.propertyType ?? "Residential",
      area_sq_ft: body.areaSqFt,
      notes: body.notes,
      status: "active",
    } as any)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, status: "error" }, { status: 500 });
  }

  return NextResponse.json({ data, status: "ok" }, { status: 201 });
}
