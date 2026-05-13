import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// POST /api/billing/cancel
// Cancels the user's Razorpay subscription at the end of the current period
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Get user's current subscription
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sub } = await (admin as any)
    .from("subscriptions")
    .select("razorpay_subscription_id, plan")
    .eq("user_id", user.id)
    .single();

  if (!sub?.razorpay_subscription_id) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
  }

  // Cancel at period end (cancel_at_cycle_end = 1) — user keeps access till renews_at
  await razorpay.subscriptions.cancel(sub.razorpay_subscription_id, true);

  // Clear razorpay_subscription_id so no future renewals
  // (webhook will also fire subscription.cancelled but this is immediate UI feedback)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from("subscriptions")
    .update({ razorpay_subscription_id: null })
    .eq("user_id", user.id);

  return NextResponse.json({ status: "ok", message: "Subscription cancelled. Access continues until your billing period ends." });
}
