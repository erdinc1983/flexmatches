export default function SafetyPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>

        <div style={{ marginBottom: 48 }}>
          <a href="/" style={{ color: "#FF4500", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← FlexMatches</a>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Safety Center</h1>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 32 }}>Last updated: March 21, 2026</p>

        {/* Emergency banner */}
        <div style={{ background: "#1a0000", border: "1px solid #ef4444", borderRadius: 12, padding: "20px 24px", marginBottom: 48, display: "flex", gap: 16, alignItems: "flex-start" }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 800, color: "#ef4444", fontSize: 16, marginBottom: 6 }}>In an emergency, always call your local emergency services first.</div>
            <div style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7 }}>
              FlexMatches cannot respond to real-time emergencies. If you are in danger, call 911 (US), 999 (UK), 112 (EU), or your local equivalent immediately.
            </div>
          </div>
        </div>

        <Section title="Our Approach to Safety">
          FlexMatches connects fitness enthusiasts for workouts and training sessions. We take the safety of our community seriously. However, we want to be transparent:
          <br /><br />
          <strong>We do not conduct criminal background checks on users.</strong> Profile information on FlexMatches is self-reported and has not been independently verified. You are responsible for your own safety when interacting with anyone you meet through our platform.
          <br /><br />
          This page provides guidelines to help you stay safe. Please read them before meeting anyone from the platform in person.
        </Section>

        <Section title="Before You Meet In Person">
          <TipCard emoji="📍" title="Choose a public location">
            Always meet for the first time in a busy, public place — a gym, a park, a sports center. Never agree to meet at a private home or remote location for an initial meeting.
          </TipCard>
          <TipCard emoji="📣" title="Tell someone where you are going">
            Let a trusted friend or family member know who you are meeting, where, and when. Share your live location with them if possible.
          </TipCard>
          <TipCard emoji="🚗" title="Control your own transportation">
            Drive yourself, take public transport, or use a rideshare app. Do not depend on your match for a ride — this ensures you can leave at any time.
          </TipCard>
          <TipCard emoji="📵" title="Keep personal details private">
            Do not share your home address, workplace, daily routine, or financial information with someone you have just met online.
          </TipCard>
          <TipCard emoji="💬" title="Chat in the app first">
            Use FlexMatches messaging to get to know someone before meeting. Be cautious if someone pushes to move to other platforms or meet immediately.
          </TipCard>
          <TipCard emoji="🔎" title="Do your own research">
            Consider searching the person's name or social media profiles. Trust your instincts — if something feels off, it probably is.
          </TipCard>
        </Section>

        <Section title="During the Meeting">
          <TipCard emoji="👂" title="Trust your instincts">
            If at any point you feel uncomfortable or unsafe, leave immediately. You do not owe anyone an explanation. Your safety comes first.
          </TipCard>
          <TipCard emoji="📱" title="Keep your phone charged and accessible">
            Make sure your phone has battery and is accessible in case you need to call for help or leave.
          </TipCard>
          <TipCard emoji="🚫" title="Avoid alcohol or substances">
            Stay sober during first meetings so you can make clear-headed decisions and react quickly if needed.
          </TipCard>
          <TipCard emoji="🏟️" title="Stay in populated areas">
            Stick to gym floors, public tracks, or sports facilities — places with other people around.
          </TipCard>
        </Section>

        <Section title="Warning Signs">
          Be cautious of anyone who:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2.2 }}>
            <li>Pressures you to meet immediately or share personal information quickly</li>
            <li>Refuses to video chat or always has an excuse for why they can't</li>
            <li>Becomes aggressive or manipulative if you set boundaries</li>
            <li>Their profile photos look too professional (possible catfishing)</li>
            <li>Asks for money, gift cards, or financial help for any reason</li>
            <li>Gives inconsistent or vague information about themselves</li>
            <li>Makes you feel uncomfortable in any way — online or in person</li>
          </ul>
        </Section>

        <Section title="How to Report a User">
          If another user behaves in a way that violates our Community Guidelines or makes you feel unsafe:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
            <li><strong>In-app report:</strong> Use the report button on any profile or match</li>
            <li><strong>Block:</strong> Immediately block the user to prevent further contact</li>
            <li><strong>Email safety team:</strong> <strong>safety@flexmatches.com</strong></li>
          </ul>
          <br />
          We review all reports. Accounts that violate our guidelines are subject to permanent removal. We cooperate with law enforcement when required.
          <br /><br />
          <strong>Reports are confidential — the reported user will not know who submitted the report.</strong>
        </Section>

        <Section title="Online Safety Tips">
          <TipCard emoji="🔒" title="Use a strong, unique password">
            Never reuse your FlexMatches password on other sites. Enable two-factor authentication in Security Settings.
          </TipCard>
          <TipCard emoji="🖼️" title="Be careful what you share">
            Avoid sharing photos that reveal your home address, workplace, or other identifying locations.
          </TipCard>
          <TipCard emoji="📧" title="Watch for phishing">
            FlexMatches will never ask for your password or payment info via email or chat. Report suspicious messages immediately.
          </TipCard>
        </Section>

        <Section title="External Resources">
          If you have been a victim of a crime or need support:
          <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2.5 }}>
            <li><strong>Emergency Services:</strong> 911 (US) · 999 (UK) · 112 (EU)</li>
            <li><strong>RAINN National Sexual Assault Hotline:</strong> 1-800-656-HOPE (4673)</li>
            <li><strong>National Domestic Violence Hotline:</strong> 1-800-799-7233</li>
            <li><strong>Crisis Text Line:</strong> Text HOME to 741741</li>
          </ul>
        </Section>

        <Section title="A Note on Our Limitations">
          We want to be honest with you. FlexMatches is a technology platform — we connect people, but we cannot monitor every interaction, verify every identity, or prevent every bad actor.
          <br /><br />
          We work hard to remove bad actors through reporting and moderation, but we cannot guarantee your safety. <strong>The most important safety tool you have is your own judgment.</strong>
          <br /><br />
          By using FlexMatches, you agree to our <a href="/terms" style={{ color: "#FF4500" }}>Terms of Service</a>, including our limitation of liability for in-person meetings. Please review our Terms before arranging any in-person activity with another user.
        </Section>

        <div style={{ textAlign: "center", marginTop: 40, padding: "28px", background: "#111", borderRadius: 14, border: "1px solid #1e1e1e" }}>
          <div style={{ fontSize: 22, marginBottom: 10 }}>🛡️</div>
          <div style={{ fontWeight: 800, color: "#fff", fontSize: 18, marginBottom: 8 }}>Questions about safety?</div>
          <div style={{ color: "#888", fontSize: 14, marginBottom: 16 }}>Our safety team is here to help.</div>
          <a href="mailto:safety@flexmatches.com"
            style={{ background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, padding: "12px 28px", borderRadius: 10, textDecoration: "none", display: "inline-block" }}>
            Contact Safety Team
          </a>
        </div>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 44 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 16 }}>{title}</h2>
      <div style={{ color: "#aaa", lineHeight: 1.8, fontSize: 15 }}>{children}</div>
      <div style={{ height: 1, background: "#1a1a1a", marginTop: 44 }} />
    </div>
  );
}

function TipCard({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 18px", marginBottom: 10, display: "flex", gap: 14, alignItems: "flex-start" }}>
      <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{emoji}</span>
      <div>
        <div style={{ fontWeight: 700, color: "#e8e8e8", fontSize: 15, marginBottom: 4 }}>{title}</div>
        <div style={{ color: "#888", fontSize: 14, lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
}
