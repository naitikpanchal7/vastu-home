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

// GET /api/admin/users — list all users with subscription + project count
export async function GET(req: NextRequest) {
  const adminUser = await assertAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const plan   = searchParams.get("plan") ?? "";

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from("profiles")
    .select(`
      id, full_name, email, firm_name, city, is_admin, suspended_at, created_at,
      subscriptions (plan, projects_used, projects_limit, reports_used, reports_limit, renews_at, razorpay_subscription_id)
    `)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // Filter by plan: get matching user IDs from subscriptions first, then restrict the main query
  if (plan) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subsOnPlan } = await (admin as any).from("subscriptions").select("user_id").eq("plan", plan);
    const userIds = (subsOnPlan ?? []).map((s: { user_id: string }) => s.user_id);
    if (userIds.length === 0) return NextResponse.json({ data: [], status: "ok" });
    query = query.in("id", userIds);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach project counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projectCounts } = await (admin as any)
    .from("projects")
    .select("consultant_id")
    .is("deleted_at", null);

  const countMap: Record<string, number> = {};
  (projectCounts ?? []).forEach((p: { consultant_id: string }) => {
    countMap[p.consultant_id] = (countMap[p.consultant_id] ?? 0) + 1;
  });

  const enriched = (data ?? []).map((u: Record<string, unknown>) => ({
    ...u,
    projectCount: countMap[u.id as string] ?? 0,
  }));

  return NextResponse.json({ data: enriched, status: "ok" });
}
