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

// GET /api/admin/users/[id] — full user detail
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await assertAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const [
    { data: profile },
    { data: subscription },
    { data: projects },
    { data: activity },
    { data: aiUsage },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("profiles").select("*").eq("id", id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("subscriptions").select("*").eq("user_id", id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("projects").select("id, name, status, created_at, updated_at").eq("consultant_id", id).is("deleted_at", null).order("updated_at", { ascending: false }).limit(20),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("activity_logs").select("*").eq("consultant_id", id).order("created_at", { ascending: false }).limit(20),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("ai_usage_logs").select("input_tokens, output_tokens, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(100),
  ]);

  const totalInput  = (aiUsage ?? []).reduce((s: number, r: { input_tokens: number }) => s + (r.input_tokens ?? 0), 0);
  const totalOutput = (aiUsage ?? []).reduce((s: number, r: { output_tokens: number }) => s + (r.output_tokens ?? 0), 0);

  return NextResponse.json({
    data: { profile, subscription, projects, activity, aiUsage: { totalInput, totalOutput, logs: aiUsage } },
    status: "ok",
  });
}

// PATCH /api/admin/users/[id] — update plan, suspend, toggle priority, toggle admin
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await assertAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json() as {
    plan?: string;
    suspended?: boolean;
    prioritySupport?: boolean;
    isAdmin?: boolean;
    bulkTier?: boolean;
    resetUsage?: boolean;
  };

  const admin = createAdminClient();

  // Log the impersonation/admin action
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("activity_logs").insert({
    consultant_id: adminUser.id,
    action:        "admin_action",
    label:         `Admin modified user ${id}: ${JSON.stringify(body)}`,
  });

  if (body.plan !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tier } = await (admin as any)
      .from("plan_tiers")
      .select("projects_limit, pdf_exports_limit, white_label_enabled")
      .eq("id", body.plan).single();

    // Recalculate actual used counts from DB so counters are accurate after plan change
    const [{ count: actualProjects }, { count: actualReports }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from("projects").select("id", { count: "exact", head: true }).eq("consultant_id", id).is("deleted_at", null),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from("reports").select("id", { count: "exact", head: true }).eq("consultant_id", id).is("deleted_at", null),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("subscriptions").update({
      plan:           body.plan,
      projects_limit: tier?.projects_limit ?? 5,
      reports_limit:  tier?.pdf_exports_limit ?? 5,
      projects_used:  actualProjects ?? 0,
      reports_used:   actualReports ?? 0,
    }).eq("user_id", id);

    // Sync white_label_enabled → report_show_branding on profile
    if (tier?.white_label_enabled !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("profiles")
        .update({ report_show_branding: !tier.white_label_enabled })
        .eq("id", id);
    }
  }

  if (body.isAdmin !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("profiles").update({ is_admin: body.isAdmin }).eq("id", id);
  }

  if (body.resetUsage === true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("subscriptions").update({ projects_used: 0, reports_used: 0 }).eq("user_id", id);
  }

  return NextResponse.json({ status: "ok" });
}
