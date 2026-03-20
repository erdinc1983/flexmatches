export default function Home() {
  return (
    <main style={{ fontFamily: "var(--font-geist-sans), sans-serif", background: "#0F0F0F", minHeight: "100vh", color: "#fff" }}>

      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: "1px solid #1a1a1a" }}>
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
          💪 FlexMatches
        </span>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="/login" style={{ color: "#ccc", fontSize: 14, fontWeight: 600 }}>Sign In</a>
          <a href="/register" style={{ background: "#FF4500", color: "#fff", padding: "10px 24px", borderRadius: 12, fontWeight: 700, fontSize: 14 }}>
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "100px 24px 80px" }}>
        <div style={{ display: "inline-block", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 999, padding: "6px 16px", fontSize: 13, color: "#888", marginBottom: 32 }}>
          🚀 Now available on iOS & Android
        </div>
        <h1 style={{ fontSize: "clamp(40px, 7vw, 80px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, marginBottom: 24 }}>
          Find Your{" "}
          <span style={{ color: "#FF4500" }}>Perfect</span>
          <br />
          Fitness Partner
        </h1>
        <p style={{ fontSize: 20, color: "#888", maxWidth: 540, margin: "0 auto 48px", lineHeight: 1.6 }}>
          Connect with gym buddies, sports partners, and fitness communities near you. Train harder. Together.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/register"
            style={{ background: "#FF4500", color: "#fff", padding: "16px 36px", borderRadius: 16, fontWeight: 700, fontSize: 16 }}
          >
            Get Started — It&apos;s Free
          </a>
          <a
            href="#features"
            style={{ border: "1px solid #333", color: "#ccc", padding: "16px 36px", borderRadius: 16, fontWeight: 600, fontSize: 16 }}
          >
            See How It Works
          </a>
        </div>
      </section>

      {/* Stats */}
      <section style={{ display: "flex", justifyContent: "center", gap: 60, padding: "60px 24px", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a", flexWrap: "wrap" }}>
        {[
          { value: "50K+", label: "Active Users" },
          { value: "120+", label: "Cities" },
          { value: "15+", label: "Sports" },
          { value: "4.8★", label: "App Rating" },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#FF4500" }}>{stat.value}</div>
            <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: 42, fontWeight: 900, textAlign: "center", marginBottom: 64, letterSpacing: -1 }}>
          Everything you need to{" "}
          <span style={{ color: "#FF4500" }}>train together</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {[
            { icon: "🎯", title: "Smart Matching", desc: "Get matched with partners based on your fitness level, goals, schedule, and location." },
            { icon: "📍", title: "Local Communities", desc: "Discover sports groups, gym partners, and fitness events happening in your neighborhood." },
            { icon: "💬", title: "Built-in Chat", desc: "Message your matches, plan workouts, and share your fitness journey — all in one place." },
            { icon: "🏆", title: "Goals & Challenges", desc: "Set personal goals, join community challenges, and earn badges for your achievements." },
            { icon: "📅", title: "Event Calendar", desc: "Browse and join local fitness events, meetups, group workouts, and sports tournaments." },
            { icon: "🛒", title: "Affiliate Store", desc: "Discover curated sports gear, supplements, and equipment recommended by the community." },
          ].map((feature) => (
            <div
              key={feature.title}
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 20, padding: 32 }}
            >
              <div style={{ fontSize: 36, marginBottom: 16 }}>{feature.icon}</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{feature.title}</h3>
              <p style={{ color: "#888", lineHeight: 1.6, fontSize: 15 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: "center", padding: "100px 24px", background: "#111" }}>
        <h2 style={{ fontSize: 48, fontWeight: 900, marginBottom: 20, letterSpacing: -1 }}>
          Ready to find your{" "}
          <span style={{ color: "#FF4500" }}>flex match?</span>
        </h2>
        <p style={{ color: "#888", fontSize: 18, marginBottom: 40 }}>
          Join thousands of fitness enthusiasts already using FlexMatches.
        </p>
        <a
          href="/register"
          style={{ background: "#FF4500", color: "#fff", padding: "18px 48px", borderRadius: 16, fontWeight: 800, fontSize: 18, display: "inline-block" }}
        >
          Get Started Free
        </a>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "40px 24px", borderTop: "1px solid #1a1a1a", color: "#555", fontSize: 14 }}>
        <div style={{ marginBottom: 12, fontSize: 18, fontWeight: 800, color: "#fff" }}>💪 FlexMatches</div>
        <p>© 2025 FlexMatches. All rights reserved.</p>
      </footer>

    </main>
  );
}
