"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const T = {
  bg:      "#f7f3ed",
  bg2:     "#f0ebe2",
  border:  "rgba(100,70,20,0.13)",
  text:    "#1c1710",
  text2:   "#5c4730",
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "8px",
  border: `1px solid rgba(100,70,20,0.18)`,
  background: "#f7f3ed",
  color: "#1c1710",
  fontSize: "13px",
  fontFamily: "var(--font-dm-sans)",
  outline: "none",
  boxSizing: "border-box",
};

export default function ResetPasswordPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [ready, setReady]         = useState(false);
  const [done, setDone]           = useState(false);

  useEffect(() => {
    document.body.classList.add("public-page");
    document.body.classList.remove("app-page");
    return () => document.body.classList.remove("public-page");
  }, []);

  // Supabase fires PASSWORD_RECOVERY when it detects the recovery token in the URL hash.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  }

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
          <p style={{ fontSize: "12px", color: T.text3, marginTop: "6px" }}>Choose a new password</p>
        </div>

        {/* Card */}
        <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "32px", boxShadow: "0 4px 24px rgba(28,23,16,0.06)" }}>

          {done ? (
            <div style={{ background: T.tealBg, border: `1px solid ${T.tealBd}`, borderRadius: "8px", padding: "14px 16px", fontSize: "13px", color: T.teal, lineHeight: "1.5", textAlign: "center" }}>
              Password updated! Redirecting you to your dashboard…
            </div>
          ) : !ready ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ fontSize: "13px", color: T.text3 }}>Verifying your reset link…</p>
              <p style={{ fontSize: "12px", color: T.text3, marginTop: "12px" }}>
                If nothing happens,{" "}
                <button
                  onClick={() => router.push("/auth/forgot-password")}
                  style={{ background: "none", border: "none", color: T.gold, cursor: "pointer", fontSize: "12px", textDecoration: "underline", padding: 0 }}
                >
                  request a new link
                </button>
                .
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div style={{ background: T.error, border: `1px solid ${T.errorBd}`, borderRadius: "8px", padding: "10px 14px", marginBottom: "18px", fontSize: "12px", color: T.errorTx }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: T.text2, display: "block", marginBottom: "5px" }}>New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: T.text2, display: "block", marginBottom: "5px" }}>Confirm Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Same password again"
                    required
                    style={inputStyle}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: "4px", padding: "11px", borderRadius: "9px", border: "none",
                    background: loading ? T.text3 : T.gold,
                    color: "#fffaf0", fontSize: "13px", fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "background 0.15s",
                    fontFamily: "var(--font-dm-sans)",
                  }}
                >
                  {loading ? "Updating…" : "Update Password"}
                </button>
              </form>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
