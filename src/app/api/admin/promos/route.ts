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

export async function GET() {
  const adminUser = await assertAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any).from("promo_codes").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, status: "ok" });
}

export async function POST(req: NextRequest) {
  const adminUser = await assertAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any).from("promo_codes").insert({
    code:         body.code?.toUpperCase(),
    description:  body.description,
    discount_pct: body.discountPct,
    applies_to:   body.appliesTo ?? null,
    max_uses:     body.maxUses ?? null,
    valid_until:  body.validUntil ?? null,
    is_active:    true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, status: "ok" }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const adminUser = await assertAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { id: string; is_active?: boolean };
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("promo_codes").update({ is_active: body.is_active }).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok" });
}
