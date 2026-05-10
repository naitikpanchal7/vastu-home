"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SuspendedPage() {
  const router = useRouter();
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("profiles")
        .select("suspended_at, suspension_reason")
        .eq("id", user.id)
        .single();
      if (!data?.suspended_at) { router.push("/dashboard"); return; }
      setReason(data.suspension_reason ?? null);
    });
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="max-w-[480px] text-center">
        <div className="w-[56px] h-[56px] bg-[rgba(180,50,30,0.12)] border border-[rgba(180,50,30,0.25)] rounded-[14px] flex items-center justify-center text-[24px] mx-auto mb-6">
          ⊗
        </div>
        <h1 className="font-serif text-[26px] font-semibold text-vastu-text mb-3">
          Account Suspended
        </h1>
        <p className="text-[13px] text-vastu-text-2 leading-relaxed mb-3">
          Your account has been suspended by an administrator.
        </p>
        {reason && (
          <div className="bg-[rgba(180,50,30,0.06)] border border-[rgba(180,50,30,0.20)] rounded-[8px] px-4 py-3 text-[12px] text-[#b43218] mb-4">
            {reason}
          </div>
        )}
        <p className="text-[11px] text-vastu-text-3 mb-6">
          If you believe this is a mistake, please contact support.
        </p>
        <button
          onClick={handleSignOut}
          className="px-5 py-2 border border-[rgba(100,70,20,0.20)] rounded-[7px] text-[12px] text-vastu-text-2 hover:border-gold-3 hover:text-vastu-text transition-all cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
