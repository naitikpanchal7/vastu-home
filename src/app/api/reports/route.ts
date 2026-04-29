// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Report } from "@/lib/types";

// GET /api/reports?projectId=xxx — list reports for a project
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("reports")
    .select("*")
    .eq("consultant_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, status: "ok" });
}

// POST /api/reports — create a new report draft
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Partial<Report>;

  const insertRow: Record<string, unknown> = {
    project_id:       body.projectId,
    consultant_id:    user.id,
    report_name:      body.reportName ?? "Untitled Report",
    preset:           body.preset ?? "custom",
    floor_selections: body.floorSelections ?? [],
    status:           body.status ?? "draft",
  };
  // Use client-provided UUID if given (keeps store ID in sync with DB)
  if (body.id && typeof body.id === "string" && !body.id.startsWith("report-")) {
    insertRow.id = body.id;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("reports")
    .insert(insertRow as any)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, status: "ok" }, { status: 201 });
}
