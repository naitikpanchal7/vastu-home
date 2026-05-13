import Link from "next/link";

export const metadata = {
  title: "Refund & Cancellation Policy — Astraa Vastu",
  description: "Refund and Cancellation Policy for Astraa Vastu",
};

const T = {
  bg:     "#f7f3ed",
  bg2:    "#f0ebe2",
  bg3:    "#e9e2d6",
  border: "rgba(100,70,20,0.13)",
  text:   "#1c1710",
  text2:  "#5c4730",
  text3:  "#9a8060",
  gold2:  "#735a10",
};

export default function RefundPage() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "var(--font-dm-sans)", color: T.text }}>

      {/* Nav */}
      <div style={{ borderBottom: `1px solid ${T.border}`, background: T.bg2, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant)", fontSize: "22px", color: T.gold2, textDecoration: "none", letterSpacing: "-0.3px" }}>
          Astraa Vastu
        </Link>
        <div style={{ display: "flex", gap: "20px" }}>
          <Link href="/privacy" style={{ fontSize: "11px", color: T.text3, textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ fontSize: "11px", color: T.text3, textDecoration: "none" }}>Terms</Link>
          <Link href="/refund" style={{ fontSize: "11px", color: T.gold2, textDecoration: "none", fontWeight: 600 }}>Refund</Link>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 24px 80px" }}>

        <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "40px", color: T.gold2, marginBottom: "6px", fontWeight: 600 }}>
          Refund &amp; Cancellation Policy
        </h1>
        <p style={{ fontSize: "12px", color: T.text3, marginBottom: "48px" }}>
          Effective Date: May 13, 2026 · Last Updated: May 13, 2026
        </p>

        <p style={{ fontSize: "13px", lineHeight: "1.8", color: T.text2, marginBottom: "36px" }}>
          This Refund and Cancellation Policy applies to all subscription purchases made on astraavastu.com ("Platform"), operated by Astraa Vastu.
        </p>

        <Section title="1. Subscription Cancellation">
          <p>You may cancel your subscription at any time through:</p>
          <ul>
            <li>Settings → Billing within the Platform, or</li>
            <li>By emailing <a href="mailto:astraavastu@gmail.com" style={{ color: T.gold2 }}>astraavastu@gmail.com</a></li>
          </ul>
          <p>Cancellation takes effect at the end of your current billing period (monthly or annual). You will retain full access to your subscribed plan until that date. After the billing period ends, your account will automatically revert to the free tier (if available) or be deactivated.</p>
          <p>We do not charge cancellation fees.</p>
        </Section>

        <Section title="2. Refund Policy">
          <p style={{ fontWeight: 600, color: T.text }}>All subscription fees are non-refundable.</p>
          <p>This includes but is not limited to:</p>
          <ol type="a">
            <li>Partial months or years of service after cancellation</li>
            <li>Subscription fees paid in advance for an annual plan</li>
            <li>Fees for periods during which you did not use the Platform</li>
            <li>Fees for periods during which your account was suspended due to violation of our Terms and Conditions</li>
          </ol>
          <p>By subscribing to a paid plan, you acknowledge and accept this no-refund policy.</p>
        </Section>

        <Section title="3. Exceptions">
          <p>We may, at our sole discretion, issue a refund or account credit in the following circumstances:</p>
          <ol type="a">
            <li>You were charged in error due to a technical fault on our side</li>
            <li>You were charged after successfully cancelling your subscription</li>
            <li>Duplicate charges occurred due to a billing system error</li>
          </ol>
          <p>To report a billing error, email <a href="mailto:astraavastu@gmail.com" style={{ color: T.gold2 }}>astraavastu@gmail.com</a> within 7 days of the charge with your registered email address and a description of the issue. We will investigate and respond within 5 business days.</p>
        </Section>

        <Section title="4. Annual Subscriptions">
          <p>Annual subscription fees are charged in full at the start of the billing cycle. If you cancel an annual subscription, you retain access until the end of the paid year. No pro-rated refunds are issued for the remaining months.</p>
        </Section>

        <Section title="5. Payment Disputes">
          <p>All payments are processed by Razorpay (Razorpay Software Private Limited). If you have a payment dispute, we strongly encourage you to contact us at <a href="mailto:astraavastu@gmail.com" style={{ color: T.gold2 }}>astraavastu@gmail.com</a> before initiating a chargeback with your bank or card issuer. We are committed to resolving genuine billing issues promptly.</p>
          <p>Initiating a chargeback without first contacting us may result in immediate suspension of your account pending investigation.</p>
        </Section>

        <Section title="6. Changes to This Policy">
          <p>We reserve the right to update this policy at any time. Changes will be posted on this page with an updated effective date. Your continued use of the Platform after the effective date constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="7. Contact">
          <p>For any refund or cancellation queries:</p>
          <p style={{ marginTop: "8px" }}>
            Email: <a href="mailto:astraavastu@gmail.com" style={{ color: T.gold2 }}>astraavastu@gmail.com</a><br />
            Website: <a href="https://astraavastu.com" style={{ color: T.gold2 }}>astraavastu.com</a>
          </p>
        </Section>

        {/* Footer links */}
        <div style={{ marginTop: "60px", paddingTop: "24px", borderTop: `1px solid ${T.border}`, display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <Link href="/privacy" style={{ fontSize: "11px", color: T.text3, textDecoration: "none" }}>Privacy Policy</Link>
          <Link href="/terms" style={{ fontSize: "11px", color: T.text3, textDecoration: "none" }}>Terms &amp; Conditions</Link>
          <Link href="/refund" style={{ fontSize: "11px", color: T.gold2, textDecoration: "none", fontWeight: 600 }}>Refund Policy</Link>
          <span style={{ fontSize: "11px", color: T.text3, marginLeft: "auto" }}>© 2026 Astraa Vastu</span>
        </div>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "36px" }}>
      <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "22px", color: T.gold2, marginBottom: "14px", fontWeight: 600 }}>{title}</h2>
      <div style={{ fontSize: "13px", lineHeight: "1.8", color: T.text2, display: "flex", flexDirection: "column", gap: "8px" }}>
        {children}
      </div>
    </div>
  );
}
