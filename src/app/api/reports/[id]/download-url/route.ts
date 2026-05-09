// GET /api/reports/:id/download-url
// Returns a short-lived signed URL for downloading the report PDF from storage.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership and get the storage path
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: report, error } = await (supabase as any)
    .from("reports")
    .select("pdf_storage_path")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error || !report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (!report.pdf_storage_path) return NextResponse.json({ error: "PDF not stored yet" }, { status: 404 });

  // Use service role to generate signed URL — bypasses RLS, valid for 60 seconds
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: signed, error: signErr } = await (admin as any).storage
    .from("report-exports")
    .createSignedUrl(report.pdf_storage_path, 60);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not generate download URL" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, status: "ok" });
}
