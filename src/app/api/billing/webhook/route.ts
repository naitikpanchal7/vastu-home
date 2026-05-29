import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

// POST /api/billing/webhook — Razorpay sends events here
// All 11 subscription + payment events are handled
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  // Verify signature — reject anything not from Razorpay
  const expectedSig = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSig) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event: string; payload: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();
  const eventType = event.event;

  // Helper: get subscription entity from payload
  const subPayload = (event.payload?.subscription as { entity?: Record<string, unknown> })?.entity;
  const paymentPayload = (event.payload?.payment as { entity?: Record<string, unknown> })?.entity;

  try {
    switch (eventType) {

      // ── Subscription activated — first payment succeeded, activate the user ──
      case "subscription.activated": {
        if (!subPayload) break;
        const razorpaySubId = subPayload.id as string;
        const notes = subPayload.notes as Record<string, string> | null;
        const userId = notes?.user_id;
        const tierId = notes?.tier_id;
        if (!userId || !tierId) break;

        // Fetch tier limits
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tier } = await (admin as any)
          .from("plan_tiers")
          .select("projects_limit, pdf_exports_limit, ai_messages_limit")
          .eq("id", tierId)
          .single();

        const renewsAt = subPayload.current_end
          ? new Date((subPayload.current_end as number) * 1000).toISOString()
          : null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from("subscriptions").update({
          plan:                     tierId,
          razorpay_subscription_id: razorpaySubId,
          renews_at:                renewsAt,
          projects_limit:           tier?.projects_limit ?? 5,
          reports_limit:            tier?.pdf_exports_limit ?? 5,
        }).eq("user_id", userId);

        break;
      }

      // ── Subscription charged — renewal payment succeeded, extend renews_at ──
      case "subscription.charged": {
        if (!subPayload) break;
        const razorpaySubId = subPayload.id as string;
        const renewsAt = subPayload.current_end
          ? new Date((subPayload.current_end as number) * 1000).toISOString()
          : null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from("subscriptions")
          .update({ renews_at: renewsAt })
          .eq("razorpay_subscription_id", razorpaySubId);

        break;
      }

      // ── Subscription cancelled — keep access till renews_at, mark cancelled ──
      case "subscription.cancelled": {
        if (!subPayload) break;
        const razorpaySubId = subPayload.id as string;
        // Don't downgrade immediately — let them keep access till period ends
        // renews_at already set correctly; webhook fires when they cancel
        // We just clear the razorpay_subscription_id so no future renewals
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from("subscriptions")
          .update({ razorpay_subscription_id: null })
          .eq("razorpay_subscription_id", razorpaySubId);

        break;
      }

      // ── Subscription halted — repeated payment failures, downgrade immediately ──
      case "subscription.halted": {
        if (!subPayload) break;
        const razorpaySubId = subPayload.id as string;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: subRow } = await (admin as any)
          .from("subscriptions").select("user_id")
          .eq("razorpay_subscription_id", razorpaySubId).single();

        if (!subRow) break;

        // Fetch free tier limits
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: freeTier } = await (admin as any)
          .from("plan_tiers").select("id, projects_limit, pdf_exports_limit")
          .eq("is_base_tier", true).single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from("subscriptions").update({
          plan:                     freeTier?.id ?? "starter",
          razorpay_subscription_id: null,
          renews_at:                null,
          projects_limit:           freeTier?.projects_limit ?? 1,
          reports_limit:            freeTier?.pdf_exports_limit ?? 0,
        }).eq("razorpay_subscription_id", razorpaySubId);

        break;
      }

      // ── Subscription completed — natural end, downgrade to free ──
      case "subscription.completed": {
        if (!subPayload) break;
        const razorpaySubId = subPayload.id as string;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: freeTier } = await (admin as any)
          .from("plan_tiers").select("id, projects_limit, pdf_exports_limit")
          .eq("is_base_tier", true).single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from("subscriptions").update({
          plan:                     freeTier?.id ?? "starter",
          razorpay_subscription_id: null,
          renews_at:                null,
          projects_limit:           freeTier?.projects_limit ?? 1,
          reports_limit:            freeTier?.pdf_exports_limit ?? 0,
        }).eq("razorpay_subscription_id", razorpaySubId);

        break;
      }

      // ── Subscription updated — plan changed ──
      case "subscription.updated": {
        if (!subPayload) break;
        const razorpaySubId = subPayload.id as string;
        const notes = subPayload.notes as Record<string, string> | null;
        const tierId = notes?.tier_id;
        if (!tierId) break;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tier } = await (admin as any)
          .from("plan_tiers").select("projects_limit, pdf_exports_limit")
          .eq("id", tierId).single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from("subscriptions").update({
          plan:           tierId,
          projects_limit: tier?.projects_limit ?? 5,
          reports_limit:  tier?.pdf_exports_limit ?? 5,
        }).eq("razorpay_subscription_id", razorpaySubId);

        break;
      }

      // ── Payment captured — log the transaction + track referral commission ──
      case "payment.captured": {
        if (!paymentPayload) break;
        const notes = paymentPayload.notes as Record<string, string> | null;
        const userId = notes?.user_id;
        const tierId = notes?.tier_id;
        if (!userId || !tierId) break;

        const amountPaise = paymentPayload.amount as number;
        const razorpayPaymentId = paymentPayload.id as string;

        // Resolve promo code from notes (set at checkout time)
        const promoCode = notes?.promo_code ?? null;
        const promoId   = notes?.promo_id   ?? null;
        let resolvedPromoId: string | null = promoId ?? null;

        // Log the transaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from("payment_transactions").insert({
          user_id:             userId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_order_id:   (paymentPayload.order_id as string) ?? null,
          amount_paise:        amountPaise,
          currency:            (paymentPayload.currency as string) ?? "INR",
          status:              "captured",
          plan:                tierId,
          promo_code_id:       resolvedPromoId,
        });

        // Track referral conversion — wrapped in try/catch so any failure here
        // never breaks subscription activation or payment logging above
        if (promoCode) {
          try {
            // Fetch promo details if we don't have the ID
            if (!resolvedPromoId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: promoRow } = await (admin as any)
                .from("promo_codes")
                .select("id, commission_pct")
                .eq("code", promoCode)
                .single();
              if (promoRow) {
                resolvedPromoId = promoRow.id;
              }
            }

            if (resolvedPromoId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: promoRow } = await (admin as any)
                .from("promo_codes")
                .select("commission_pct")
                .eq("id", resolvedPromoId)
                .single();

              if (promoRow) {
                const commissionPaise = Math.floor(amountPaise * (promoRow.commission_pct / 100));

                // Insert referral conversion record
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (admin as any).from("referral_conversions").insert({
                  promo_code_id:       resolvedPromoId,
                  subscriber_user_id:  userId,
                  razorpay_payment_id: razorpayPaymentId,
                  amount_paise:        amountPaise,
                  commission_paise:    commissionPaise,
                  status:              "pending",
                });

                // Update commission on payment_transactions row
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (admin as any).from("payment_transactions")
                  .update({ commission_paise: commissionPaise, promo_code_id: resolvedPromoId })
                  .eq("razorpay_payment_id", razorpayPaymentId);

                // Increment uses_count on promo code
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (admin as any).rpc("increment_promo_uses", { promo_id: resolvedPromoId });
              }
            }
          } catch (referralErr) {
            console.error("[webhook] referral tracking failed — payment still processed:", referralErr);
            // Insert failed conversion record for admin visibility
            if (resolvedPromoId) {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (admin as any).from("referral_conversions").insert({
                  promo_code_id:       resolvedPromoId,
                  subscriber_user_id:  userId,
                  razorpay_payment_id: razorpayPaymentId,
                  amount_paise:        amountPaise,
                  commission_paise:    0,
                  status:              "failed",
                });
              } catch { /* silent — already logged above */ }
            }
          }
        }

        break;
      }

      // ── Payment failed — log the transaction ──
      case "payment.failed": {
        if (!paymentPayload) break;
        const notes = paymentPayload.notes as Record<string, string> | null;
        const userId = notes?.user_id;
        const tierId = notes?.tier_id;
        if (!userId || !tierId) break;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from("payment_transactions").insert({
          user_id:            userId,
          razorpay_payment_id: paymentPayload.id as string,
          razorpay_order_id:  (paymentPayload.order_id as string) ?? null,
          amount_paise:       (paymentPayload.amount as number) ?? 0,
          currency:           (paymentPayload.currency as string) ?? "INR",
          status:             "failed",
          plan:               tierId,
        });

        break;
      }

      // ── These events need no DB action — just acknowledge ──
      case "payment.authorized":
      case "subscription.authenticated":
      case "subscription.pending":
        break;

      default:
        // Unknown event — log and ignore
        console.log(`[webhook] unhandled event: ${eventType}`);
    }
  } catch (err) {
    console.error(`[webhook] error handling ${eventType}:`, err);
    // Still return 200 — Razorpay retries on non-200, which can cause duplicate processing
    return NextResponse.json({ status: "error logged" });
  }

  return NextResponse.json({ status: "ok" });
}
