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
  suspended_at: string | null;
  suspension_reason: string | null;
  is_admin: boolean;
}

interface Subscription {
  plan: "starter" | "professional" | "firm";
  projects_used: number;
  projects_limit: number;
  reports_used: number;
  reports_limit: number;
  renews_at: string | null;
}

interface PlanFeatures {
  ai_chat_enabled: boolean;
  pdf_export_enabled: boolean;
  white_label_enabled: boolean;
  priority_support: boolean;
  ai_messages_limit: number;
  storage_limit_gb: number;
}

const DEFAULT_FEATURES: PlanFeatures = {
  ai_chat_enabled:    true,
  pdf_export_enabled: true,
  white_label_enabled: false,
  priority_support:   false,
  ai_messages_limit:  -1,
  storage_limit_gb:   1,
};

interface UserState {
  user: User | null;
  profile: Profile | null;
  subscription: Subscription | null;
  planFeatures: PlanFeatures;
  loading: boolean;
}

export function useUser(): UserState {
  const [state, setState] = useState<UserState>({
    user: null, profile: null, subscription: null,
    planFeatures: DEFAULT_FEATURES, loading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      let user = null;
      try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
      } catch (err: unknown) {
        if (err instanceof Error && err.message?.includes("lock")) {
          await new Promise((r) => setTimeout(r, 300));
          try { const { data } = await supabase.auth.getUser(); user = data.user; } catch { /* give up */ }
        }
      }
      if (!user) { setState({ user: null, profile: null, subscription: null, planFeatures: DEFAULT_FEATURES, loading: false }); return; }

      const [{ data: profile }, { data: subscriptionRaw }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).single(),
      ]);
      const subscription = subscriptionRaw as Subscription | null;

      // Fetch plan features from plan_tiers (public read table)
      let planFeatures = DEFAULT_FEATURES;
      if (subscription?.plan) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tier } = await (supabase as any)
          .from("plan_tiers")
          .select("ai_chat_enabled, pdf_export_enabled, white_label_enabled, priority_support, ai_messages_limit, storage_limit_gb")
          .eq("id", subscription.plan)
          .single();
        if (tier) planFeatures = tier as PlanFeatures;
      }

      setState({ user, profile: profile ?? null, subscription: subscription ?? null, planFeatures, loading: false });
    }

    load();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => authSub.unsubscribe();
  }, []);

  return state;
}
