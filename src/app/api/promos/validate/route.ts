import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/promos/validate?code=XXX&tierId=YYY
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code   = searchParams.get("code")?.toUpperCase().trim();
  const tierId = searchParams.get("tierId") ?? null;

  if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: promo, error } = await (admin as any)
    .from("promo_codes")
    .select("id, code, discount_pct, applies_to, max_uses, uses_count, valid_from, valid_until, is_active, razorpay_offer_id, commission_pct")
    .eq("code", code)
    .single();

  if (error || !promo) {
    return NextResponse.json({ valid: false, error: "Invalid promo code" }, { status: 200 });
  }

  if (!promo.is_active) {
    return NextResponse.json({ valid: false, error: "This promo code is no longer active" }, { status: 200 });
  }

  const now = new Date();

  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return NextResponse.json({ valid: false, error: "This promo code is not yet valid" }, { status: 200 });
  }

  if (promo.valid_until && new Date(promo.valid_until) < now) {
    return NextResponse.json({ valid: false, error: "This promo code has expired" }, { status: 200 });
  }

  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
    return NextResponse.json({ valid: false, error: "This promo code has reached its usage limit" }, { status: 200 });
  }

  if (promo.applies_to && tierId && promo.applies_to !== tierId) {
    return NextResponse.json({ valid: false, error: "This promo code is not applicable for the selected plan" }, { status: 200 });
  }

  return NextResponse.json({
    valid:              true,
    promoId:            promo.id,
    discountPct:        promo.discount_pct,
    appliesTo:          promo.applies_to,
    razorpayOfferId:    promo.razorpay_offer_id,
    commissionPct:      promo.commission_pct,
  }, { status: 200 });
}
