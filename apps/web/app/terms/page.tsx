export default function TermsPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>

        <div style={{ marginBottom: 48 }}>
          <a href="/" style={{ color: "#FF4500", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← FlexMatches</a>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 48 }}>Last updated: March 21, 2026</p>

        <Section title="1. Acceptance of Terms">
          By accessing or using FlexMatches ("Service") at <strong>www.flexmatches.com</strong>, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
          <br /><br />
          We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance.
        </Section>

        <Section title="2. Eligibility">
          You must be at least <strong>18 years old</strong> to use FlexMatches. By using the Service, you represent and warrant that you meet this requirement. We reserve the right to terminate accounts of users who misrepresent their age.
        </Section>

        <Section title="3. Account Registration">
          <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li>You must provide accurate and complete information when creating your account</li>
            <li>You are responsible for maintaining the confidentiality of your password</li>
            <li>You are responsible for all activity that occurs under your account</li>
            <li>You may not create more than one account or create an account on behalf of another person without their permission</li>
            <li>You must notify us immediately of any unauthorized use of your account</li>
          </ul>
        </Section>

        <Section title="4. Acceptable Use">
          You agree <strong>not</strong> to:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
            <li>Post false, misleading, or deceptive content</li>
            <li>Harass, bully, threaten, or intimidate other users</li>
            <li>Share inappropriate, offensive, or explicit content</li>
            <li>Impersonate another person or entity</li>
            <li>Use the Service for any commercial purpose without our consent</li>
            <li>Attempt to access other users' accounts or private data</li>
            <li>Scrape, crawl, or use automated tools to access the Service</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>
          <br />
          Violation of these rules may result in immediate account suspension or termination.
        </Section>

        <Section title="5. User Content">
          You retain ownership of content you post on FlexMatches (photos, bio, messages). By posting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content solely for the purpose of operating the Service.
          <br /><br />
          You are solely responsible for the content you post. We do not endorse any user content and are not liable for it.
        </Section>

        <Section title="6. Pro Subscription and Payments">
          <strong>Free Plan:</strong> Basic features available at no cost.
          <br /><br />
          <strong>Pro Plan:</strong> Premium features available for a monthly ($7.99/mo) or yearly ($4.99/mo billed annually) subscription fee.
          <br /><br />
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
            <li>Payments are processed securely by Stripe</li>
            <li>Subscriptions automatically renew unless cancelled</li>
            <li>You may cancel at any time; access continues until the end of the billing period</li>
            <li>Refunds are handled on a case-by-case basis — contact <strong>support@flexmatches.com</strong></li>
            <li>Prices may change with 30 days notice</li>
          </ul>
        </Section>

        <Section title="7. Safety and Meeting Other Users">
          FlexMatches connects people for fitness activities. We are not responsible for the actions of users you meet through our platform. Please exercise caution when meeting anyone in person:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
            <li>Meet in public places for initial meetings</li>
            <li>Tell a friend or family member where you are going</li>
            <li>Trust your instincts — if something feels wrong, leave</li>
          </ul>
          <br />
          Report any suspicious behavior using the in-app report feature.
        </Section>

        <Section title="8. Intellectual Property">
          All content, features, and functionality of FlexMatches (including but not limited to design, logos, text, and code) are owned by FlexMatches and protected by intellectual property laws. You may not copy, reproduce, or distribute any part of the Service without our express written permission.
        </Section>

        <Section title="9. Disclaimers">
          FlexMatches is provided "as is" without warranties of any kind. We do not guarantee:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
            <li>That the Service will be uninterrupted or error-free</li>
            <li>That matches or connections will be successful</li>
            <li>The accuracy of any user-provided information</li>
            <li>Fitness or health outcomes from using the app</li>
          </ul>
        </Section>

        <Section title="10. Limitation of Liability">
          To the fullest extent permitted by law, FlexMatches shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to personal injury, property damage, or loss of data.
        </Section>

        <Section title="11. Termination">
          We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason at our discretion. You may delete your account at any time through the app settings.
          <br /><br />
          Upon termination, your right to use the Service ceases immediately. Sections that by their nature should survive termination will remain in effect.
        </Section>

        <Section title="12. Governing Law">
          These Terms are governed by and construed in accordance with applicable laws. Any disputes arising from these Terms or use of the Service shall be resolved through good-faith negotiation, and if unresolved, through binding arbitration.
        </Section>

        <Section title="13. Contact Us">
          For questions about these Terms of Service, please contact:
          <br /><br />
          <strong>FlexMatches</strong><br />
          Email: <strong>legal@flexmatches.com</strong><br />
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
