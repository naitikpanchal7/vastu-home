"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

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
  { icon: "◎", title: "Shakti Chakra", desc: "Authentic 16-zone overlay from True North. Never estimated, always exact." },
  { icon: "⬡", title: "Perimeter & Cuts", desc: "Draw any polygon floor plan. Cuts are flagged per zone with mild / moderate / severe scoring." },
  { icon: "⊙", title: "Brahmasthan", desc: "Geometric centroid via polygon math — not screen center, not a guess." },
  { icon: "☷", title: "Zone Percentages", desc: "Sutherland-Hodgman clipping gives exact sq-ft per zone. Ideal is 6.25% each." },
  { icon: "↑", title: "True North", desc: "Enter your True North bearing and the Shakti Chakra aligns instantly to your site's orientation." },
  { icon: "✦", title: "Vastu AI Advisor", desc: "Multi-turn AI advisor grounded in Vastu principles — analyzes zones, cuts, and Brahmasthan in context." },
];

const BENEFITS = [
  { n: "01", title: "Replace manual overlays", desc: "No more acetate sheets, protractors, and hand-drawn chakras. The full overlay renders in seconds on any floor plan." },
  { n: "02", title: "Defensible exact numbers", desc: "Zone percentages come from polygon clipping math — same answer every run, shareable with clients." },
  { n: "03", title: "Project history at a glance", desc: "All your projects, notes, and zone analyses in one dashboard. Open any past analysis and pick up exactly where you left off." },
  { n: "04", title: "Built for practice scale", desc: "Project management and organized reports — so your workflow scales without extra admin." },
];


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
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checking, setChecking]     = useState(true);

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
      else setChecking(false);
    });
  }, [router]);

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

  if (checking) return null;

  const smoothTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goLogin  = () => router.push("/auth/login");
  const goSignUp = () => router.push("/auth/login?mode=signup");

  // ── NAV ──────────────────────────────────────────────────────────────────
  const navLinks = [
    { label: "Home",      action: () => smoothTo("hero") },
    { label: "Features",  action: () => smoothTo("features") },
    { label: "Demo",      action: () => smoothTo("demo") },
    { label: "Gratitude", action: () => smoothTo("gratitude") },
    { label: "Founder",   action: () => smoothTo("founder") },
    { label: "Pricing",   action: () => router.push("/pricing") },
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
            Astraa Vastu
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
              <button onClick={goLogin} style={{ flex: 1, padding: "8px", borderRadius: "7px", border: `1px solid ${T.tealBd}`, background: T.tealBg, color: T.teal, fontSize: "12px", cursor: "pointer" }}>Log In</button>
              <button onClick={goSignUp} style={{ flex: 1, padding: "8px", borderRadius: "7px", border: "none", background: T.gold, color: "#fffaf0", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Sign Up</button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section id="hero" style={{ paddingTop: "120px", paddingBottom: "80px", paddingLeft: "24px", paddingRight: "24px", background: `linear-gradient(180deg, rgba(154,120,32,0.04) 0%, transparent 60%)`, textAlign: "center" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <Pill>Professional Vastu Platform · For Consultants</Pill>

          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(40px, 6vw, 62px)", lineHeight: 1.08, color: T.text, marginTop: "24px", marginBottom: "18px", letterSpacing: "-0.5px" }}>
            Classical Vastu analysis,{" "}
            <span style={{ color: T.gold }}>precisely computed</span>
          </h1>

          <p style={{ fontSize: "16px", lineHeight: 1.65, color: T.text2, maxWidth: "500px", margin: "0 auto 36px" }}>
            Replace acetate overlays and hand calculations with a digital Vastu workspace.
            Draw, analyze, and advise — all in one place.
          </p>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginBottom: "60px" }}>
            <PrimaryBtn onClick={goSignUp} large>Get started free →</PrimaryBtn>
            <GhostBtn onClick={goLogin} teal>Log In</GhostBtn>
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
                { val: "AI", lbl: "Vastu mapping", accent: T.gold },
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
              { step: "02", title: "Set True North", desc: "Enter your True North bearing. The Shakti Chakra aligns automatically to your site's orientation." },
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

      {/* ── DEMO VIDEO ── */}
      <Section id="demo" style={{ padding: "80px 24px", background: T.bg2, borderTop: `1px solid ${T.border2}` }}>
        <div style={{ maxWidth: "820px", margin: "0 auto", textAlign: "center" }}>
          <Pill teal>See it in action</Pill>
          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(28px, 4vw, 42px)", color: T.text, margin: "18px 0 12px" }}>
            Watch the platform in action
          </h2>
          <p style={{ fontSize: "14px", color: T.text2, lineHeight: 1.7, maxWidth: "440px", margin: "0 auto 44px" }}>
            A full walkthrough — from uploading a floor plan to a complete Vastu zone analysis.
          </p>

          {/* Video placeholder */}
          <div style={{
            position: "relative",
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: "16px",
            overflow: "hidden",
            aspectRatio: "16 / 9",
            maxWidth: "720px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
          }}>
            {/* decorative grid lines */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke={T.gold} strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* subtle chakra watermark */}
            <div style={{ position: "absolute", opacity: 0.04 }}>
              <ChakraPreview />
            </div>

            {/* play icon */}
            <div style={{
              width: "64px", height: "64px", borderRadius: "50%",
              background: `rgba(154,120,32,0.10)`,
              border: `1.5px solid rgba(154,120,32,0.25)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 1,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <polygon points="8,5 19,12 8,19" fill={T.gold} opacity="0.7" />
              </svg>
            </div>

            <div style={{ zIndex: 1, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "22px", color: T.text, marginBottom: "6px" }}>
                Demo video coming soon
              </div>
              <div style={{ fontSize: "11px", color: T.text3, fontFamily: "var(--font-dm-mono)" }}>
                We&apos;re recording a full walkthrough — check back shortly
              </div>
            </div>
          </div>

          <p style={{ fontSize: "11px", color: T.text3, marginTop: "20px" }}>
            Can&apos;t wait? <button onClick={goSignUp} style={{ background: "none", border: "none", color: T.teal, fontSize: "11px", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Sign up free</button> and try it yourself.
          </p>
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
                The NE zone (Ishaan) shows a 31% cut — classified severe. This quadrant governs wisdom and new beginnings. A water element remedy at the NE corner is advised.
              </div>
              <div style={{ fontSize: "9px", color: T.text3 }}>Vastu AI · multi-turn context</div>
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
                  <div style={{ fontFamily: "var(--font-dm-mono)", fontSize: "10px", color: T.text3 }}>14.3°</div>
                </div>
              </div>
            </PreviewCard>
          </div>
        </div>
      </Section>

      {/* ── GRATITUDE ── */}
      <Section id="gratitude" style={{ padding: "80px 24px", borderTop: `1px solid ${T.border2}` }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", textAlign: "center" }}>
          <Pill>With gratitude</Pill>
          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(28px, 4vw, 42px)", color: T.text, margin: "18px 0 10px" }}>
            None of this without them
          </h2>
          <p style={{ fontSize: "13px", color: T.text2, marginBottom: "48px" }}>
            The people who made this possible — and me.
          </p>
          <GratitudeCarousel />
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
          <p style={{ fontSize: "11px", color: T.text3, marginBottom: "20px" }}>Builder · Astraa Vastu</p>

          <p style={{ fontSize: "14px", lineHeight: 1.75, color: T.text2, maxWidth: "520px", margin: "0 auto 20px" }}>
            I&apos;m Naitik Panchal, the founder of Astraa Vastu — and I&apos;m 15. My passion for Vastu
            started at home, watching my mother struggle to accurately map out floor plans by hand.
            That frustration stayed with me, and I decided I was going to fix it for her.
            Astraa Vastu is what that decision became.
          </p>
          <p style={{ fontSize: "14px", lineHeight: 1.75, color: T.text2, maxWidth: "520px", margin: "0 auto" }}>
            I built it for her first, and now I&apos;m building it for every consultant and family
            who deserves better tools. I believe Vastu — a Vedic science rooted in thousands of
            years of knowledge — is a powerful tool that, when applied with precision, can genuinely
            enhance the quality of our lives. Through Astraa Vastu, I hope to bring that precision
            to everyone, and make a meaningful impact on the world — one floor plan at a time.
          </p>
        </div>
      </Section>

      {/* ── FINAL CTA ── */}
      <Section style={{ padding: "96px 24px", background: `linear-gradient(180deg, ${T.bg2} 0%, rgba(154,120,32,0.04) 100%)`, borderTop: `1px solid ${T.border2}`, textAlign: "center" }}>
        <div style={{ maxWidth: "520px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(32px, 5vw, 50px)", color: T.text, lineHeight: 1.1, marginBottom: "18px" }}>
            Start your first analysis today
          </h2>
          <p style={{ fontSize: "14px", color: T.text2, lineHeight: 1.7, marginBottom: "36px" }}>
            Create a free account and upload your first floor plan in under two minutes.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <PrimaryBtn onClick={goSignUp} large>Get started free →</PrimaryBtn>
            <GhostBtn onClick={goLogin} teal>Log In</GhostBtn>
          </div>
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <footer style={{ background: T.bg3, borderTop: `1px solid ${T.border}`, padding: "32px 24px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "18px", color: T.gold2 }}>
            Astraa Vastu
          </div>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {[
              { label: "Home",      fn: () => smoothTo("hero") },
              { label: "Features",  fn: () => smoothTo("features") },
              { label: "Demo",      fn: () => smoothTo("demo") },
              { label: "Gratitude", fn: () => smoothTo("gratitude") },
              { label: "Founder",   fn: () => smoothTo("founder") },
              { label: "Pricing",   fn: () => router.push("/pricing") },
              { label: "Log In",    fn: goLogin },
              { label: "Sign Up",   fn: goSignUp },
            ].map((l) => (
              <button key={l.label} onClick={l.fn}
                style={{ background: "none", border: "none", fontSize: "11px", color: T.text3, cursor: "pointer", transition: "color 0.15s" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = T.text2)}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = T.text3)}
              >{l.label}</button>
            ))}
          </div>

          <div style={{ fontSize: "10px", color: T.text3 }}>© 2026 Astraa Vastu · Phase 1 Beta</div>
        </div>
      </footer>

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const GRATITUDE = [
  {
    name: "Bhagwan",
    message: "Bhagwan, I am forever grateful for you being in my life. Thank you for everything you have given me — a life filled with love, devotion, happiness, and people who make it infinitely better. What a privilege you have bestowed upon me: to work towards my dream, to do what I love. I am truly grateful. I pray you bless me so I can make a meaningful impact in people's lives and leave a lasting mark on our world.",
  },
  {
    name: "Bhaiya",
    message: "To my Shree Ram, for whom I am Lakshman. Thank you, Bhaiya, for bringing light into my life. I am forever grateful to have the best brother in the world — the one who makes me laugh the most and stands as the pillar of my strength. None of this would have been possible without you. I hope to one day be like you.",
  },
  {
    name: "Mumma & Papa",
    message: "\"Behind every child who believes in themselves is a parent who believed first.\" Thank you, Mumma and Papa, for always having faith in me. Your belief gives me the confidence to never back down from any challenge. Thank you for instilling the right values in me — they are the foundation of everything I am and everything I am trying to build.",
  },
  {
    name: "Aji · Abba · Dadi · Dada",
    nameStyle: "serif" as const,
    message: "Thank you for being the foundation this family is built on. Everything I have — the love, the values, the warmth I grew up surrounded by — traces back to you. You are the roots that hold all of us together, and I am endlessly grateful to have not one but four people loving me the way only grandparents can. Thank you for making me feel like the most special person in the room every single time.",
  },
  {
    name: "Heena Maam & Yash Sir",
    message: "Thank you for teaching me — I would still be in 9th grade struggling with Spanish and Maths if it weren't for you. You made learning genuinely fun. But more than the lessons, thank you for always having my back. Without your support, I wouldn't have had the courage to pursue my passions.",
  },
  {
    name: "Chatrabhuj Narsee School",
    message: "I am forever grateful to Chatrabhuj Narsee School for shaping me into the person I am. The school has always created a space where I could be myself, chase what I love, and grow without limits. And to every teacher who stood by me, believed in me, and quietly made things possible when I needed it most — thank you. You never just taught me subjects, you taught me that I was worth betting on.",
  },
];

function GratitudeCarousel() {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [anim, setAnim] = useState(false);
  const total = GRATITUDE.length;

  const navigate = (next: number, direction: 1 | -1) => {
    if (anim) return;
    setDir(direction);
    setAnim(true);
    setTimeout(() => {
      setIdx(next);
      setAnim(false);
    }, 220);
  };

  const prev = () => navigate((idx - 1 + total) % total, -1);
  const next = () => navigate((idx + 1) % total, 1);

  const card = GRATITUDE[idx];

  return (
    <div style={{ position: "relative" }}>
      {/* Card */}
      <div style={{
        background: T.bg2,
        border: `1px solid ${T.border}`,
        borderRadius: "16px",
        padding: "40px 44px",
        minHeight: "260px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        opacity: anim ? 0 : 1,
        transform: anim ? `translateX(${dir * 18}px)` : "translateX(0)",
        transition: "opacity 0.22s ease, transform 0.22s ease",
      }}>
        {/* Name — addressed to */}
        <div style={{ marginBottom: "20px", textAlign: "left" }}>
          <span style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: card.nameStyle === "serif" ? "26px" : "22px",
            fontStyle: "italic",
            color: T.gold,
            letterSpacing: card.nameStyle === "serif" ? "0.5px" : "0",
          }}>
            {card.name} —
          </span>
        </div>

        {/* Message */}
        <p style={{
          fontSize: "14px",
          lineHeight: 1.8,
          color: T.text2,
          textAlign: "left",
          flex: 1,
          margin: 0,
        }}>
          {card.message}
        </p>
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "24px" }}>
        {/* Prev */}
        <button onClick={prev} style={{
          background: "none", border: `1px solid ${T.border}`, borderRadius: "50%",
          width: "36px", height: "36px", cursor: "pointer", color: T.text3,
          fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = T.gold3; (e.currentTarget as HTMLElement).style.color = T.gold; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.color = T.text3; }}
        >‹</button>

        {/* Dots */}
        <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
          {GRATITUDE.map((_, i) => (
            <button key={i} onClick={() => navigate(i, i > idx ? 1 : -1)} style={{
              width: i === idx ? "20px" : "6px",
              height: "6px",
              borderRadius: "3px",
              border: "none",
              cursor: "pointer",
              background: i === idx ? T.gold : T.border,
              transition: "all 0.25s ease",
              padding: 0,
            }} />
          ))}
        </div>

        {/* Next */}
        <button onClick={next} style={{
          background: "none", border: `1px solid ${T.border}`, borderRadius: "50%",
          width: "36px", height: "36px", cursor: "pointer", color: T.text3,
          fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = T.gold3; (e.currentTarget as HTMLElement).style.color = T.gold; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.color = T.text3; }}
        >›</button>
      </div>

      {/* Counter */}
      <div style={{ textAlign: "center", marginTop: "12px", fontFamily: "var(--font-dm-mono)", fontSize: "10px", color: T.text3 }}>
        {idx + 1} / {total}
      </div>
    </div>
  );
}

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

