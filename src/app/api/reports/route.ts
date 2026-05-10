// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Report } from "@/lib/types";
import { validateString, validateEnum, validationFail } from "@/lib/validate";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

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
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`${ip}:reports:create`, 20, 60_000))
    return rateLimitResponse();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Suspension + plan feature + limit checks ────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles").select("suspended_at").eq("id", user.id).single();
  if (profile?.suspended_at)
    return NextResponse.json({ error: "Your account has been suspended. Contact support." }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sub } = await (supabase as any)
    .from("subscriptions")
    .select("plan, reports_used, reports_limit")
    .eq("user_id", user.id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tier } = await (supabase as any)
    .from("plan_tiers").select("pdf_export_enabled")
    .eq("id", sub?.plan ?? "starter").single();
  if (tier?.pdf_export_enabled === false)
    return NextResponse.json(
      { error: "PDF export is not available on your current plan. Upgrade to generate reports.", limitReached: true },
      { status: 402 }
    );

  if (sub && sub.reports_limit !== -1 && sub.reports_used >= sub.reports_limit)
    return NextResponse.json(
      { error: `Report limit reached. Your plan allows ${sub.reports_limit} reports. Upgrade to create more.`, limitReached: true },
      { status: 402 }
    );
  // ────────────────────────────────────────────────────────────────────────────

  const body = await req.json() as Partial<Report>;

  const invalid = validationFail([
    validateString(body.reportName, "reportName", { maxLength: 200 }),
    validateEnum(body.preset, "preset", ["consultant-standard", "quick-summary", "custom"]),
    validateEnum(body.status, "status", ["draft", "generating", "generated", "downloaded"]),
  ]);
  if (invalid) return invalid;

  const insertRow: Record<string, unknown> = {
    project_id:        body.projectId,
    consultant_id:     user.id,
    report_name:       body.reportName ?? "Untitled Report",
    preset:            body.preset ?? "custom",
    floor_selections:  body.floorSelections ?? [],
    status:            body.status ?? "draft",
    pdf_storage_path:  (body as Record<string, unknown>).pdfStoragePath ?? null,
  };
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

  // ── Increment reports_used counter ───────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("subscriptions")
    .update({ reports_used: (sub?.reports_used ?? 0) + 1 })
    .eq("user_id", user.id);
  // ────────────────────────────────────────────────────────────────────────────

  return NextResponse.json({ data, status: "ok" }, { status: 201 });
}
