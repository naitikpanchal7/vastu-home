import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions — Astraa Vastu",
  description: "Terms and Conditions for Astraa Vastu",
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

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "var(--font-dm-sans)", color: T.text }}>

      {/* Nav */}
      <div style={{ borderBottom: `1px solid ${T.border}`, background: T.bg2, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "var(--font-cormorant)", fontSize: "22px", color: T.gold2, textDecoration: "none", letterSpacing: "-0.3px" }}>
          Astraa Vastu
        </Link>
        <div style={{ display: "flex", gap: "20px" }}>
          <Link href="/privacy" style={{ fontSize: "11px", color: T.text3, textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ fontSize: "11px", color: T.gold2, textDecoration: "none", fontWeight: 600 }}>Terms</Link>
          <Link href="/refund" style={{ fontSize: "11px", color: T.text3, textDecoration: "none" }}>Refund</Link>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 24px 80px" }}>

        <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "40px", color: T.gold2, marginBottom: "6px", fontWeight: 600 }}>
          Terms &amp; Conditions
        </h1>
        <p style={{ fontSize: "12px", color: T.text3, marginBottom: "48px" }}>
          Effective Date: May 13, 2026 · Last Updated: May 13, 2026
        </p>

        <p style={{ fontSize: "13px", lineHeight: "1.8", color: T.text2, marginBottom: "36px" }}>
          Please read these Terms and Conditions ("Terms") carefully before using astraavastu.com or any related services (the "Platform") operated by Astraa Vastu ("Company", "we", "us", "our"). By accessing or using the Platform, you agree to be bound by these Terms. If you do not agree, do not use the Platform.
        </p>

        <Section title="1. Acceptance of Terms">
          <p>These Terms constitute a legally binding agreement between you and Astraa Vastu. By creating an account, subscribing to a plan, or using any feature of the Platform, you confirm that:</p>
          <ol type="a">
            <li>You have read and understood these Terms</li>
            <li>You are at least 18 years of age, or are using the Platform under the supervision of a parent or legal guardian who agrees to these Terms</li>
            <li>You have the legal authority to enter into this agreement</li>
          </ol>
        </Section>

        <Section title="2. Description of Service">
          <p>Astraa Vastu provides an AI-powered Vastu Shastra mapping and analysis platform for professional consultants and individuals. Features include floor plan upload and annotation, Vastu zone analysis, AI-assisted consultation, and project management tools.</p>
          <p>We reserve the right to modify, suspend, or discontinue any part of the Platform at any time with reasonable notice. We are not liable for any modification, suspension, or discontinuation.</p>
        </Section>

        <Section title="3. Accounts">
          <Subsection title="3.1 Registration">
            <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account.</p>
          </Subsection>
          <Subsection title="3.2 Account Security">
            <p>You agree to notify us immediately at <a href="mailto:astraavastu@gmail.com" style={{ color: T.gold2 }}>astraavastu@gmail.com</a> if you suspect unauthorized access to your account. We are not liable for any loss or damage arising from unauthorized use of your account.</p>
          </Subsection>
          <Subsection title="3.3 One Account Per User">
            <p>Each account is for individual use only. You may not share your account credentials with others or allow others to access your account.</p>
          </Subsection>
        </Section>

        <Section title="4. Subscriptions and Billing">
          <Subsection title="4.1 Subscription Plans">
            <p>We offer subscription plans as described on our <Link href="/pricing" style={{ color: T.gold2 }}>Pricing page</Link>. Plan features and pricing may change at any time.</p>
          </Subsection>
          <Subsection title="4.2 Billing">
            <p>Subscription fees are billed in advance on a recurring basis (monthly or annually, depending on your selected plan). All payments are processed by Razorpay. By subscribing, you authorize Razorpay to charge your selected payment method on a recurring basis.</p>
          </Subsection>
          <Subsection title="4.3 Taxes">
            <p>Prices displayed are exclusive of applicable taxes unless stated otherwise. You are responsible for any taxes, duties, or levies applicable in your jurisdiction.</p>
          </Subsection>
          <Subsection title="4.4 Price Changes">
            <p>We may change subscription pricing at any time. Continued use of the Platform after a price change constitutes your acceptance of the new price.</p>
          </Subsection>
          <Subsection title="4.5 Free Tier">
            <p>We may offer a free tier with limited features. We reserve the right to modify or discontinue the free tier at any time.</p>
          </Subsection>
        </Section>

        <Section title="5. Cancellation and Refunds">
          <p>Please refer to our <Link href="/refund" style={{ color: T.gold2 }}>Refund and Cancellation Policy</Link> for full details. In summary: subscriptions may be cancelled at any time. No refunds are issued for subscription fees paid. Access continues until the end of the current billing period.</p>
        </Section>

        <Section title="6. Acceptable Use">
          <p>You agree not to:</p>
          <ol type="a">
            <li>Use the Platform for any unlawful purpose or in violation of any applicable law or regulation</li>
            <li>Upload, transmit, or share content that is defamatory, obscene, fraudulent, or harmful</li>
            <li>Attempt to gain unauthorized access to any part of the Platform, its servers, or any connected systems</li>
            <li>Interfere with or disrupt the integrity or performance of the Platform</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Platform</li>
            <li>Use automated tools to scrape, crawl, or extract data from the Platform without our written consent</li>
            <li>Impersonate any person or entity, or misrepresent your affiliation</li>
            <li>Resell, sublicense, or commercially exploit the Platform without our written authorization</li>
            <li>Use the AI features to generate content that is harmful, misleading, or violates any third-party rights</li>
          </ol>
          <p style={{ marginTop: "12px" }}>We reserve the right to suspend or terminate your account without notice for violations of this section.</p>
        </Section>

        <Section title="7. Intellectual Property">
          <Subsection title="7.1 Our Property">
            <p>The Platform, including its design, code, branding, AI models, Vastu analysis logic, and all content created by us, is owned by Astraa Vastu and protected by applicable intellectual property laws. You may not copy, reproduce, distribute, or create derivative works without our written permission.</p>
          </Subsection>
          <Subsection title="7.2 Your Content">
            <p>You retain ownership of all floor plans, project data, and content you upload or create on the Platform ("User Content"). By uploading User Content, you grant us a limited, non-exclusive, royalty-free license to store, process, and display your content solely for the purpose of providing the Platform to you.</p>
          </Subsection>
          <Subsection title="7.3 Feedback">
            <p>If you submit feedback, suggestions, or ideas about the Platform, you grant us an irrevocable, perpetual, royalty-free license to use them without any obligation to you.</p>
          </Subsection>
        </Section>

        <Section title="8. AI-Generated Content Disclaimer">
          <p>The Vastu AI assistant provides suggestions and analysis based on classical Vastu Shastra texts and your inputs. AI-generated content is for informational purposes only. We make no guarantee that AI responses are accurate, complete, or suitable for any specific purpose. AI suggestions do not constitute professional architectural, structural, or legal advice. You assume full responsibility for any decisions made based on AI outputs.</p>
        </Section>

        <Section title="9. Disclaimer of Warranties">
          <p style={{ textTransform: "uppercase", fontSize: "12px" }}>The Platform is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, non-infringement, or uninterrupted availability.</p>
          <p>We do not warrant that:</p>
          <ol type="a">
            <li>The Platform will be error-free or available at all times</li>
            <li>Results obtained from the Platform will be accurate or reliable</li>
            <li>The Platform will meet your specific requirements</li>
          </ol>
        </Section>

        <Section title="10. Limitation of Liability">
          <p style={{ textTransform: "uppercase", fontSize: "12px" }}>To the maximum extent permitted by applicable law, Astraa Vastu and its owners, employees, and agents shall not be liable for any: (a) indirect, incidental, special, consequential, or punitive damages; (b) loss of profits, revenue, data, or business opportunities; (c) damages arising from reliance on AI-generated Vastu analysis; (d) unauthorized access to or alteration of your data.</p>
          <p style={{ marginTop: "12px" }}>In no event shall our total liability to you exceed the amount you paid to us in the three (3) months preceding the claim.</p>
        </Section>

        <Section title="11. Indemnification">
          <p>You agree to indemnify, defend, and hold harmless Astraa Vastu and its owners, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of:</p>
          <ol type="a">
            <li>Your use of the Platform</li>
            <li>Your violation of these Terms</li>
            <li>Your User Content</li>
            <li>Your violation of any third-party rights</li>
          </ol>
        </Section>

        <Section title="12. Termination">
          <Subsection title="12.1 By You">
            <p>You may terminate your account at any time by emailing <a href="mailto:astraavastu@gmail.com" style={{ color: T.gold2 }}>astraavastu@gmail.com</a> or using account deletion in settings.</p>
          </Subsection>
          <Subsection title="12.2 By Us">
            <p>We may suspend or terminate your account at any time if we believe you have violated these Terms, engaged in fraudulent activity, or for any other reason at our sole discretion. We will attempt to provide reasonable notice where possible.</p>
          </Subsection>
          <Subsection title="12.3 Effect of Termination">
            <p>Upon termination, your right to use the Platform ceases immediately. Sections 7, 9, 10, 11, and 13 survive termination.</p>
          </Subsection>
        </Section>

        <Section title="13. Governing Law and Disputes">
          <p>These Terms are governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any dispute arising out of or relating to these Terms or the Platform shall be subject to the exclusive jurisdiction of courts of competent jurisdiction in India.</p>
        </Section>

        <Section title="14. Changes to Terms">
          <p>We reserve the right to modify these Terms at any time. We will notify you of material changes by email or prominent notice on the Platform at least 7 days before the change takes effect. Your continued use of the Platform after the effective date constitutes acceptance of the revised Terms.</p>
        </Section>

        <Section title="15. Miscellaneous">
          <ul>
            <li><strong>Entire Agreement:</strong> These Terms, together with the Privacy Policy and Refund Policy, constitute the entire agreement between you and Astraa Vastu regarding the Platform</li>
            <li><strong>Severability:</strong> If any provision of these Terms is found unenforceable, the remaining provisions continue in full force</li>
            <li><strong>No Waiver:</strong> Our failure to enforce any right under these Terms does not constitute a waiver of that right</li>
            <li><strong>Assignment:</strong> You may not assign your rights under these Terms. We may assign ours without restriction</li>
          </ul>
        </Section>

        <Section title="16. Contact">
          <p>For questions about these Terms:</p>
          <p style={{ marginTop: "8px" }}>
            Email: <a href="mailto:astraavastu@gmail.com" style={{ color: T.gold2 }}>astraavastu@gmail.com</a><br />
            Website: <a href="https://astraavastu.com" style={{ color: T.gold2 }}>astraavastu.com</a>
          </p>
        </Section>

        {/* Footer links */}
        <div style={{ marginTop: "60px", paddingTop: "24px", borderTop: `1px solid ${T.border}`, display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <Link href="/privacy" style={{ fontSize: "11px", color: T.text3, textDecoration: "none" }}>Privacy Policy</Link>
          <Link href="/terms" style={{ fontSize: "11px", color: T.gold2, textDecoration: "none", fontWeight: 600 }}>Terms &amp; Conditions</Link>
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
