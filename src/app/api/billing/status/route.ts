import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/billing/status — returns current user's subscription + tier + AI usage this month
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscription } = await (admin as any)
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  let tier = null;
  if (subscription?.plan) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: t } = await (admin as any)
      .from("plan_tiers")
      .select("*")
      .eq("id", subscription.plan)
      .single();
    tier = t;
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: aiUsedThisMonth } = await (admin as any)
    .from("ai_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth.toISOString());

  return NextResponse.json({
    data: { subscription, tier, aiUsedThisMonth: aiUsedThisMonth ?? 0 },
    status: "ok",
  });
}
