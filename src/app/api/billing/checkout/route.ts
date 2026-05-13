import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// POST /api/billing/checkout
// Body: { tierId: string }
// Returns: { subscriptionId, keyId } — frontend uses these to open Razorpay checkout
export async function POST(req: NextRequest) {
  // Rate limit: 5 requests per minute per IP
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`checkout:${ip}`, 5, 60_000)) return rateLimitResponse();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tierId } = body as { tierId?: string };
  if (!tierId) return NextResponse.json({ error: "tierId is required" }, { status: 400 });

  const admin = createAdminClient();

  // Read tier from DB — never trust client-supplied plan IDs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tier } = await (admin as any)
    .from("plan_tiers")
    .select("id, name, razorpay_plan_id_yearly, price_yearly, is_active")
    .eq("id", tierId)
    .single();

  if (!tier) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  if (!tier.is_active) return NextResponse.json({ error: "Plan is not available" }, { status: 400 });
  if (!tier.razorpay_plan_id_yearly) return NextResponse.json({ error: "Payment not configured for this plan" }, { status: 400 });
  if (tier.price_yearly === 0) return NextResponse.json({ error: "Cannot checkout a free plan" }, { status: 400 });

  // Get user profile for prefill
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  // Check if user already has an active Razorpay subscription
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingSub } = await (admin as any)
    .from("subscriptions")
    .select("razorpay_subscription_id, plan")
    .eq("user_id", user.id)
    .single();

  if (existingSub?.razorpay_subscription_id) {
    return NextResponse.json({ error: "You already have an active subscription. Cancel it first before switching plans." }, { status: 400 });
  }

  // Create Razorpay subscription
  const subscription = await razorpay.subscriptions.create({
    plan_id:         tier.razorpay_plan_id_yearly,
    total_count:     120, // 120 years max — effectively perpetual
    quantity:        1,
    customer_notify: 1,
    notes: {
      user_id:  user.id,
      tier_id:  tier.id,
      tier_name: tier.name,
    },
  });

  return NextResponse.json({
    data: {
      subscriptionId: subscription.id,
      keyId:          process.env.RAZORPAY_KEY_ID,
      tierName:       tier.name,
      amount:         tier.price_yearly,
      prefill: {
        name:  profile?.full_name ?? "",
        email: profile?.email ?? user.email ?? "",
      },
    },
    status: "ok",
  });
}
