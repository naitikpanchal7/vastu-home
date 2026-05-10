import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any).from("profiles").select("is_admin").eq("id", user.id).single();
  return profile?.is_admin ? user : null;
}

export async function POST(req: NextRequest) {
  const adminUser = await assertAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action } = await req.json() as { action: "purge_projects" | "clear_ai_logs" };
  const admin = createAdminClient();

  if (action === "purge_projects") {
    // Get IDs of soft-deleted projects first so we can cascade-delete related rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: deleted, error: fetchErr } = await (admin as any)
      .from("projects")
      .select("id")
      .not("deleted_at", "is", null);

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

    const count = deleted?.length ?? 0;

    if (count > 0) {
      const ids = deleted.map((p: { id: string }) => p.id);

      // Hard-delete the projects (FK cascade should handle floors/reports if configured)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: delErr } = await (admin as any)
        .from("projects")
        .delete()
        .in("id", ids);

      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("activity_logs").insert({
      consultant_id: adminUser.id,
      action: "admin_purge_projects",
      label: `Admin purged ${count} soft-deleted project(s)`,
    });

    return NextResponse.json({ status: "ok", count });
  }

  if (action === "clear_ai_logs") {
    // Count first so we can report how many were deleted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countErr } = await (admin as any)
      .from("ai_usage_logs")
      .select("*", { count: "exact", head: true });

    if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: delErr } = await (admin as any)
      .from("ai_usage_logs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("activity_logs").insert({
      consultant_id: adminUser.id,
      action: "admin_clear_ai_logs",
      label: `Admin cleared ${count ?? 0} AI usage log entries`,
    });

    return NextResponse.json({ status: "ok", count: count ?? 0 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
