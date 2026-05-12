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

// GET /api/admin/tiers — list all tiers with user counts
export async function GET() {
  const adminUser = await assertAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  const [{ data: tiers }, { data: subs }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("plan_tiers").select("*").order("sort_order"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("subscriptions").select("plan"),
  ]);

  const countMap: Record<string, number> = {};
  (subs ?? []).forEach((s: { plan: string }) => {
    countMap[s.plan] = (countMap[s.plan] ?? 0) + 1;
  });

  const enriched = (tiers ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    userCount: countMap[t.id as string] ?? 0,
  }));

  return NextResponse.json({ data: enriched, status: "ok" });
}

// PATCH /api/admin/tiers — update a tier AND sync limits to all existing subscribers on that tier
export async function PATCH(req: NextRequest) {
  const adminUser = await assertAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { id: string; userCount?: number; [key: string]: unknown };
  const { id, userCount: _uc, ...updates } = body;

  const admin = createAdminClient();

  // If setting this tier as base, unset all others first
  if (updates.is_base_tier === true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("plan_tiers").update({ is_base_tier: false }).neq("id", id);
  }

  // Save tier definition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("plan_tiers").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("activity_logs").insert({
    consultant_id: adminUser.id,
    action: "admin_tier_update",
    label: `Admin updated tier ${id}: ${Object.keys(updates).join(", ")}`,
  });

  // ── Sync subscription limits to all users on this tier ──────────────────────
  const subUpdates: Record<string, unknown> = {};
  if (updates.projects_limit !== undefined)  subUpdates.projects_limit = updates.projects_limit;
  if (updates.pdf_exports_limit !== undefined) subUpdates.reports_limit = updates.pdf_exports_limit;

  if (Object.keys(subUpdates).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("subscriptions").update(subUpdates).eq("plan", id);
  }

  // ── Sync white_label_enabled → report_show_branding on profiles ─────────────
  // When admin enables white_label for a tier, users on that tier get white-label
  // (report_show_branding = false means "hide Astraa Vastu branding" = white-label)
  if (updates.white_label_enabled !== undefined) {
    // Get all user_ids on this plan
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subsOnTier } = await (admin as any)
      .from("subscriptions")
      .select("user_id")
      .eq("plan", id);

    if (subsOnTier && subsOnTier.length > 0) {
      const userIds = subsOnTier.map((s: { user_id: string }) => s.user_id);
      // white_label_enabled = true → report_show_branding = false (hide our branding)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from("profiles")
        .update({ report_show_branding: !updates.white_label_enabled })
        .in("id", userIds);
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  return NextResponse.json({ status: "ok" });
}

// PUT /api/admin/tiers — create a new custom tier
export async function PUT(req: NextRequest) {
  const adminUser = await assertAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const admin = createAdminClient();

  // Generate a slug ID from the name
  const id = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("plan_tiers").insert({
    id,
    name:                  body.name,
    description:           body.description ?? "",
    price_monthly:         body.price_monthly ?? 0,
    price_yearly:          body.price_yearly ?? 0,
    projects_limit:        body.projects_limit ?? 5,
    storage_limit_gb:      body.storage_limit_gb ?? 1,
    ai_messages_limit:     body.ai_messages_limit ?? 50,
    pdf_exports_limit:     body.pdf_exports_limit ?? 5,
    ai_chat_enabled:       body.ai_chat_enabled ?? true,
    pdf_export_enabled:    body.pdf_export_enabled ?? true,
    white_label_enabled:   body.white_label_enabled ?? false,
    priority_support:      body.priority_support ?? false,
    is_active:             body.is_active ?? true,
    razorpay_plan_id_monthly: body.razorpay_plan_id_monthly ?? null,
    razorpay_plan_id_yearly:  body.razorpay_plan_id_yearly ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("activity_logs").insert({
    consultant_id: adminUser.id,
    action: "admin_tier_create",
    label: `Admin created new tier: ${body.name} (id: ${id})`,
  });

  return NextResponse.json({ status: "ok", id }, { status: 201 });
}

// DELETE /api/admin/tiers — hard-delete a tier, optionally moving users first
export async function DELETE(req: NextRequest) {
  const adminUser = await assertAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { id: string; moveTo?: string };
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const admin = createAdminClient();

  // If moveTo specified, migrate all subscribers to the target tier first
  if (body.moveTo) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: targetTier } = await (admin as any)
      .from("plan_tiers")
      .select("projects_limit, pdf_exports_limit")
      .eq("id", body.moveTo)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("subscriptions").update({
      plan:           body.moveTo,
      projects_limit: targetTier?.projects_limit ?? 5,
      reports_limit:  targetTier?.pdf_exports_limit ?? 5,
    }).eq("plan", body.id);
  }

  // Hard-delete the tier
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("plan_tiers").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("activity_logs").insert({
    consultant_id: adminUser.id,
    action:        "admin_tier_delete",
    label:         `Admin deleted tier ${body.id}${body.moveTo ? `, moved users to ${body.moveTo}` : ""}`,
  });

  return NextResponse.json({ status: "ok" });
}

// POST /api/admin/tiers — bulk-upgrade all users from one tier to another
export async function POST(req: NextRequest) {
  const adminUser = await assertAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { fromTier: string; toTier: string };
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tier } = await (admin as any)
    .from("plan_tiers")
    .select("projects_limit, pdf_exports_limit, white_label_enabled")
    .eq("id", body.toTier)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("subscriptions").update({
    plan:           body.toTier,
    projects_limit: tier?.projects_limit ?? 5,
    reports_limit:  tier?.pdf_exports_limit ?? 5,
  }).eq("plan", body.fromTier);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync white_label for all moved users
  if (tier?.white_label_enabled !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: movedSubs } = await (admin as any)
      .from("subscriptions").select("user_id").eq("plan", body.toTier);
    if (movedSubs?.length) {
      const ids = movedSubs.map((s: { user_id: string }) => s.user_id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("profiles")
        .update({ report_show_branding: !tier.white_label_enabled })
        .in("id", ids);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("activity_logs").insert({
    consultant_id: adminUser.id,
    action:        "admin_bulk_upgrade",
    label:         `Admin bulk-upgraded all ${body.fromTier} users to ${body.toTier}`,
  });

  return NextResponse.json({ status: "ok" });
}
