"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

// ─── Design tokens (page-local) ──────────────────────────────────────────────
const T = {
  // Backgrounds
  bg:    "#f7f3ed",
  bg2:   "#f0ebe2",
  bg3:   "#e9e2d6",
  bg4:   "#e0d8c8",

  // Text
  text:  "#1c1710",
  text2: "#5c4730",
  text3: "#9a8060",

  // Gold (selective, for primary CTA + logo only)
  gold:  "#9a7820",
  gold2: "#735a10",
  gold3: "#b89040",

  // Teal (secondary actions, badges, links)
  teal:  "#2a7a72",
  teal2: "#1e5e58",
  tealBg:"rgba(42,122,114,0.07)",
  tealBd:"rgba(42,122,114,0.20)",

  // Warm borders
  border: "rgba(100,70,20,0.13)",
  border2:"rgba(100,70,20,0.07)",

  // Domain element colors (chakra only)
  fire:  "#c45a2a",
  water: "#3a6aaa",
  earth: "#8a6a30",
  air:   "#4a9a6a",
  space: "#7a5aaa",
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: "◎", title: "Shakti Chakra", desc: "Authentic 16-zone overlay from True North, computed per Vishwakarma Prakash. Never estimated, always exact." },
  { icon: "⬡", title: "Perimeter & Cuts", desc: "Draw any polygon floor plan. Cuts are flagged per zone with mild / moderate / severe scoring." },
  { icon: "⊙", title: "Brahmasthan", desc: "Geometric centroid via polygon math — not screen center, not a guess." },
  { icon: "☷", title: "Zone Percentages", desc: "Sutherland-Hodgman clipping gives exact sq-ft per zone. Ideal is 6.25% each." },
  { icon: "↑", title: "True North", desc: "NOAA magnetic declination API built in. Manual override always available." },
  { icon: "✦", title: "Vastu AI Advisor", desc: "Multi-turn AI grounded in classical texts — cites Vishwakarma Prakash, Mayamatam, Brihat Samhita." },
];

const BENEFITS = [
  { n: "01", title: "Replace manual overlays", desc: "No more acetate sheets, protractors, and hand-drawn chakras. The full overlay renders in seconds on any floor plan." },
  { n: "02", title: "Defensible exact numbers", desc: "Zone percentages come from polygon clipping math — same answer every run, shareable with clients." },
  { n: "03", title: "Grounded in classical texts", desc: "Every recommendation traces to a source layer in Vishwakarma Prakash, Mayamatam, or Brihat Samhita." },
  { n: "04", title: "Built for practice scale", desc: "Client profiles, project management, and PDF export — so your workflow scales without extra admin." },
];

const ROADMAP: Record<string, string[]> = {
  "Auth & Accounts":   ["Sign In", "Sign Up", "Google OAuth", "Profile Settings"],
  "Storage & Sync":    ["Save to Cloud", "Auto-backup", "Version History", "Import / Export"],
  "Team & Clients":    ["Team Workspace", "Client Profiles", "Shared Reports", "Role Permissions"],
  "Reports & Export":  ["PDF Report", "PDF History", "Share Report Link", "Watermark Branding"],
  "AI & Analysis":     ["AI Assistant", "OCR Upload", "Cut Auto-detect", "AI Remedies"],
  "Advanced Tools":    ["GPS North", "Multi-floor Projects", "Entrance Optimizer", "Scale Calibration"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useFadeIn(threshold = 0.15) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Section({
  id, children, style, className = "",
}: {
  id?: string; children: React.ReactNode; style?: React.CSSProperties; className?: string;
}) {
  const { ref, visible } = useFadeIn();
  return (
    <section
      id={id}
      ref={ref as React.RefObject<HTMLElement>}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition: "opacity 0.55s ease, transform 0.55s ease",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function Pill({ children, teal }: { children: React.ReactNode; teal?: boolean }) {
  return (
    <span
      className="inline-block text-[10px] font-medium uppercase tracking-[1.2px] px-3 py-[5px] rounded-full"
      style={{
        background: teal ? T.tealBg : "rgba(154,120,32,0.08)",
        border: `1px solid ${teal ? T.tealBd : "rgba(154,120,32,0.22)"}`,
        color: teal ? T.teal : T.gold,
      }}
    >
      {children}
    </span>
  );
}

function PrimaryBtn({ children, onClick, large }: { children: React.ReactNode; onClick?: () => void; large?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? T.gold2 : T.gold,
        color: "#fffaf0",
        border: "none",
        borderRadius: "9px",
        padding: large ? "14px 32px" : "9px 22px",
        fontSize: large ? "14px" : "12px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.15s",
        fontFamily: "var(--font-dm-sans)",
        letterSpacing: "0.2px",
      }}
    >
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick, teal }: { children: React.ReactNode; onClick?: () => void; teal?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "transparent",
        color: hov ? (teal ? T.teal2 : T.gold2) : (teal ? T.teal : T.text2),
        border: `1px solid ${hov ? (teal ? T.teal : T.gold3) : T.border}`,
        borderRadius: "9px",
        padding: "9px 22px",
        fontSize: "12px",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: "var(--font-dm-sans)",
      }}
    >
      {children}
    </button>
  );
}

// ─── Coming Soon Modal ────────────────────────────────────────────────────────

function ComingSoonModal({ feature, onClose }: { feature: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(28,23,16,0.45)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.bg, borderRadius: "16px",
          border: `1px solid ${T.border}`,
          padding: "40px 36px", maxWidth: "360px", width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(28,23,16,0.18)",
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>◌</div>
        <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "24px", color: T.text, marginBottom: "8px" }}>
          Coming soon
        </div>
        <div style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: T.text2, lineHeight: 1.6, marginBottom: "24px" }}>
          <strong style={{ color: T.text }}>{feature}</strong> is on the roadmap for Phase 2.
          We&apos;ll send you an update when it&apos;s ready.
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <button
            onClick={onClose}
            style={{
              background: T.tealBg, color: T.teal, border: `1px solid ${T.tealBd}`,
              borderRadius: "8px", padding: "8px 20px", fontSize: "12px", fontWeight: 500,
              cursor: "pointer", fontFamily: "var(--font-dm-sans)",
            }}
          >
            Notify me
          </button>
          <button
            onClick={onClose}
            style={{
              background: "transparent", color: T.text3, border: `1px solid ${T.border}`,
              borderRadius: "8px", padding: "8px 20px", fontSize: "12px",
              cursor: "pointer", fontFamily: "var(--font-dm-sans)",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chakra Preview SVG ───────────────────────────────────────────────────────

function ChakraPreview() {
  const ZONE_COLORS = [
    "#3a6aaa","#7a5aaa","#7a5aaa","#4a9a6a",
    "#4a9a6a","#c45a2a","#c45a2a","#8a6a30",
    "#8a6a30","#c45a2a","#c45a2a","#4a9a6a",
    "#4a9a6a","#7a5aaa","#3a6aaa","#3a6aaa",
  ];
  const LABELS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  const r = 96, cx = 110, cy = 110;

  return (
    <svg viewBox="0 0 220 220" style={{ width: "100%", maxWidth: "260px" }}>
      {/* outer ring */}
      <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke={T.border} strokeWidth="1" />
      {/* zones */}
      {Array.from({ length: 16 }).map((_, i) => {
        const startDeg = i * 22.5 - 90 - 11.25;
        const endDeg   = startDeg + 22.5;
        const s = startDeg * (Math.PI / 180);
        const e = endDeg   * (Math.PI / 180);
        const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
        const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
        const mid = (startDeg + 11.25) * (Math.PI / 180);
        const lx = cx + (r + 16) * Math.cos(mid), ly = cy + (r + 16) * Math.sin(mid);
        return (
          <g key={i}>
            <path
              d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`}
              fill={ZONE_COLORS[i]}
              fillOpacity="0.18"
              stroke="#fff"
              strokeWidth="0.6"
            />
            <text
              x={lx} y={ly}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="5.5" fill={T.text3}
              fontFamily="var(--font-dm-mono)"
            >
              {LABELS[i]}
            </text>
          </g>
        );
      })}
      {/* inner rings */}
      <circle cx={cx} cy={cy} r={r * 0.35} fill="rgba(247,243,237,0.7)" stroke={T.border} strokeWidth="0.8" />
      <circle cx={cx} cy={cy} r={r * 0.12} fill={T.bg3} stroke={T.border} strokeWidth="0.8" />
      {/* Brahmasthan dot */}
      <circle cx={cx} cy={cy} r="4.5" fill={T.gold} opacity="0.75" />
      {/* North arrow */}
      <line x1={cx} y1={cy - r - 20} x2={cx} y2={cy - r - 6} stroke={T.teal} strokeWidth="2" strokeLinecap="round" />
      <polygon points={`${cx},${cy - r - 24} ${cx - 3},${cy - r - 15} ${cx + 3},${cy - r - 15}`} fill={T.teal} />
      <text x={cx} y={cy - r - 28} textAnchor="middle" fontSize="7" fill={T.teal} fontFamily="var(--font-dm-mono)" fontWeight="700">N</text>
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [scrolled, setScrolled]         = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [comingSoon, setComingSoon]     = useState<string | null>(null);

  // Body class for scrolling
  useEffect(() => {
    document.body.classList.add("public-page");
    document.body.classList.remove("app-page");
    return () => document.body.classList.remove("public-page");
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 36);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const smoothTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Phase 1: no auth — go straight to dashboard
  // Phase 2: check session, redirect to /auth/login if unauthenticated
  const goDashboard = () => router.push("/dashboard");
  const goLogin     = () => router.push("/dashboard"); // TODO Phase 2: /auth/login
  const goSignUp    = () => router.push("/dashboard"); // TODO Phase 2: /auth/signup

  // ── NAV ──────────────────────────────────────────────────────────────────
  const navLinks = [
    { label: "Home",     action: () => smoothTo("hero") },
    { label: "Features", action: () => smoothTo("features") },
    { label: "Founder",  action: () => smoothTo("founder") },
  ];

  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: "var(--font-dm-sans)", minHeight: "100vh" }}>

      {/* ── FIXED NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "56px",
        background: scrolled ? "rgba(247,243,237,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: `1px solid ${scrolled ? T.border : "transparent"}`,
        transition: "all 0.25s ease",
      }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 24px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <button onClick={() => smoothTo("hero")} style={{ fontFamily: "var(--font-cormorant)", fontSize: "20px", color: T.gold2, background: "none", border: "none", cursor: "pointer", letterSpacing: "-0.3px" }}>
            vastu<span style={{ color: "#c46c0e" }}>@</span>home
          </button>

          {/* Desktop links */}
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }} className="hidden md:flex">
            {navLinks.map((l) => (
              <button key={l.label} onClick={l.action}
                style={{ background: "none", border: "none", fontSize: "12px", fontWeight: 500, color: T.text2, cursor: "pointer", transition: "color 0.15s" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = T.text)}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = T.text2)}
              >{l.label}</button>
            ))}
          </div>

          {/* Auth buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }} className="hidden md:flex">
            <button onClick={goDashboard}
              style={{ background: "none", border: `1px solid ${T.border}`, color: T.text2, padding: "6px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = T.teal; (e.currentTarget as HTMLElement).style.color = T.teal; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.color = T.text2; }}
            >Dashboard</button>
            <button onClick={goLogin}
              style={{ background: T.tealBg, border: `1px solid ${T.tealBd}`, color: T.teal, padding: "6px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.teal; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.tealBg; (e.currentTarget as HTMLElement).style.color = T.teal; }}
            >Log In</button>
            <button onClick={goSignUp}
              style={{ background: T.gold, border: "none", color: "#fffaf0", padding: "6px 16px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = T.gold2)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = T.gold)}
            >Sign Up</button>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden"
            style={{ background: "none", border: "none", fontSize: "18px", color: T.text2, cursor: "pointer" }}>
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{ background: "rgba(247,243,237,0.98)", borderBottom: `1px solid ${T.border}`, padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {navLinks.map((l) => (
              <button key={l.label} onClick={l.action} style={{ background: "none", border: "none", fontSize: "14px", color: T.text2, cursor: "pointer", textAlign: "left" }}>{l.label}</button>
            ))}
            <div style={{ display: "flex", gap: "8px", paddingTop: "8px" }}>
              <button onClick={goDashboard} style={{ flex: 1, padding: "8px", borderRadius: "7px", border: `1px solid ${T.border}`, background: "none", color: T.text2, fontSize: "12px", cursor: "pointer" }}>Dashboard</button>
              <button onClick={goLogin} style={{ flex: 1, padding: "8px", borderRadius: "7px", border: `1px solid ${T.tealBd}`, background: T.tealBg, color: T.teal, fontSize: "12px", cursor: "pointer" }}>Log In</button>
              <button onClick={goSignUp} style={{ flex: 1, padding: "8px", borderRadius: "7px", border: "none", background: T.gold, color: "#fffaf0", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Sign Up</button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section id="hero" style={{ paddingTop: "120px", paddingBottom: "80px", paddingLeft: "24px", paddingRight: "24px", background: `linear-gradient(180deg, rgba(154,120,32,0.04) 0%, transparent 60%)`, textAlign: "center" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <Pill>Professional Vastu Platform · Phase 1 Beta</Pill>

          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(40px, 6vw, 62px)", lineHeight: 1.08, color: T.text, marginTop: "24px", marginBottom: "18px", letterSpacing: "-0.5px" }}>
            Classical Vastu analysis,{" "}
            <span style={{ color: T.gold }}>precisely computed</span>
          </h1>

          <p style={{ fontSize: "16px", lineHeight: 1.65, color: T.text2, maxWidth: "500px", margin: "0 auto 36px" }}>
            Replace acetate overlays and hand calculations with an AI workspace
            grounded in Vishwakarma Prakash, Mayamatam, and Brihat Samhita.
          </p>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginBottom: "60px" }}>
            <PrimaryBtn onClick={goSignUp} large>Start free — no account needed →</PrimaryBtn>
            <GhostBtn onClick={goDashboard} teal>Open Dashboard</GhostBtn>
          </div>

          {/* Hero visual */}
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Chakra card */}
            <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "28px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", minWidth: "240px" }}>
              <ChakraPreview />
              <span style={{ fontSize: "10px", color: T.text3, fontFamily: "var(--font-dm-mono)" }}>Shakti Chakra · 16 zones</span>
            </div>

            {/* Stats column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "8px" }}>
              {[
                { val: "16", lbl: "Vastu zones", accent: T.gold },
                { val: "22.5°", lbl: "per zone", accent: T.teal },
                { val: "3", lbl: "classical texts", accent: T.gold },
                { val: "100%", lbl: "exact math", accent: T.teal },
              ].map((s) => (
                <div key={s.lbl} style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "10px", padding: "14px 20px", minWidth: "160px" }}>
                  <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "30px", color: s.accent, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: "10px", color: T.text3, marginTop: "2px", fontFamily: "var(--font-dm-mono)" }}>{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT IT DOES ── */}
      <Section id="what" style={{ padding: "80px 24px", background: T.bg2, borderTop: `1px solid ${T.border2}` }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
          <Pill teal>How it works</Pill>
          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(28px, 4vw, 42px)", color: T.text, margin: "18px 0 12px" }}>
            From floor plan to full analysis in minutes
          </h2>
          <p style={{ fontSize: "14px", color: T.text2, lineHeight: 1.7, maxWidth: "500px", margin: "0 auto 52px" }}>
            Upload or sketch any floor plan, set your orientation, and get a
            complete Vastu breakdown — all computed, none estimated.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", textAlign: "left" }}>
            {[
              { step: "01", title: "Draw the perimeter", desc: "Click to place polygon points on your uploaded blueprint. Any shape, any size." },
              { step: "02", title: "Set True North & scale", desc: "Enter the compass angle. Calibrate scale with two reference points. NOAA declination built in." },
              { step: "03", title: "Read the full analysis", desc: "16-zone breakdown, exact sq-ft per zone, cut severity scores, Brahmasthan, AI-grounded remedies." },
            ].map((s) => (
              <div key={s.step} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: "12px", padding: "24px" }}>
                <div style={{ fontFamily: "var(--font-dm-mono)", fontSize: "10px", color: T.teal, marginBottom: "10px" }}>Step {s.step}</div>
                <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "20px", color: T.text, marginBottom: "8px" }}>{s.title}</div>
                <p style={{ fontSize: "12px", color: T.text2, lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── BENEFITS ── */}
      <Section id="benefits" style={{ padding: "80px 24px", borderTop: `1px solid ${T.border2}` }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <Pill>Why consultants use it</Pill>
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(28px, 4vw, 42px)", color: T.text, margin: "18px 0 0" }}>Built for professional practice</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "14px" }}>
            {BENEFITS.map((b) => (
              <div key={b.n} style={{ display: "flex", gap: "20px", background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "12px", padding: "22px" }}>
                <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "38px", color: "rgba(154,120,32,0.18)", lineHeight: 1, flexShrink: 0, marginTop: "-4px" }}>{b.n}</div>
                <div>
                  <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "18px", color: T.text, marginBottom: "6px" }}>{b.title}</div>
                  <p style={{ fontSize: "12px", color: T.text2, lineHeight: 1.65 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FEATURES ── */}
      <Section id="features" style={{ padding: "80px 24px", background: T.bg2, borderTop: `1px solid ${T.border2}` }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <Pill teal>Core capabilities</Pill>
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(28px, 4vw, 42px)", color: T.text, margin: "18px 0 0" }}>Everything in one workspace</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
            ))}
          </div>
        </div>
      </Section>

      {/* ── OUTPUT PREVIEW ── */}
      <Section id="preview" style={{ padding: "80px 24px", borderTop: `1px solid ${T.border2}` }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <Pill>What you get</Pill>
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(28px, 4vw, 42px)", color: T.text, margin: "18px 0 10px" }}>Real output from every analysis</h2>
            <p style={{ fontSize: "13px", color: T.text2, maxWidth: "420px", margin: "0 auto" }}>Not mockups — this is exactly what the workspace produces for any floor plan.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
            {/* Zone % card */}
            <PreviewCard title="Zone Percentages">
              {[
                { zone: "N — Kubera",  pct: 6.8, color: T.water },
                { zone: "NE — Ishaan", pct: 5.1, color: T.space },
                { zone: "E — Indra",   pct: 6.3, color: T.air },
                { zone: "SE — Agni",   pct: 4.2, color: T.fire },
                { zone: "S — Yama",    pct: 6.5, color: T.earth },
              ].map((z) => (
                <div key={z.zone} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: z.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: "11px", color: T.text2 }}>{z.zone}</div>
                  <div style={{ fontFamily: "var(--font-dm-mono)", fontSize: "11px", color: T.text, minWidth: "36px", textAlign: "right" }}>{z.pct}%</div>
                  <div style={{ width: `${z.pct * 9}px`, height: "3px", background: z.color, borderRadius: "2px", opacity: 0.55 }} />
                </div>
              ))}
              <div style={{ fontSize: "9px", color: T.text3, marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${T.border2}` }}>Ideal: 6.25% per zone</div>
            </PreviewCard>

            {/* Cut severity */}
            <PreviewCard title="Cut Severity">
              {[
                { zone: "NE", severity: "Severe",   pct: "31%", color: T.fire },
                { zone: "SE", severity: "Moderate", pct: "18%", color: "#c46c0e" },
                { zone: "SW", severity: "Mild",     pct: "7%",  color: T.gold },
              ].map((c) => (
                <div key={c.zone} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontFamily: "var(--font-dm-mono)", fontSize: "10px", fontWeight: 700, color: T.gold, width: "26px" }}>{c.zone}</span>
                  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: `${c.color}18`, color: c.color, border: `1px solid ${c.color}40`, fontWeight: 600 }}>{c.severity}</span>
                  <span style={{ fontFamily: "var(--font-dm-mono)", fontSize: "11px", color: T.text2, marginLeft: "auto" }}>{c.pct} cut</span>
                </div>
              ))}
              <div style={{ fontSize: "9px", color: T.text3, marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${T.border2}` }}>Severe &gt;25% · Moderate 10–25% · Mild &lt;10%</div>
            </PreviewCard>

            {/* AI advisor */}
            <PreviewCard title="Vastu AI Advisor">
              <div style={{ fontSize: "11px", color: T.text2, lineHeight: 1.7, background: T.tealBg, border: `1px solid ${T.tealBd}`, borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
                The NE zone (Ishaan) shows a 31% cut — classified severe per Vishwakarma Prakash §4.2. This quadrant governs wisdom and new beginnings. A water element remedy at the NE corner is advised.
              </div>
              <div style={{ fontSize: "9px", color: T.text3 }}>Source: Vishwakarma Prakash · multi-turn context</div>
            </PreviewCard>

            {/* Brahmasthan */}
            <PreviewCard title="Brahmasthan & North">
              <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "12px 0" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "28px", color: T.gold }}>⊙</div>
                  <div style={{ fontSize: "10px", color: T.text2, marginTop: "4px" }}>Geometric centroid</div>
                  <div style={{ fontFamily: "var(--font-dm-mono)", fontSize: "10px", color: T.text3 }}>x: 382, y: 310</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "28px", color: T.teal }}>↑</div>
                  <div style={{ fontSize: "10px", color: T.text2, marginTop: "4px" }}>True North</div>
                  <div style={{ fontFamily: "var(--font-dm-mono)", fontSize: "10px", color: T.text3 }}>14.3° + 0.8° decl.</div>
                </div>
              </div>
            </PreviewCard>
          </div>
        </div>
      </Section>

      {/* ── FOUNDER ── */}
      <Section id="founder" style={{ padding: "80px 24px", background: T.bg2, borderTop: `1px solid ${T.border2}` }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", textAlign: "center" }}>
          <Pill teal>The person behind it</Pill>

          <div style={{ width: "80px", height: "80px", borderRadius: "50%", margin: "28px auto 16px", background: `linear-gradient(135deg, rgba(154,120,32,0.12), rgba(42,122,114,0.12))`, border: `2px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-cormorant)", fontSize: "32px", color: T.text2 }}>
            N
          </div>

          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "26px", color: T.text, marginBottom: "4px" }}>Naitik Panchal</h2>
          <p style={{ fontSize: "11px", color: T.text3, marginBottom: "20px" }}>Builder · vastu@home</p>

          <p style={{ fontSize: "14px", lineHeight: 1.75, color: T.text2, maxWidth: "520px", margin: "0 auto 20px" }}>
            I built vastu@home because every Vastu consultant I spoke to was still
            using printed acetate overlays, hand calculators, and guesswork for zone
            percentages. Classical Vastu is rigorous — the tools should be too.
          </p>
          <p style={{ fontSize: "14px", lineHeight: 1.75, color: T.text2, maxWidth: "520px", margin: "0 auto" }}>
            This platform is my attempt to give consultants a workspace that matches
            the precision and depth of the texts they work from.
          </p>
        </div>
      </Section>

      {/* ── ROADMAP ── */}
      <Section id="roadmap" style={{ padding: "80px 24px", borderTop: `1px solid ${T.border2}` }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <Pill>Roadmap</Pill>
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(28px, 4vw, 42px)", color: T.text, margin: "18px 0 10px" }}>What&apos;s coming in Phase 2</h2>
            <p style={{ fontSize: "13px", color: T.text2 }}>Click any feature to get notified when it launches.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px" }}>
            {Object.entries(ROADMAP).map(([category, items]) => (
              <div key={category} style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "12px", padding: "20px" }}>
                <div style={{ fontSize: "10px", color: T.teal, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "14px", fontFamily: "var(--font-dm-sans)" }}>{category}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {items.map((item) => (
                    <RoadmapBtn key={item} label={item} onClick={() => setComingSoon(item)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FINAL CTA ── */}
      <Section style={{ padding: "96px 24px", background: `linear-gradient(180deg, ${T.bg2} 0%, rgba(154,120,32,0.04) 100%)`, borderTop: `1px solid ${T.border2}`, textAlign: "center" }}>
        <div style={{ maxWidth: "520px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(32px, 5vw, 50px)", color: T.text, lineHeight: 1.1, marginBottom: "18px" }}>
            Start your first analysis today
          </h2>
          <p style={{ fontSize: "14px", color: T.text2, lineHeight: 1.7, marginBottom: "36px" }}>
            No account required for Phase 1. Open the dashboard and upload a floor
            plan in under two minutes.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <PrimaryBtn onClick={goSignUp} large>Get started free →</PrimaryBtn>
            <GhostBtn onClick={goDashboard} teal>Open Dashboard</GhostBtn>
          </div>
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <footer style={{ background: T.bg3, borderTop: `1px solid ${T.border}`, padding: "32px 24px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "18px", color: T.gold2 }}>
            vastu<span style={{ color: "#c46c0e" }}>@</span>home
          </div>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {[
              { label: "Home",     fn: () => smoothTo("hero") },
              { label: "Features", fn: () => smoothTo("features") },
              { label: "Founder",  fn: () => smoothTo("founder") },
              { label: "Dashboard",fn: goDashboard },
              { label: "Log In",   fn: goLogin },
            ].map((l) => (
              <button key={l.label} onClick={l.fn}
                style={{ background: "none", border: "none", fontSize: "11px", color: T.text3, cursor: "pointer", transition: "color 0.15s" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = T.text2)}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = T.text3)}
              >{l.label}</button>
            ))}
          </div>

          <div style={{ fontSize: "10px", color: T.text3 }}>© 2026 vastu@home · Phase 1 Beta</div>
        </div>
      </footer>

      {/* ── COMING SOON MODAL ── */}
      {comingSoon && (
        <ComingSoonModal feature={comingSoon} onClose={() => setComingSoon(null)} />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.bg, border: `1px solid ${hov ? T.tealBd : T.border}`,
        borderRadius: "12px", padding: "22px",
        transition: "border-color 0.18s, transform 0.18s, box-shadow 0.18s",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? "0 6px 20px rgba(28,23,16,0.07)" : "none",
        cursor: "default",
      }}
    >
      <div style={{ fontSize: "22px", color: T.teal, marginBottom: "10px" }}>{icon}</div>
      <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "17px", color: T.text, marginBottom: "6px" }}>{title}</div>
      <p style={{ fontSize: "11px", color: T.text2, lineHeight: 1.65 }}>{desc}</p>
    </div>
  );
}

function PreviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "12px", padding: "22px" }}>
      <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "16px", color: T.text, marginBottom: "16px" }}>{title}</div>
      {children}
    </div>
  );
}

function RoadmapBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontSize: "11px", fontWeight: 500, padding: "5px 11px",
        borderRadius: "7px", cursor: "pointer",
        fontFamily: "var(--font-dm-sans)",
        background: hov ? T.bg3 : T.bg,
        border: `1px solid ${hov ? T.tealBd : T.border}`,
        color: hov ? T.teal : T.text3,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}
