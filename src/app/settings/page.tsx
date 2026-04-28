import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  let { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, city, years_experience, specialization, firm_name, report_accent_color, report_show_branding")
    .eq("id", user.id)
    .single();

  // Profile missing (trigger didn't run on signup) — create it now
  if (!profile) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("profiles").upsert({
      id: user.id,
      email: user.email ?? "",
      full_name: user.user_metadata?.full_name ?? "",
    });
    const { data: fresh } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, city, years_experience, specialization, firm_name, report_accent_color, report_show_branding")
      .eq("id", user.id)
      .single();
    profile = fresh;
  }

  if (!profile) redirect("/auth/login");

  return <SettingsClient profile={profile} />;
}
