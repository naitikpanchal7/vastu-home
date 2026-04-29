// src/app/api/profiles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/profiles — get current user's profile
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ data, status: "ok" });
}

// PATCH /api/profiles — update current user's profile
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.fullName           !== undefined) update.full_name            = body.fullName;
  if (body.firmName           !== undefined) update.firm_name            = body.firmName;
  if (body.phone              !== undefined) update.phone                = body.phone;
  if (body.city               !== undefined) update.city                 = body.city;
  if (body.yearsExperience    !== undefined) update.years_experience     = body.yearsExperience;
  if (body.specialization     !== undefined) update.specialization       = body.specialization;
  if (body.logoUrl            !== undefined) update.logo_url             = body.logoUrl;
  if (body.avatarUrl          !== undefined) update.avatar_url           = body.avatarUrl;
  if (body.reportAccentColor  !== undefined) update.report_accent_color  = body.reportAccentColor;
  if (body.reportShowBranding !== undefined) update.report_show_branding = body.reportShowBranding;
  if (body.onboardingCompleted !== undefined) update.onboarding_completed = body.onboardingCompleted;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, status: "ok" });
}
