// src/app/page.tsx
// Root route — redirects authenticated users to dashboard, others to login
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // For Phase 1 prototype (no auth yet): redirect straight to dashboard
  // When auth is implemented, check user and redirect accordingly
  if (!user) {
    // TODO: redirect("/auth/login") when auth is implemented
    redirect("/dashboard");
  }

  redirect("/dashboard");
}
