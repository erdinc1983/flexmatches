export default function PrivacyPolicyPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>

        <div style={{ marginBottom: 48 }}>
          <a href="/" style={{ color: "#FF4500", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← FlexMatches</a>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 48 }}>Last updated: March 21, 2026</p>

        <Section title="1. Introduction">
          FlexMatches ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application and services at <strong>www.flexmatches.com</strong>.
          <br /><br />
          By using FlexMatches, you agree to the collection and use of information in accordance with this policy.
        </Section>

        <Section title="2. Information We Collect">
          <strong>Information you provide directly:</strong>
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
            <li>Account information (name, email address, username, password)</li>
            <li>Profile information (age, gender, location, sports preferences, fitness goals)</li>
            <li>Profile photos and bio</li>
            <li>Health and fitness data (workout logs, body measurements, goals)</li>
            <li>Messages and communications with other users</li>
            <li>Payment information (processed securely by Stripe — we do not store card details)</li>
          </ul>
          <br />
          <strong>Information collected automatically:</strong>
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
            <li>Device information (browser type, operating system)</li>
            <li>Usage data (pages visited, features used, time spent)</li>
            <li>Location data (approximate location for nearby user discovery, only when permitted)</li>
            <li>Log data (IP address, access times, referring URLs)</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          We use the information we collect to:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
            <li>Create and manage your account</li>
            <li>Match you with compatible fitness partners nearby</li>
            <li>Facilitate communication between matched users</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send push notifications about matches, messages, and activity</li>
            <li>Improve our services and develop new features</li>
            <li>Ensure safety and prevent fraud or abuse</li>
            <li>Comply with legal obligations</li>
          </ul>
        </Section>

        <Section title="4. Sharing Your Information">
          We do <strong>not</strong> sell your personal information. We may share your information with:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
            <li><strong>Other users:</strong> Profile information you choose to make visible (name, photo, sports, bio) is shown to potential matches</li>
            <li><strong>Service providers:</strong> Supabase (database & auth), Stripe (payments), Vercel (hosting) — bound by data processing agreements</li>
            <li><strong>Legal authorities:</strong> When required by law or to protect the safety of our users</li>
          </ul>
        </Section>

        <Section title="5. Data Storage and Security">
          Your data is stored on secure servers provided by Supabase (hosted on AWS). We implement industry-standard security measures including:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
            <li>Encrypted data transmission (HTTPS/TLS)</li>
            <li>Row-level security policies on all database tables</li>
            <li>Optional two-factor authentication (2FA) for your account</li>
            <li>Passwords are hashed and never stored in plain text</li>
          </ul>
          <br />
          No method of transmission over the internet is 100% secure. We strive to protect your data but cannot guarantee absolute security.
        </Section>

        <Section title="6. Your Rights">
          You have the right to:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information via your profile settings</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
            <li><strong>Portability:</strong> Request your data in a portable format</li>
            <li><strong>Opt-out:</strong> Disable push notifications at any time in app settings</li>
          </ul>
          <br />
          To exercise these rights, contact us at <strong>privacy@flexmatches.com</strong>.
        </Section>

        <Section title="7. Data Retention">
          We retain your personal data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or compliance purposes.
        </Section>

        <Section title="8. Children's Privacy">
          FlexMatches is not intended for users under the age of 18. We do not knowingly collect personal information from minors. If we become aware that a minor has provided us with personal information, we will delete it promptly.
        </Section>

        <Section title="9. Third-Party Links">
          Our app may contain links to third-party websites (e.g., affiliate store products). We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies.
        </Section>

        <Section title="10. Cookies">
          We use essential cookies and local storage to maintain your session and preferences. We do not use tracking or advertising cookies.
        </Section>

        <Section title="11. Changes to This Policy">
          We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date. Continued use of the app after changes constitutes acceptance of the updated policy.
        </Section>

        <Section title="12. Contact Us">
          If you have questions about this Privacy Policy, please contact us:
          <br /><br />
          <strong>FlexMatches</strong><br />
          Email: <strong>privacy@flexmatches.com</strong><br />
          Website: <strong>www.flexmatches.com</strong>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 12 }}>{title}</h2>
      <div style={{ color: "#aaa", lineHeight: 1.8, fontSize: 15 }}>{children}</div>
      <div style={{ height: 1, background: "#1a1a1a", marginTop: 40 }} />
    </div>
  );
}
