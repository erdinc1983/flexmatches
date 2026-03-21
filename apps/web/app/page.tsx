export default function Home() {
  return (
    <main style={{ fontFamily: "var(--font-geist-sans), sans-serif", background: "var(--bg-page)", minHeight: "100vh", color: "var(--text-primary)", overflowX: "hidden" }}>

      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", position: "sticky", top: 0, zIndex: 100, background: "rgba(10,10,10,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
          💪 FlexMatches
        </span>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="/login" style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Sign In</a>
          <a href="/register" style={{ background: "var(--accent)", color: "var(--text-primary)", padding: "10px 24px", borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Join Beta
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", padding: "80px 24px 60px", textAlign: "center", background: "linear-gradient(180deg, #0A0A0A 0%, #110800 100%)" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 400, background: "radial-gradient(circle, rgba(255,69,0,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ display: "inline-block", background: "var(--bg-card-alt)", border: "1px solid var(--accent)", borderRadius: 999, padding: "6px 16px", fontSize: 13, color: "var(--accent)", marginBottom: 32 }}>
          🚀 Early Access Beta — Join Free
        </div>
        <h1 style={{ fontSize: "clamp(38px, 6vw, 72px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, marginBottom: 24 }}>
          Find a reliable{" "}
          <span style={{ color: "var(--accent)" }}>gym partner</span>
          <br />
          near you
        </h1>
        <p style={{ fontSize: 19, color: "var(--text-muted)", maxWidth: 540, margin: "0 auto 48px", lineHeight: 1.65 }}>
          Match by workout style, fitness level, schedule, and goals — then chat and plan sessions in one place. No more training alone.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 80 }}>
          <a
            href="/register"
            style={{ background: "var(--accent)", color: "var(--text-primary)", padding: "16px 40px", borderRadius: 16, fontWeight: 800, fontSize: 17, textDecoration: "none", boxShadow: "0 8px 32px rgba(255,69,0,0.4)" }}
          >
            Join the Beta — Free
          </a>
          <a
            href="/login"
            style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)", padding: "16px 40px", borderRadius: 16, fontWeight: 600, fontSize: 17, textDecoration: "none" }}
          >
            Sign In
          </a>
        </div>

        {/* Phone Mockups Row */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", perspective: 1000 }}>
          {/* Phone 1 - Discover */}
          <div style={{ width: 200, background: "var(--bg-card)", borderRadius: 36, border: "2px solid var(--border)", padding: 12, transform: "rotate(-5deg) translateY(20px)", boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ background: "var(--bg-card-alt)", borderRadius: 24, padding: 16, minHeight: 320 }}>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 12, textAlign: "left" }}>Discover</div>
              <div style={{ background: "linear-gradient(135deg, #FF4500, #ff6a33)", borderRadius: 16, padding: 16, marginBottom: 10 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🏋️</div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Alex K.</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>Powerlifting • Istanbul</div>
              </div>
              <div style={{ background: "var(--bg-elevated)", borderRadius: 12, padding: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🤸</div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>Sara M.</div>
                <div style={{ fontSize: 10, color: "var(--text-faint)" }}>CrossFit • Kadıköy</div>
              </div>
              <div style={{ background: "var(--accent)", borderRadius: 10, padding: "8px 0", textAlign: "center", fontSize: 12, fontWeight: 700 }}>
                Connect
              </div>
            </div>
          </div>

          {/* Phone 2 - Main (center, bigger) */}
          <div style={{ width: 220, background: "var(--bg-card)", borderRadius: 40, border: "2px solid var(--accent)", padding: 14, transform: "translateY(0px)", boxShadow: "0 50px 100px rgba(255,69,0,0.3)", zIndex: 2 }}>
            <div style={{ background: "var(--bg-card-alt)", borderRadius: 28, padding: 18, minHeight: 360 }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 32 }}>💪</div>
                <div style={{ fontWeight: 900, fontSize: 16, color: "var(--accent)" }}>FlexMatches</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Find your gym partner</div>
              </div>
              <div style={{ background: "linear-gradient(135deg, #1a1a1a, #252525)", borderRadius: 16, padding: 14, marginBottom: 12, border: "1px solid var(--border-medium)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 24 }}>🏃</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Match Found!</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Running • 2km away</div>
                  </div>
                </div>
                <div style={{ background: "var(--accent)", borderRadius: 8, padding: "6px 0", textAlign: "center", fontSize: 11, fontWeight: 700 }}>Accept</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ background: "var(--bg-elevated)", borderRadius: 12, padding: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 18 }}>🎯</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Goals</div>
                </div>
                <div style={{ background: "var(--bg-elevated)", borderRadius: 12, padding: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 18 }}>💬</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Chat</div>
                </div>
              </div>
            </div>
          </div>

          {/* Phone 3 - Chat */}
          <div style={{ width: 200, background: "var(--bg-card)", borderRadius: 36, border: "2px solid var(--border)", padding: 12, transform: "rotate(5deg) translateY(20px)", boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ background: "var(--bg-card-alt)", borderRadius: 24, padding: 16, minHeight: 320 }}>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 12, textAlign: "left" }}>Messages</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
                  <div style={{ background: "var(--bg-elevated)", borderRadius: "12px 12px 12px 0", padding: "8px 12px", fontSize: 11, maxWidth: 130 }}>Hey! Ready for leg day?</div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 8 }}>
                  <div style={{ background: "var(--accent)", borderRadius: "12px 12px 0 12px", padding: "8px 12px", fontSize: 11, maxWidth: 130 }}>Absolutely! 6pm works?</div>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
                  <div style={{ background: "var(--bg-elevated)", borderRadius: "12px 12px 12px 0", padding: "8px 12px", fontSize: 11, maxWidth: 130 }}>Perfect, see you there 🔥</div>
                </div>
              </div>
              <div style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Message...</span>
                <span style={{ fontSize: 16 }}>➤</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Stats Bar */}
      <section style={{ padding: "28px 24px", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--bg-page)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
          {[
            { number: "1,200+", label: "Beta Users" },
            { number: "18", label: "Cities" },
            { number: "3,400+", label: "Matches Made" },
            { number: "4.8★", label: "Avg Rating" },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "var(--accent)", letterSpacing: -1 }}>{stat.number}</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "80px 24px", borderTop: "1px solid var(--border)", background: "var(--bg-page)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: 1.5, marginBottom: 16 }}>HOW IT WORKS</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, marginBottom: 56, letterSpacing: -1 }}>
            From signup to first session in minutes
          </h2>
          <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { step: "01", emoji: "📋", title: "Build your profile", desc: "Set your sport, fitness level, schedule, and goals. Takes 2 minutes." },
              { step: "02", emoji: "🎯", title: "Get matched", desc: "We surface partners who fit your level, availability, and location — no swiping through irrelevant people." },
              { step: "03", emoji: "💬", title: "Chat & plan", desc: "Message your match directly, agree on a time, and show up. It's that simple." },
            ].map((item) => (
              <div key={item.step} style={{ flex: 1, minWidth: 200, maxWidth: 240, textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", letterSpacing: 1, marginBottom: 12 }}>{item.step}</div>
                <div style={{ fontSize: 40, marginBottom: 14 }}>{item.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 10 }}>{item.title}</div>
                <div style={{ color: "var(--text-faint)", fontSize: 14, lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features with phone mockups */}
      <section id="features" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: 42, fontWeight: 900, textAlign: "center", marginBottom: 16, letterSpacing: -1 }}>
          Everything you need to{" "}
          <span style={{ color: "var(--accent)" }}>train together</span>
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 16, marginBottom: 64 }}>
          Built for people who know that showing up is easier when someone is counting on you.
        </p>

        {/* Feature rows with phone mockups */}
        <div style={{ display: "flex", flexDirection: "column", gap: 80 }}>

          {/* Feature 1 - Discover */}
          <div style={{ display: "flex", alignItems: "center", gap: 60, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
              <h3 style={{ fontSize: 30, fontWeight: 800, marginBottom: 16, letterSpacing: -0.5 }}>Smart matching,<br /><span style={{ color: "var(--accent)" }}>not random browsing</span></h3>
              <p style={{ color: "var(--text-muted)", lineHeight: 1.7, fontSize: 16, marginBottom: 24 }}>
                We match you on fitness level, preferred sport, weekly availability, and proximity — so you spend less time searching and more time training.
              </p>
              <a href="/register" style={{ background: "var(--accent)", color: "var(--text-primary)", padding: "12px 28px", borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
                Find Partners →
              </a>
            </div>
            <div style={{ flex: 1, minWidth: 200, display: "flex", justifyContent: "center" }}>
              <div style={{ width: 220, background: "var(--bg-card)", borderRadius: 36, border: "2px solid var(--border)", padding: 14, boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
                <div style={{ background: "var(--bg-card-alt)", borderRadius: 24, padding: 16, minHeight: 300 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 16 }}>Discover</div>
                  {[
                    { emoji: "🏋️", name: "Alex K.", sport: "Powerlifting", city: "Istanbul" },
                    { emoji: "🤸", name: "Sara M.", sport: "CrossFit", city: "Kadıköy" },
                    { emoji: "🏃", name: "Mert A.", sport: "Running", city: "Beşiktaş" },
                  ].map((u, i) => (
                    <div key={u.name} style={{ background: i === 0 ? "var(--accent)" : "var(--bg-elevated)", borderRadius: 12, padding: 10, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 22 }}>{u.emoji}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</div>
                        <div style={{ fontSize: 10, color: i === 0 ? "rgba(255,255,255,0.8)" : "var(--text-faint)" }}>{u.sport} • {u.city}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 - Chat */}
          <div style={{ display: "flex", alignItems: "center", gap: 60, flexWrap: "wrap-reverse" }}>
            <div style={{ flex: 1, minWidth: 200, display: "flex", justifyContent: "center" }}>
              <div style={{ width: 220, background: "var(--bg-card)", borderRadius: 36, border: "2px solid var(--border)", padding: 14, boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
                <div style={{ background: "var(--bg-card-alt)", borderRadius: 24, padding: 16, minHeight: 300 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 16 }}>💬 Chat</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ background: "var(--bg-elevated)", borderRadius: "12px 12px 12px 0", padding: "8px 12px", fontSize: 12, alignSelf: "flex-start" }}>
                      Hey! Ready for leg day? 🏋️
                    </div>
                    <div style={{ background: "var(--accent)", borderRadius: "12px 12px 0 12px", padding: "8px 12px", fontSize: 12, alignSelf: "flex-end" }}>
                      Absolutely! 6pm?
                    </div>
                    <div style={{ background: "var(--bg-elevated)", borderRadius: "12px 12px 12px 0", padding: "8px 12px", fontSize: 12, alignSelf: "flex-start" }}>
                      Perfect 🔥 See you there!
                    </div>
                    <div style={{ background: "var(--accent)", borderRadius: "12px 12px 0 12px", padding: "8px 12px", fontSize: 12, alignSelf: "flex-end" }}>
                      Let&apos;s go! 💪
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
              <h3 style={{ fontSize: 30, fontWeight: 800, marginBottom: 16, letterSpacing: -0.5 }}>Plan sessions<br /><span style={{ color: "var(--accent)" }}>without leaving the app</span></h3>
              <p style={{ color: "var(--text-muted)", lineHeight: 1.7, fontSize: 16, marginBottom: 24 }}>
                Message your match directly. Agree on a time, pick a gym, coordinate — all in the same place you found each other.
              </p>
              <a href="/register" style={{ background: "var(--accent)", color: "var(--text-primary)", padding: "12px 28px", borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
                Start Chatting →
              </a>
            </div>
          </div>

          {/* Feature 3 - Challenges */}
          <div style={{ display: "flex", alignItems: "center", gap: 60, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
              <h3 style={{ fontSize: 30, fontWeight: 800, marginBottom: 16, letterSpacing: -0.5 }}>Goals &<br /><span style={{ color: "var(--accent)" }}>accountability</span></h3>
              <p style={{ color: "var(--text-muted)", lineHeight: 1.7, fontSize: 16, marginBottom: 24 }}>
                Set personal goals, join community challenges, and track streaks alongside your partners. Accountability is built in, not bolted on.
              </p>
              <a href="/register" style={{ background: "var(--accent)", color: "var(--text-primary)", padding: "12px 28px", borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
                Join a Challenge →
              </a>
            </div>
            <div style={{ flex: 1, minWidth: 200, display: "flex", justifyContent: "center" }}>
              <div style={{ width: 220, background: "var(--bg-card)", borderRadius: 36, border: "2px solid var(--border)", padding: 14, boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
                <div style={{ background: "var(--bg-card-alt)", borderRadius: 24, padding: 16, minHeight: 300 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 16 }}>🏆 Challenges</div>
                  {[
                    { emoji: "🔥", title: "30-Day Streak", progress: 80, label: "24/30 days" },
                    { emoji: "🏃", title: "100km Run", progress: 55, label: "55km done" },
                    { emoji: "💪", title: "10 Matches", progress: 40, label: "4/10" },
                  ].map((c) => (
                    <div key={c.title} style={{ background: "var(--bg-elevated)", borderRadius: 12, padding: 10, marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span>{c.emoji}</span>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{c.title}</span>
                      </div>
                      <div style={{ background: "#333", borderRadius: 99, height: 4, marginBottom: 4 }}>
                        <div style={{ background: "var(--accent)", width: `${c.progress}%`, height: 4, borderRadius: 99 }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{c.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: "80px 24px", borderTop: "1px solid var(--border)", background: "var(--bg-page)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: 1.5, marginBottom: 16, textAlign: "center" }}>BETA USERS</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 900, marginBottom: 52, letterSpacing: -1, textAlign: "center" }}>
            Real people, real training partners
          </h2>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              {
                quote: "Found my powerlifting partner within 2 days. We train 4x a week now — best decision I made since joining a gym.",
                name: "Alex K.",
                role: "Powerlifter · Istanbul",
                emoji: "🏋️",
              },
              {
                quote: "I moved to a new city and knew no one. FlexMatches got me a running group within a week. The schedule matching is scary accurate.",
                name: "Sara M.",
                role: "Runner · Ankara",
                emoji: "🏃‍♀️",
              },
              {
                quote: "Unlike Tinder for gym (lol), it actually filters by fitness level. No more carrying someone who shows up unprepared.",
                name: "Mert A.",
                role: "CrossFit · İzmir",
                emoji: "🤸",
              },
            ].map((t) => (
              <div key={t.name} style={{ flex: 1, minWidth: 260, maxWidth: 300, background: "var(--bg-card)", borderRadius: 20, padding: 28, border: "1px solid #1e1e1e", display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ fontSize: 36 }}>{t.emoji}</div>
                <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section style={{ padding: "80px 24px", background: "var(--bg-page)", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: 1.5, marginBottom: 16 }}>SAFETY & PRIVACY</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 900, marginBottom: 16, letterSpacing: -1 }}>
            Built to feel safe from day one
          </h2>
          <p style={{ color: "var(--text-faint)", fontSize: 15, marginBottom: 52, maxWidth: 540, margin: "0 auto 52px" }}>
            Meeting someone new at a gym takes trust. Here is how we protect you.
          </p>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { emoji: "🔒", title: "Location privacy", desc: "We show area proximity only, never your exact address. You control what is visible on your profile." },
              { emoji: "🚫", title: "Block & report", desc: "Instantly block or report any user. Our moderation team reviews reports and acts quickly." },
              { emoji: "👁️", title: "Privacy controls", desc: "Hide your age, city, or weight from your public profile. You decide what others see." },
              { emoji: "💬", title: "Chat before meeting", desc: "All connections start in-app chat. You choose when and whether to meet in person." },
            ].map((item) => (
              <div key={item.title} style={{ flex: 1, minWidth: 180, maxWidth: 210, background: "var(--bg-card)", borderRadius: 16, padding: 20, border: "1px solid var(--border)", textAlign: "left" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{item.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{item.title}</div>
                <div style={{ color: "var(--text-faint)", fontSize: 13, lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section style={{ padding: "80px 24px", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: 1.5, marginBottom: 16 }}>WHO IT&apos;S FOR</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 900, marginBottom: 48, letterSpacing: -1 }}>
            FlexMatches is for you if...
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left", maxWidth: 560, margin: "0 auto" }}>
            {[
              "You just moved to a new city and don't have a gym crew yet",
              "You want a training partner who actually matches your schedule",
              "You're at an intermediate level and tired of waiting for beginners",
              "You want accountability that WhatsApp groups can't give you",
              "You prefer planning sessions in advance rather than hoping someone shows up",
            ].map((text) => (
              <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: "#FF450022", border: "1px solid var(--accent-faint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <span style={{ color: "var(--accent)", fontSize: 13, fontWeight: 800 }}>✓</span>
                </div>
                <span style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "80px 24px", borderTop: "1px solid var(--border)", background: "var(--bg-page)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: 1.5, marginBottom: 16, textAlign: "center" }}>FAQ</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 900, marginBottom: 48, letterSpacing: -1, textAlign: "center" }}>
            Common questions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              {
                q: "Is it free to use?",
                a: "Yes — the core app is free. A Pro plan with premium features (unlimited matches, advanced filters, priority support) is coming soon.",
              },
              {
                q: "How does the matching algorithm work?",
                a: "We score potential partners on shared sports (30 pts), same fitness level (20 pts), same city (25 pts), and schedule overlap. The highest scores appear first.",
              },
              {
                q: "Can I use it without revealing my location?",
                a: "Absolutely. We only show your city, never your exact location. You can hide your city entirely in privacy settings.",
              },
              {
                q: "What sports are supported?",
                a: "Running, CrossFit, Powerlifting, Calisthenics, Swimming, Cycling, HIIT, Yoga, Boxing, Basketball, Football, Tennis — and more being added.",
              },
              {
                q: "Is it only for gym partners?",
                a: "It started there, but FlexMatches works for any physical activity — outdoor sports, team sports, group classes. If it gets you moving, it fits.",
              },
              {
                q: "What if someone is inappropriate?",
                a: "Every user can be reported and blocked. Our moderation team reviews all reports. Repeat offenders are permanently banned.",
              },
            ].map((item, i) => (
              <details key={i} style={{ background: "var(--bg-card)", borderRadius: 14, padding: "20px 24px", border: "1px solid #1e1e1e", cursor: "pointer" }}>
                <summary style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {item.q}
                  <span style={{ color: "var(--accent)", fontSize: 20, lineHeight: 1 }}>+</span>
                </summary>
                <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7, marginTop: 12, marginBottom: 0 }}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: "center", padding: "100px 24px", background: "linear-gradient(180deg, #0A0A0A 0%, #1a0800 100%)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 400, background: "radial-gradient(circle, rgba(255,69,0,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ fontSize: 64, marginBottom: 24 }}>💪</div>
        <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, marginBottom: 20, letterSpacing: -1 }}>
          Stop training alone.
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 18, maxWidth: 420, margin: "0 auto 16px" }}>
          Join the beta — find a gym partner near you who matches your schedule and level.
        </p>
        <p style={{ color: "var(--text-ultra-faint)", fontSize: 13, marginBottom: 40 }}>Free to join · No credit card required</p>
        <a
          href="/register"
          style={{ background: "var(--accent)", color: "var(--text-primary)", padding: "18px 52px", borderRadius: 16, fontWeight: 800, fontSize: 18, display: "inline-block", textDecoration: "none", boxShadow: "0 12px 40px rgba(255,69,0,0.5)" }}
        >
          Join the Beta Free
        </a>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "48px 24px", borderTop: "1px solid var(--border)", color: "var(--text-faint)", fontSize: 14 }}>
        <div style={{ marginBottom: 16, fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>💪 FlexMatches</div>
        <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>
          The fitness partner app built for people who train hard and show up consistently.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 24, flexWrap: "wrap" }}>
          <a href="/login" style={{ color: "var(--text-faint)", textDecoration: "none", fontSize: 13 }}>Sign In</a>
          <a href="/register" style={{ color: "var(--text-faint)", textDecoration: "none", fontSize: 13 }}>Register</a>
          <a href="/app/security" style={{ color: "var(--text-faint)", textDecoration: "none", fontSize: 13 }}>Privacy</a>
          <a href="/app/security" style={{ color: "var(--text-faint)", textDecoration: "none", fontSize: 13 }}>Terms</a>
        </div>
        <p style={{ color: "#333", fontSize: 12 }}>© 2026 FlexMatches. All rights reserved.</p>
      </footer>

    </main>
  );
}
