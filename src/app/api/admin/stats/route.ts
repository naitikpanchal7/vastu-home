import { NextResponse } from "next/server";
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
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: totalProjects },
    { count: totalReports },
    { count: totalMessages },
    { data: revenueRows },
    { data: newUsersRows },
    { data: aiTokenRows },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("profiles").select("*", { count: "exact", head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("projects").select("*", { count: "exact", head: true }).is("deleted_at", null),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("reports").select("*", { count: "exact", head: true }).is("deleted_at", null),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("chat_messages").select("*", { count: "exact", head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("payment_transactions").select("amount_paise, status").eq("status", "captured"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("profiles").select("created_at").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("ai_usage_logs").select("input_tokens, output_tokens"),
  ]);

  const revenueTotal = (revenueRows ?? []).reduce((s: number, r: { amount_paise: number }) => s + (r.amount_paise ?? 0), 0);
  const totalInputTokens  = (aiTokenRows ?? []).reduce((s: number, r: { input_tokens: number }) => s + (r.input_tokens ?? 0), 0);
  const totalOutputTokens = (aiTokenRows ?? []).reduce((s: number, r: { output_tokens: number }) => s + (r.output_tokens ?? 0), 0);
  // Rough cost estimate: $3/M input + $15/M output (Sonnet 4)
  const estimatedCostUsd  = (totalInputTokens / 1_000_000) * 3 + (totalOutputTokens / 1_000_000) * 15;

  return NextResponse.json({
    data: {
      totalUsers:      totalUsers ?? 0,
      totalProjects:   totalProjects ?? 0,
      totalReports:    totalReports ?? 0,
      totalMessages:   totalMessages ?? 0,
      newUsersThisWeek: (newUsersRows ?? []).length,
      revenueInr:      revenueTotal / 100,
      aiTokensInput:   totalInputTokens,
      aiTokensOutput:  totalOutputTokens,
      estimatedCostUsd,
    },
    status: "ok",
  });
}
