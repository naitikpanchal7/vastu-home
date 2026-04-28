"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const T = {
  bg:      "#f7f3ed",
  bg2:     "#f0ebe2",
  bg3:     "#e9e2d6",
  border:  "rgba(100,70,20,0.13)",
  border2: "rgba(100,70,20,0.07)",
  text:    "#1c1710",
  text2:   "#5c4730",
  text3:   "#9a8060",
  gold:    "#9a7820",
  gold2:   "#735a10",
  teal:    "#2a7a72",
  teal2:   "#1e5e58",
  tealBg:  "rgba(42,122,114,0.07)",
  tealBd:  "rgba(42,122,114,0.20)",
  error:   "rgba(180,50,30,0.08)",
  errorBd: "rgba(180,50,30,0.25)",
  errorTx: "#b43218",
};

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const next = searchParams.get("next") ?? "/dashboard";
  const urlError = searchParams.get("error");
  const urlMode  = searchParams.get("mode") === "signup" ? "signup" : "login";

  const [mode, setMode]       = useState<"login" | "signup">(urlMode);
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(urlError ?? null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add("public-page");
    document.body.classList.remove("app-page");
    return () => document.body.classList.remove("public-page");
  }, []);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (err) {
        setError(err.message);
      } else {
        setSuccess("Account created! Check your email to confirm, then log in.");
        setMode("login");
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
      } else {
        router.push(next);
        router.refresh();
      }
    }

    setLoading(false);
  }

  async function handleGoogle() {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (err) setError(err.message);
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
            vastu<span style={{ color: "#c46c0e" }}>@</span>home
          </button>
          <p style={{ fontSize: "12px", color: T.text3, marginTop: "6px" }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "32px", boxShadow: "0 4px 24px rgba(28,23,16,0.06)" }}>

          {/* Mode toggle */}
          <div style={{ display: "flex", background: T.bg3, borderRadius: "9px", padding: "3px", marginBottom: "28px" }}>
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                style={{
                  flex: 1, padding: "7px", borderRadius: "7px", border: "none", cursor: "pointer",
                  fontSize: "12px", fontWeight: 600, transition: "all 0.15s",
                  background: mode === m ? T.bg2 : "transparent",
                  color: mode === m ? T.text : T.text3,
                  boxShadow: mode === m ? "0 1px 4px rgba(28,23,16,0.08)" : "none",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: T.error, border: `1px solid ${T.errorBd}`, borderRadius: "8px", padding: "10px 14px", marginBottom: "18px", fontSize: "12px", color: T.errorTx }}>
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div style={{ background: T.tealBg, border: `1px solid ${T.tealBd}`, borderRadius: "8px", padding: "10px 14px", marginBottom: "18px", fontSize: "12px", color: T.teal }}>
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {mode === "signup" && (
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: T.text2, display: "block", marginBottom: "5px" }}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ramesh Sharma"
                  required
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: T.text2, display: "block", marginBottom: "5px" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: T.text2, display: "block", marginBottom: "5px" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
                required
                minLength={8}
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
              {loading ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
            <div style={{ flex: 1, height: "1px", background: T.border }} />
            <span style={{ fontSize: "10px", color: T.text3, textTransform: "uppercase", letterSpacing: "0.8px" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: T.border }} />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            style={{
              width: "100%", padding: "10px", borderRadius: "9px",
              border: `1px solid ${T.border}`, background: T.bg,
              color: T.text2, fontSize: "12px", fontWeight: 500,
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: "10px", transition: "all 0.15s",
              fontFamily: "var(--font-dm-sans)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = T.tealBd; (e.currentTarget as HTMLElement).style.color = T.teal; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.color = T.text2; }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

        </div>

        {/* Back to home */}
        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "11px", color: T.text3 }}>
          <button
            onClick={() => router.push("/")}
            style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: "11px", textDecoration: "underline" }}
          >
            ← Back to home
          </button>
        </p>

      </div>
    </div>
  );
}

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
};

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
