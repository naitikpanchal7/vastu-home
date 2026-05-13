import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Astraa Vastu",
  description: "Privacy Policy for Astraa Vastu",
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

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "var(--font-dm-sans)", color: T.text }}>

      {/* Nav */}
      <div style={{ borderBottom: `1px solid ${T.border}`, background: T.bg2, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant)", fontSize: "22px", color: T.gold2, textDecoration: "none", letterSpacing: "-0.3px" }}>
          Astraa Vastu
        </Link>
        <div style={{ display: "flex", gap: "20px" }}>
          <Link href="/privacy" style={{ fontSize: "11px", color: T.gold2, textDecoration: "none", fontWeight: 600 }}>Privacy</Link>
          <Link href="/terms" style={{ fontSize: "11px", color: T.text3, textDecoration: "none" }}>Terms</Link>
          <Link href="/refund" style={{ fontSize: "11px", color: T.text3, textDecoration: "none" }}>Refund</Link>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 24px 80px" }}>

        <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "40px", color: T.gold2, marginBottom: "6px", fontWeight: 600 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: "12px", color: T.text3, marginBottom: "48px" }}>
          Effective Date: May 13, 2026 · Last Updated: May 13, 2026
        </p>

        <Section title="Overview">
          <p>This Privacy Policy describes how Astraa Vastu ("Company", "we", "us", or "our") collects, uses, stores, and protects information obtained from users ("you", "User") of astraavastu.com and its related services (collectively, the "Platform"). By accessing or using the Platform, you consent to the practices described in this policy.</p>
        </Section>

        <Section title="1. Information We Collect">
          <Subsection title="1.1 Information You Provide Directly">
            <ul>
              <li><strong>Account Registration:</strong> name, email address, and password (or OAuth token if using Google Sign-In)</li>
              <li><strong>Profile Information:</strong> any optional profile details you add</li>
              <li><strong>Project Data:</strong> floor plan files, annotations, Vastu analysis inputs, and notes you create on the Platform</li>
              <li><strong>Communications:</strong> messages you send to our support email</li>
            </ul>
          </Subsection>
          <Subsection title="1.2 Information Collected Automatically">
            <ul>
              <li><strong>Usage Data:</strong> pages visited, features used, session duration, click patterns, and error logs</li>
              <li><strong>Device Information:</strong> browser type, operating system, IP address, and device identifiers</li>
              <li><strong>Cookies and Local Storage:</strong> session tokens, user preferences, and authentication state. You may disable cookies in your browser, but certain features may not function correctly</li>
            </ul>
          </Subsection>
          <Subsection title="1.3 Payment Information">
            <p>All payment transactions are processed by Razorpay (Razorpay Software Private Limited). We do not collect, store, or process credit card numbers, bank account details, or UPI credentials. Razorpay&apos;s privacy policy governs all payment data.</p>
          </Subsection>
          <Subsection title="1.4 AI Interaction Data">
            <p>Prompts and inputs submitted to the Vastu AI assistant are processed by Anthropic, Inc. These inputs may include floor plan descriptions and property details. Please do not submit sensitive personal information in AI prompts.</p>
          </Subsection>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ol type="a">
            <li>Create and manage your account</li>
            <li>Provide, operate, and improve the Platform and its features</li>
            <li>Process subscription payments and send billing confirmations</li>
            <li>Send transactional emails such as account verification, password resets, and payment receipts</li>
            <li>Respond to support requests and communications</li>
            <li>Detect and prevent fraud, abuse, and security incidents</li>
            <li>Comply with applicable laws and legal obligations</li>
            <li>Analyze usage trends to improve user experience</li>
          </ol>
          <p style={{ marginTop: "12px" }}>We do not sell your personal data to third parties. We do not use your data for advertising purposes.</p>
        </Section>

        <Section title="3. Sharing of Information">
          <Subsection title="3.1 Service Providers">
            <p>We engage the following third-party service providers who process data on our behalf, under confidentiality obligations:</p>
            <ul>
              <li><strong>Supabase Inc.</strong> — database hosting, authentication, and file storage</li>
              <li><strong>Anthropic, Inc.</strong> — AI language model processing</li>
              <li><strong>Razorpay Software Private Limited</strong> — payment processing</li>
              <li><strong>Google LLC</strong> — OAuth authentication (if you use Google Sign-In)</li>
              <li><strong>Vercel Inc.</strong> — application hosting and content delivery</li>
            </ul>
          </Subsection>
          <Subsection title="3.2 Legal Requirements">
            <p>We may disclose your information if required to do so by law, court order, or governmental authority, or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.</p>
          </Subsection>
          <Subsection title="3.3 Business Transfers">
            <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you by email and/or a prominent notice on the Platform before your information becomes subject to a different privacy policy.</p>
          </Subsection>
          <Subsection title="3.4 With Your Consent">
            <p>We may share information with third parties when you have given us explicit consent to do so.</p>
          </Subsection>
        </Section>

        <Section title="4. Data Storage and Security">
          <p>Your data is stored on Supabase-managed servers. We implement industry-standard security measures including:</p>
          <ul>
            <li>Encryption of data at rest and in transit (TLS/SSL)</li>
            <li>Row-level security policies on database access</li>
            <li>Authentication tokens with expiry and rotation</li>
            <li>Access controls limiting staff access to user data</li>
          </ul>
          <p style={{ marginTop: "12px" }}>No method of transmission or storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security. You are responsible for maintaining the confidentiality of your account credentials.</p>
        </Section>

        <Section title="5. Data Retention">
          <p>We retain your personal data for as long as your account is active or as needed to provide the Platform. After account deletion, we may retain certain data for up to 30 days in backup systems before permanent deletion. Billing and transaction records may be retained for up to 7 years as required by applicable Indian accounting and tax laws.</p>
        </Section>

        <Section title="6. Your Rights">
          <p>You have the right to:</p>
          <ol type="a">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and associated data</li>
            <li>Withdraw consent for optional data processing at any time</li>
            <li>Receive a copy of your data in a portable format (where technically feasible)</li>
          </ol>
          <p style={{ marginTop: "12px" }}>To exercise any of these rights, email us at <a href="mailto:astraavastu@gmail.com" style={{ color: T.gold2 }}>astraavastu@gmail.com</a>. We will respond within 30 days.</p>
        </Section>

        <Section title="7. Account Deletion">
          <p>To permanently delete your account and all associated project data, email <a href="mailto:astraavastu@gmail.com" style={{ color: T.gold2 }}>astraavastu@gmail.com</a> with the subject line <strong>"Account Deletion Request"</strong>. Include the email address associated with your account. We will process the deletion within 7 business days and confirm by email.</p>
          <p style={{ marginTop: "12px" }}>Note: Deletion is irreversible. All projects, floor plans, and analysis data will be permanently removed.</p>
        </Section>

        <Section title="8. Cookies">
          <p>We use cookies and similar technologies for:</p>
          <ul>
            <li>Session authentication (essential — cannot be disabled without breaking login functionality)</li>
            <li>User preferences such as theme and language settings</li>
            <li>Analytics to understand Platform usage</li>
          </ul>
          <p style={{ marginTop: "12px" }}>You can manage cookie preferences through your browser settings. Disabling essential cookies will prevent you from logging in.</p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>The Platform is not directed at children under the age of 13. We do not knowingly collect personal information from children. If we become aware that a child under 13 has provided us with personal information, we will delete it promptly. If you believe a child has provided us with data, contact us at <a href="mailto:astraavastu@gmail.com" style={{ color: T.gold2 }}>astraavastu@gmail.com</a>.</p>
        </Section>

        <Section title="10. International Users">
          <p>The Platform is operated from India. If you access the Platform from outside India, your data will be transferred to and processed in India and on servers operated by our service providers (which may be located in the United States or other jurisdictions). By using the Platform, you consent to this transfer.</p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or by posting a prominent notice on the Platform at least 7 days before the change takes effect. Your continued use of the Platform after the effective date constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="12. Contact">
          <p>For privacy-related questions or requests:</p>
          <p style={{ marginTop: "8px" }}>
            Email: <a href="mailto:astraavastu@gmail.com" style={{ color: T.gold2 }}>astraavastu@gmail.com</a><br />
            Website: <a href="https://astraavastu.com" style={{ color: T.gold2 }}>astraavastu.com</a>
          </p>
        </Section>

        {/* Footer links */}
        <div style={{ marginTop: "60px", paddingTop: "24px", borderTop: `1px solid ${T.border}`, display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <Link href="/privacy" style={{ fontSize: "11px", color: T.gold2, textDecoration: "none", fontWeight: 600 }}>Privacy Policy</Link>
          <Link href="/terms" style={{ fontSize: "11px", color: T.text3, textDecoration: "none" }}>Terms &amp; Conditions</Link>
          <Link href="/refund" style={{ fontSize: "11px", color: T.text3, textDecoration: "none" }}>Refund Policy</Link>
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

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <h3 style={{ fontSize: "13px", fontWeight: 600, color: T.text, marginBottom: "6px" }}>{title}</h3>
      <div style={{ fontSize: "13px", lineHeight: "1.8", color: T.text2 }}>{children}</div>
    </div>
  );
}
