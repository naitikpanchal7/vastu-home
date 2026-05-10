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

// POST /api/admin/users/[id]/suspend — suspend or reactivate a user
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await assertAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { suspend, reason } = await req.json() as { suspend: boolean; reason?: string };

  // Prevent admin from suspending themselves
  if (id === adminUser.id) {
    return NextResponse.json({ error: "Cannot suspend your own account." }, { status: 400 });
  }

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("profiles").update({
    suspended_at:      suspend ? new Date().toISOString() : null,
    suspension_reason: suspend ? (reason ?? null) : null,
  }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("activity_logs").insert({
    consultant_id: adminUser.id,
    action:        suspend ? "admin_suspend_user" : "admin_reactivate_user",
    label:         `Admin ${suspend ? "suspended" : "reactivated"} user ${id}${reason ? `: ${reason}` : ""}`,
  });

  return NextResponse.json({ status: "ok" });
}
