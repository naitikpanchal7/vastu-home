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
  const { tierId, promoCode } = body as { tierId?: string; promoCode?: string };
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

  // Validate promo code if provided
  let promoData: { id: string; razorpay_offer_id: string | null; commission_pct: number } | null = null;
  if (promoCode) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: promo } = await (admin as any)
      .from("promo_codes")
      .select("id, razorpay_offer_id, commission_pct, is_active, valid_until, max_uses, uses_count, applies_to")
      .eq("code", promoCode.toUpperCase().trim())
      .single();

    const now = new Date();
    const isValid =
      promo &&
      promo.is_active &&
      (!promo.valid_until || new Date(promo.valid_until) >= now) &&
      (promo.max_uses === null || promo.uses_count < promo.max_uses) &&
      (!promo.applies_to || promo.applies_to === tierId);

    if (isValid) promoData = promo;
  }

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
  let subscription;
  try {
    const subscriptionParams: Record<string, unknown> = {
      plan_id:         tier.razorpay_plan_id_yearly,
      total_count:     10,
      quantity:        1,
      customer_notify: 1,
      notes: {
        user_id:    user.id,
        tier_id:    tier.id,
        tier_name:  tier.name,
        promo_code: promoData ? promoCode!.toUpperCase().trim() : undefined,
        promo_id:   promoData?.id ?? undefined,
      },
    };

    if (promoData?.razorpay_offer_id) {
      subscriptionParams.offer_id = promoData.razorpay_offer_id;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscription = await razorpay.subscriptions.create(subscriptionParams as any);
  } catch (err: unknown) {
    const rzpErr = err as { error?: { description?: string; code?: string } };
    const msg = rzpErr?.error?.description ?? (err instanceof Error ? err.message : "Razorpay error");
    console.error("[checkout] Razorpay error:", JSON.stringify(rzpErr?.error ?? err));
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Save applied promo code on subscription row for webhook to pick up
  if (promoData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("subscriptions")
      .update({ applied_promo_code: promoCode!.toUpperCase().trim() })
      .eq("user_id", user.id);
  }

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
