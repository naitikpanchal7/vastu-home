// src/app/api/reports/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Report } from "@/lib/types";

// GET /api/reports/:id
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
    .from("reports")
    .select("*")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ data, status: "ok" });
}

// PATCH /api/reports/:id — update report (floor selections, status, name)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Partial<Report>;

  const update: Record<string, unknown> = {};
  if (body.reportName      !== undefined) update.report_name      = body.reportName;
  if (body.preset          !== undefined) update.preset           = body.preset;
  if (body.floorSelections !== undefined) update.floor_selections = body.floorSelections;
  if (body.status          !== undefined) update.status           = body.status;
  const bodyAny = body as Record<string, unknown>;
  if (bodyAny.pdfStoragePath !== undefined) update.pdf_storage_path = bodyAny.pdfStoragePath;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("reports")
    .update(update)
    .eq("id", id)
    .eq("consultant_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, status: "ok" });
}

// DELETE /api/reports/:id — soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Use service role client to bypass RLS for the soft-delete update.
  // Ownership is enforced by the consultant_id check below.
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Collect the PDF path and all attachment paths before soft-deleting.
  // Attachments are stored inline in floor_selections JSON under each floor's attachments[].storagePath.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: report } = await (admin as any)
    .from("reports")
    .select("pdf_storage_path, floor_selections")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("reports")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("consultant_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enqueue PDF and attachments for deletion after 15 days — matching the DB
  // hard-delete window so a report can be recovered within the grace period.
  const deleteAfter = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
  // Extract attachment storagePaths from floor_selections JSON
  type FloorSel = { attachments?: { storagePath?: string }[] };
  const attachmentPaths: string[] = ((report?.floor_selections ?? []) as FloorSel[])
    .flatMap((f) => (f.attachments ?? []).map((a) => a.storagePath).filter(Boolean) as string[]);

  const queueEntries = [
    ...(report?.pdf_storage_path
      ? [{ bucket: "report-exports", path: report.pdf_storage_path, delete_after: deleteAfter }]
      : []),
    ...attachmentPaths.map((path) => ({ bucket: "report-attachments", path, delete_after: deleteAfter })),
  ];
  if (queueEntries.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("storage_cleanup_queue").insert(queueEntries);
  }

  return NextResponse.json({ status: "ok" });
}
