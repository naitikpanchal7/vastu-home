"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const T = {
  bg:      "#f7f3ed",
  bg2:     "#f0ebe2",
  border:  "rgba(100,70,20,0.13)",
  text:    "#1c1710",
  text3:   "#9a8060",
  gold:    "#9a7820",
  gold2:   "#735a10",
  teal:    "#2a7a72",
  tealBg:  "rgba(42,122,114,0.07)",
  tealBd:  "rgba(42,122,114,0.20)",
  error:   "rgba(180,50,30,0.08)",
  errorBd: "rgba(180,50,30,0.25)",
  errorTx: "#b43218",
};

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}

function VerifyEmail() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add("public-page");
    document.body.classList.remove("app-page");
    return () => document.body.classList.remove("public-page");
  }, []);

  useEffect(() => {
    async function verify() {
      const token_hash = searchParams.get("token_hash");
      const type       = searchParams.get("type");

      if (!token_hash || type !== "email") {
        setErrorMsg("Invalid or expired verification link.");
        setStatus("error");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({ token_hash, type: "email" });

      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
      } else {
        setStatus("success");
        setTimeout(() => router.push("/dashboard"), 2000);
      }
    }

    verify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "var(--font-dm-sans)" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <button
            onClick={() => router.push("/")}
            style={{ fontFamily: "var(--font-cormorant)", fontSize: "28px", color: T.gold2, background: "none", border: "none", cursor: "pointer", letterSpacing: "-0.3px" }}
          >
            Astraa Vastu
          </button>
          <p style={{ fontSize: "12px", color: T.text3, marginTop: "6px" }}>Email verification</p>
        </div>

        {/* Card */}
        <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "32px", boxShadow: "0 4px 24px rgba(28,23,16,0.06)", textAlign: "center" }}>

          {status === "verifying" && (
            <div>
              <Spinner />
              <p style={{ fontSize: "13px", color: T.text3, marginTop: "16px" }}>Verifying your email…</p>
            </div>
          )}

          {status === "success" && (
            <div style={{ background: T.tealBg, border: `1px solid ${T.tealBd}`, borderRadius: "8px", padding: "16px", fontSize: "13px", color: T.teal, lineHeight: "1.6" }}>
              <div style={{ fontSize: "22px", marginBottom: "8px" }}>✓</div>
              Email verified! Redirecting you to your dashboard…
            </div>
          )}

          {status === "error" && (
            <div>
              <div style={{ background: T.error, border: `1px solid ${T.errorBd}`, borderRadius: "8px", padding: "16px", fontSize: "13px", color: T.errorTx, lineHeight: "1.6", marginBottom: "20px" }}>
                {errorMsg ?? "Something went wrong. Please try again."}
              </div>
              <button
                onClick={() => router.push("/auth/login")}
                style={{
                  padding: "10px 20px", borderRadius: "9px", border: "none",
                  background: T.gold, color: "#fffaf0", fontSize: "13px", fontWeight: 600,
                  cursor: "pointer", fontFamily: "var(--font-dm-sans)",
                }}
              >
                Back to log in
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{
        width: "28px", height: "28px", borderRadius: "50%",
        border: `3px solid rgba(154,120,32,0.2)`,
        borderTopColor: T.gold,
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
