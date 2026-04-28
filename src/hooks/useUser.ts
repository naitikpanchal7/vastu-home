"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Profile {
  full_name: string;
  email: string;
  firm_name: string | null;
  logo_url: string | null;
  avatar_url: string | null;
  report_show_branding: boolean;
  onboarding_completed: boolean;
}

interface Subscription {
  plan: "starter" | "professional" | "firm";
  projects_used: number;
  projects_limit: number;
  reports_used: number;
  reports_limit: number;
  renews_at: string | null;
}

interface UserState {
  user: User | null;
  profile: Profile | null;
  subscription: Subscription | null;
  loading: boolean;
}

export function useUser(): UserState {
  const [state, setState] = useState<UserState>({ user: null, profile: null, subscription: null, loading: true });

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setState({ user: null, profile: null, subscription: null, loading: false }); return; }

      const [{ data: profile }, { data: subscription }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).single(),
      ]);

      setState({ user, profile: profile ?? null, subscription: subscription ?? null, loading: false });
    }

    load();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => authSub.unsubscribe();
  }, []);

  return state;
}
