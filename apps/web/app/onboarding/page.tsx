"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { awardBadge } from "../../lib/badges";

/* ─── Constants ─────────────────────────────────────────────────── */
const SPORTS_LIST = [
  { label: "Gym", emoji: "🏋️" }, { label: "Running", emoji: "🏃" },
  { label: "Cycling", emoji: "🚴" }, { label: "Swimming", emoji: "🏊" },
  { label: "Soccer", emoji: "⚽" }, { label: "Football", emoji: "🏈" },
  { label: "Basketball", emoji: "🏀" }, { label: "Tennis", emoji: "🎾" },
  { label: "Boxing", emoji: "🥊" }, { label: "Yoga", emoji: "🧘" },
  { label: "CrossFit", emoji: "💪" }, { label: "Pilates", emoji: "🎯" },
  { label: "Hiking", emoji: "🏔️" }, { label: "Rowing", emoji: "🚣" },
  { label: "Dancing", emoji: "💃" }, { label: "HIIT", emoji: "⚡" },
  { label: "Other", emoji: "🏅" },
];

const FITNESS_LEVELS = [
  { value: "beginner", label: "Beginner", desc: "Just getting started", emoji: "🌱" },
  { value: "intermediate", label: "Intermediate", desc: "Training regularly", emoji: "🔥" },
  { value: "advanced", label: "Advanced", desc: "Competing or coaching", emoji: "🏆" },
];

const GOALS = [
  { value: "gym_buddy", label: "Gym Buddy", desc: "Someone to train with daily", emoji: "🤝" },
  { value: "accountability", label: "Accountability Partner", desc: "Keep each other on track", emoji: "🎯" },
  { value: "sports_team", label: "Sports Team", desc: "Find teammates for matches", emoji: "⚽" },
  { value: "running_partner", label: "Running Partner", desc: "Morning runs & races", emoji: "🏃" },
  { value: "lifestyle", label: "Healthy Lifestyle", desc: "General wellness & habits", emoji: "🌿" },
  { value: "competition", label: "Competition Prep", desc: "Training for an event", emoji: "🏅" },
];

const TIME_OPTIONS = [
  { value: "morning", label: "Morning", sub: "06:00 – 12:00", emoji: "🌅" },
  { value: "afternoon", label: "Afternoon", sub: "12:00 – 17:00", emoji: "☀️" },
  { value: "evening", label: "Evening", sub: "17:00 – 23:00", emoji: "🌙" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Marketing",
  "Law", "Engineering", "Design", "Sales", "Consulting", "Media",
  "Real Estate", "Retail", "Government", "Other",
];

// Intro slides: -2, -1, 0 → then profile steps 1-6
const INTRO_SLIDES = [
  {
    tagline: "Find your perfect\ngym partner.",
    sub: "Match with people who train when you train, do what you do.",
    mockup: "discover",
  },
  {
    tagline: "Chat, plan,\ntrain together.",
    sub: "Message your matches and lock in a session. No excuses.",
    mockup: "chat",
  },
  {
    tagline: "Track goals &\nbuild streaks.",
    sub: "Stay accountable with habits, check-ins, and badges.",
    mockup: "stats",
  },
];

const PROFILE_STEPS = 6;
const TOTAL_DOTS = INTRO_SLIDES.length + PROFILE_STEPS; // 9 total

/* ─── Phone mockup shell ─────────────────────────────────────────── */
function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 230, height: 420, borderRadius: 40, background: "#111", border: "2px solid #222", boxShadow: "0 40px 100px rgba(0,0,0,0.9), 0 0 60px rgba(255,69,0,0.08)", overflow: "hidden", position: "relative", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 64, height: 20, background: "#111", borderRadius: "0 0 14px 14px", zIndex: 10 }} />
      {children}
    </div>
  );
}

function DiscoverMockup() {
  return (
    <PhoneShell>
      <div style={{ padding: "30px 14px 14px", background: "#0A0A0A", height: "100%", boxSizing: "border-box" }}>
        <div style={{ fontSize: 10, color: "#444", fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>DISCOVER</div>
        <div style={{ background: "#141414", borderRadius: 20, padding: 14, border: "1px solid #1e1e1e", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", fontSize: 16 }}>M</div>
            <div>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>Marcus R.</div>
              <div style={{ fontSize: 10, color: "#444" }}>📍 2.1 mi away</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 9, color: "#FF4500", background: "#FF450018", borderRadius: 999, padding: "3px 8px", fontWeight: 700 }}>96% match</div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {["🏋️ Gym", "🥊 Boxing"].map(t => <span key={t} style={{ fontSize: 9, color: "#FF4500", background: "#1a0800", borderRadius: 999, padding: "2px 8px", border: "1px solid #FF450030" }}>{t}</span>)}
          </div>
          <div style={{ fontSize: 10, color: "#555", lineHeight: 1.5 }}>"Looking for a morning lifting partner. I train 5×/week."</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
          <div style={{ width: 46, height: 46, borderRadius: 23, background: "#1a1a1a", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>✕</div>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: "0 6px 24px #FF450055" }}>❤️</div>
          <div style={{ width: 46, height: 46, borderRadius: 23, background: "#1a1a1a", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⭐</div>
        </div>
      </div>
    </PhoneShell>
  );
}

function ChatMockup() {
  return (
    <PhoneShell>
      <div style={{ padding: "30px 0 0", background: "#0A0A0A", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px 12px", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", fontSize: 14 }}>S</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Sara K.</div>
            <div style={{ fontSize: 10, color: "#22c55e" }}>● Online</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ alignSelf: "flex-start", background: "#1a1a1a", borderRadius: "14px 14px 14px 4px", padding: "9px 13px", maxWidth: "78%" }}>
            <div style={{ fontSize: 11, color: "#ccc", lineHeight: 1.5 }}>Hey! Want to hit the gym tomorrow morning? 7am? 💪</div>
          </div>
          <div style={{ alignSelf: "flex-end", background: "#FF4500", borderRadius: "14px 14px 4px 14px", padding: "9px 13px", maxWidth: "78%" }}>
            <div style={{ fontSize: 11, color: "#fff", lineHeight: 1.5 }}>Perfect! See you at Gold's 🔥</div>
          </div>
          <div style={{ alignSelf: "flex-start", background: "#1a1a1a", borderRadius: "14px 14px 14px 4px", padding: "9px 13px" }}>
            <div style={{ fontSize: 11, color: "#ccc" }}>It's a plan! Let's crush it 🏆</div>
          </div>
        </div>
        <div style={{ padding: "10px 12px", borderTop: "1px solid #1a1a1a", display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1, background: "#1a1a1a", borderRadius: 14, padding: "8px 12px", fontSize: 10, color: "#333" }}>Message...</div>
          <div style={{ width: 30, height: 30, borderRadius: 15, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>↑</div>
        </div>
      </div>
    </PhoneShell>
  );
}

function StatsMockup() {
  return (
    <PhoneShell>
      <div style={{ padding: "30px 14px 14px", background: "#0A0A0A", height: "100%", boxSizing: "border-box" }}>
        <div style={{ fontSize: 10, color: "#444", fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>YOUR PROGRESS</div>
        <div style={{ background: "#1a0800", borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: "1px solid #FF450025", display: "flex", justifyContent: "space-around" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#FF4500" }}>🔥 14</div>
            <div style={{ fontSize: 9, color: "#444", marginTop: 2, fontWeight: 700 }}>DAY STREAK</div>
          </div>
          <div style={{ width: 1, background: "#2a1000" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#f59e0b" }}>🏆 21</div>
            <div style={{ fontSize: 9, color: "#444", marginTop: 2, fontWeight: 700 }}>BEST</div>
          </div>
        </div>
        <div style={{ background: "#141414", borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: "1px solid #1e1e1e" }}>
          <div style={{ fontSize: 9, color: "#444", marginBottom: 8, fontWeight: 700 }}>LAST 7 DAYS</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 44 }}>
            {[3, 5, 2, 7, 4, 6, 5].map((v, i) => (
              <div key={i} style={{ flex: 1, background: i === 6 ? "#FF4500" : i === 3 ? "#FF450066" : "#2a2a2a", borderRadius: "4px 4px 0 0", height: `${(v / 7) * 100}%`, transition: "height 0.4s" }} />
            ))}
          </div>
        </div>
        <div style={{ fontSize: 9, color: "#444", fontWeight: 700, marginBottom: 8 }}>BADGES EARNED</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[{ e: "🥇", c: "#f59e0b" }, { e: "🔥", c: "#FF4500" }, { e: "💎", c: "#3b82f6" }].map((b, i) => (
            <div key={i} style={{ width: 42, height: 42, borderRadius: 12, background: "#141414", border: `1px solid ${b.c}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{b.e}</div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

const MOCKUPS = { discover: <DiscoverMockup />, chat: <ChatMockup />, stats: <StatsMockup /> };

/* ─── Main Component ─────────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  // step: -2,-1,0 = intro slides; 1-6 = profile steps
  const [step, setStep] = useState(-2);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Step 1 — Identity
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");

  // Step 2 — Looking For
  const [lookingFor, setLookingFor] = useState<string[]>([]);

  // Step 3 — Sports
  const [sports, setSports] = useState<string[]>([]);

  // Step 3 — Level + Goals
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [goal, setGoal] = useState("");

  // Step 4 — Schedule
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Record<string, boolean>>(
    Object.fromEntries(DAYS.map(d => [d, false]))
  );

  // Step 5 — Location
  const [city, setCity] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);


  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      setUsername(user.email?.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase() ?? "");
    });
  }, [router]);

  // Intercept browser back button — go to previous onboarding step instead of leaving
  useEffect(() => {
    // Push a dummy state so the back button has something to intercept
    window.history.pushState({ onboarding: true }, "");

    const handlePop = () => {
      setStep(prev => {
        if (prev > -2) {
          // Push again so next back press is also intercepted
          window.history.pushState({ onboarding: true }, "");
          return prev - 1;
        }
        // Already at first slide — let them leave
        return prev;
      });
    };

    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  function toggleLookingFor(v: string) { setLookingFor(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]); }
  function toggleSport(s: string) { setSports(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]); }
  function toggleTime(t: string) { setPreferredTimes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]); }
  function toggleDay(d: string) { setAvailability(p => ({ ...p, [d]: !p[d] })); }

  async function saveLocation() {
    if (!navigator.geolocation || !userId) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await supabase.from("users").update({ lat: pos.coords.latitude, lng: pos.coords.longitude }).eq("id", userId);
        setLocationSaved(true); setLocating(false);
      },
      () => setLocating(false)
    );
  }

  async function finish() {
    if (!userId) return;
    setSaving(true);
    const uname = (username.trim() || userId.slice(0, 6)).slice(0, 5);
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const myCode = `${uname}${rand}`.toUpperCase();

    await supabase.from("users").upsert({
      id: userId,
      username: username.trim() || userId.slice(0, 8),
      full_name: fullName.trim() || null,
      age: parseInt(age) || null,
      sports,
      fitness_level: fitnessLevel || null,
      fitness_goal: goal || null,
      preferred_times: preferredTimes,
      availability,
      city: city.trim() || null,
      looking_for: lookingFor,
      referral_code: myCode,
      onboarding_completed: true,
    });

    const refCode = localStorage.getItem("referral_code");
    if (refCode) {
      const { data: referrer } = await supabase.from("users").select("id").eq("referral_code", refCode.toUpperCase()).single();
      if (referrer && referrer.id !== userId) {
        await supabase.from("users").update({ referred_by: referrer.id }).eq("id", userId);
        await supabase.from("referrals").insert({ referrer_id: referrer.id, referred_user_id: userId });
        await awardBadge(referrer.id, "first_referral");
        await supabase.from("notifications").insert({
          user_id: referrer.id,
          title: "🎉 Your referral joined!",
          body: `${username || "Someone"} just signed up using your referral link. Keep inviting!`,
          url: "/app/referral",
        });
      }
      localStorage.removeItem("referral_code");
    }
    router.replace("/app/home");
  }

  const isIntro = step < 1;
  const slideIndex = step + 2; // step=-2 → idx=0, step=-1 → idx=1, step=0 → idx=2
  const dotIndex = isIntro ? slideIndex : INTRO_SLIDES.length + (step - 1); // 0-8

  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* INTRO SLIDES                                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isIntro && (
        <div key={step} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

          {/* Skip button */}
          <button onClick={() => setStep(1)}
            style={{ position: "absolute", top: 56, right: 24, background: "none", border: "none", color: "#333", fontSize: 14, fontWeight: 700, cursor: "pointer", zIndex: 20, letterSpacing: 0.3 }}>
            Skip intro →
          </button>

          {/* Orange glow */}
          <div style={{ position: "fixed", top: "25%", left: "50%", transform: "translateX(-50%)", width: 320, height: 320, borderRadius: 160, background: "#FF4500", opacity: 0.05, filter: "blur(80px)", pointerEvents: "none" }} />

          {/* Phone + text */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px 160px", animation: "slideUp 0.45s cubic-bezier(0.16,1,0.3,1)", gap: 48 }}>
            <div style={{ animation: "float 3.5s ease-in-out infinite" }}>
              {MOCKUPS[INTRO_SLIDES[slideIndex].mockup as keyof typeof MOCKUPS]}
            </div>
            <div style={{ textAlign: "center", maxWidth: 320 }}>
              <h1 style={{ fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: -1.2, lineHeight: 1.1, whiteSpace: "pre-line", margin: "0 0 16px" }}>
                {INTRO_SLIDES[slideIndex].tagline}
              </h1>
              <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, margin: 0 }}>
                {INTRO_SLIDES[slideIndex].sub}
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px 24px 48px", background: "linear-gradient(0deg, #0A0A0A 75%, transparent)" }}>
            {/* Dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
              {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
                <div key={i} style={{ width: i === dotIndex ? 22 : 6, height: 6, borderRadius: 3, background: i === dotIndex ? "#FF4500" : "#1e1e1e", transition: "all 0.35s ease" }} />
              ))}
            </div>
            <button onClick={() => setStep(s => s + 1)}
              style={{ width: "100%", padding: "18px 0", borderRadius: 20, border: "none", background: "#FF4500", color: "#fff", fontWeight: 800, fontSize: 17, cursor: "pointer", boxShadow: "0 10px 40px rgba(255,69,0,0.45)", letterSpacing: -0.3 }}>
              {step === 0 ? "Get started →" : "Next →"}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PROFILE SETUP STEPS                                           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {!isIntro && (
        <div style={{ padding: "0 20px 120px", maxWidth: 460, margin: "0 auto", width: "100%" }}>

          {/* Header */}
          <div style={{ paddingTop: 56, paddingBottom: 24 }}>
            {/* Dots */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
                <div key={i} style={{ flex: i === dotIndex ? 2.5 : 1, height: 4, borderRadius: 2, background: i <= dotIndex ? "#FF4500" : "#1e1e1e", transition: "all 0.35s ease" }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#333", fontWeight: 700, letterSpacing: 1 }}>STEP {step} OF {PROFILE_STEPS}</span>
              {step > 1 && step < PROFILE_STEPS && (
                <button onClick={() => setStep(s => s + 1)}
                  style={{ fontSize: 12, color: "#333", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                  Skip →
                </button>
              )}
            </div>
          </div>

          {/* ── STEP 1: Identity ── */}
          {step === 1 && (
            <div key="step1" style={{ animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>👋</div>
              <h1 style={headStyle}>Welcome!</h1>
              <p style={subStyle}>Let's set up your profile so fitness partners can find you.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
                <div>
                  <label style={labelStyle}>YOUR NAME</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Alex Johnson" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>USERNAME <span style={{ color: "#FF4500" }}>*</span></label>
                  <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="e.g. alexj92" style={inputStyle} />
                  <div style={{ fontSize: 11, color: "#333", marginTop: 6 }}>flexmatches.com/u/{username || "yourname"}</div>
                </div>
                <div>
                  <label style={labelStyle}>AGE (OPTIONAL)</label>
                  <input value={age} onChange={e => setAge(e.target.value)} type="number" placeholder="e.g. 27" style={{ ...inputStyle, maxWidth: 120 }} />
                </div>
              </div>
              <button onClick={() => setStep(2)} disabled={!username.trim()} style={{ ...btnStyle, opacity: !username.trim() ? 0.35 : 1 }}>
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 2: Looking For ── */}
          {step === 2 && (
            <div key="step2" style={{ animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>🎯</div>
              <h1 style={headStyle}>What are you looking for?</h1>
              <p style={subStyle}>This helps us find the best matches for you</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
                {[
                  { value: "Workout Partner", emoji: "🏋️", title: "Workout Partner", sub: "Train together regularly" },
                  { value: "Accountability Buddy", emoji: "🤝", title: "Accountability Buddy", sub: "Keep each other on track" },
                  { value: "Group & Community", emoji: "👥", title: "Group & Community", sub: "Join local fitness groups" },
                  { value: "Events & Activities", emoji: "📅", title: "Events & Activities", sub: "Find local sports events" },
                ].map(({ value, emoji, title, sub }) => {
                  const active = lookingFor.includes(value);
                  return (
                    <button key={value} onClick={() => toggleLookingFor(value)}
                      style={{ padding: "14px 12px", borderRadius: 16, border: `1.5px solid ${active ? "#FF4500" : "#1e1e1e"}`, background: active ? "#FF450014" : "var(--bg-card-alt, #111)", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                      <div style={{ fontSize: 26, marginBottom: 6 }}>{emoji}</div>
                      <div style={{ fontWeight: 700, color: active ? "#FF4500" : "#aaa", fontSize: 13, lineHeight: 1.3, marginBottom: 3 }}>{title}</div>
                      <div style={{ fontSize: 11, color: active ? "#FF450099" : "#555", lineHeight: 1.4 }}>{sub}</div>
                      {active && <div style={{ marginTop: 6, fontSize: 12, color: "#FF4500" }}>✓</div>}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(1)} style={backBtnStyle}>←</button>
                <button onClick={() => setStep(3)} style={{ ...btnStyle, flex: 1 }}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Sports ── */}
          {step === 3 && (
            <div key="step3" style={{ animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>🏋️</div>
              <h1 style={headStyle}>Your Sports</h1>
              <p style={subStyle}>Pick the activities you love. We'll match you with people who share your interests.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
                {SPORTS_LIST.map(({ label, emoji }) => {
                  const active = sports.includes(label);
                  return (
                    <button key={label} onClick={() => toggleSport(label)}
                      style={{ padding: "12px 10px", borderRadius: 14, border: `1.5px solid ${active ? "#FF4500" : "#1e1e1e"}`, background: active ? "#FF450012" : "#111", color: active ? "#FF4500" : "#555", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}>
                      <span style={{ fontSize: 18 }}>{emoji}</span>{label}
                      {active && <span style={{ marginLeft: "auto", fontSize: 12 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              {sports.length > 0 && <div style={{ fontSize: 12, color: "#FF4500", fontWeight: 700, marginBottom: 16 }}>{sports.length} selected ✓</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(2)} style={backBtnStyle}>←</button>
                <button onClick={() => setStep(4)} disabled={sports.length === 0} style={{ ...btnStyle, flex: 1, opacity: sports.length === 0 ? 0.35 : 1 }}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Level + Goal ── */}
          {step === 4 && (
            <div key="step4" style={{ animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>🎯</div>
              <h1 style={headStyle}>Level & Goal</h1>
              <p style={subStyle}>This helps us find your most compatible training partners.</p>
              <label style={labelStyle}>FITNESS LEVEL <span style={{ color: "#FF4500" }}>*</span></label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {FITNESS_LEVELS.map(lvl => (
                  <button key={lvl.value} onClick={() => setFitnessLevel(lvl.value)}
                    style={{ padding: 14, borderRadius: 14, border: `1.5px solid ${fitnessLevel === lvl.value ? "#FF4500" : "#1e1e1e"}`, background: fitnessLevel === lvl.value ? "#FF450012" : "#111", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{lvl.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: fitnessLevel === lvl.value ? "#FF4500" : "#aaa", fontSize: 14 }}>{lvl.label}</div>
                      <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>{lvl.desc}</div>
                    </div>
                    {fitnessLevel === lvl.value && <span style={{ marginLeft: "auto", color: "#FF4500" }}>✓</span>}
                  </button>
                ))}
              </div>
              <label style={labelStyle}>WHAT ARE YOU LOOKING FOR?</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
                {GOALS.map(g => (
                  <button key={g.value} onClick={() => setGoal(g.value)}
                    style={{ padding: "12px 10px", borderRadius: 14, border: `1.5px solid ${goal === g.value ? "#FF4500" : "#1e1e1e"}`, background: goal === g.value ? "#FF450012" : "#111", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                    <div style={{ fontSize: 20, marginBottom: 5 }}>{g.emoji}</div>
                    <div style={{ fontWeight: 700, color: goal === g.value ? "#FF4500" : "#777", fontSize: 12, lineHeight: 1.3 }}>{g.label}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(3)} style={backBtnStyle}>←</button>
                <button onClick={() => setStep(5)} disabled={!fitnessLevel} style={{ ...btnStyle, flex: 1, opacity: !fitnessLevel ? 0.35 : 1 }}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── STEP 5: Schedule ── */}
          {step === 5 && (
            <div key="step5" style={{ animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>📅</div>
              <h1 style={headStyle}>Your Schedule</h1>
              <p style={subStyle}>We'll match you with people on a compatible schedule.</p>
              <label style={labelStyle}>AVAILABLE DAYS</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {DAYS.map(d => (
                  <button key={d} onClick={() => toggleDay(d)}
                    style={{ padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${availability[d] ? "#FF4500" : "#1e1e1e"}`, background: availability[d] ? "#FF4500" : "#111", color: availability[d] ? "#fff" : "#555", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {d}
                  </button>
                ))}
              </div>
              <label style={labelStyle}>PREFERRED TRAINING TIME</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {TIME_OPTIONS.map(t => {
                  const active = preferredTimes.includes(t.value);
                  return (
                    <button key={t.value} onClick={() => toggleTime(t.value)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 14, border: `1.5px solid ${active ? "#FF4500" : "#1e1e1e"}`, background: active ? "#FF450012" : "#111", cursor: "pointer" }}>
                      <span style={{ fontSize: 22 }}>{t.emoji}</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: 700, color: active ? "#FF4500" : "#aaa", fontSize: 14 }}>{t.label}</div>
                        <div style={{ fontSize: 12, color: "#444" }}>{t.sub}</div>
                      </div>
                      {active && <span style={{ marginLeft: "auto", color: "#FF4500" }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(4)} style={backBtnStyle}>←</button>
                <button onClick={() => setStep(6)} style={{ ...btnStyle, flex: 1 }}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── STEP 6: Location ── */}
          {step === 6 && (
            <div key="step6" style={{ animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>📍</div>
              <h1 style={headStyle}>Your Location</h1>
              <p style={subStyle}>Find fitness partners near you. Used only to show distance — never shared publicly.</p>
              <label style={labelStyle}>YOUR CITY</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. London, New York, Istanbul" style={{ ...inputStyle, marginBottom: 16 }} />
              <label style={labelStyle}>PRECISE LOCATION (OPTIONAL)</label>
              {!locationSaved ? (
                <button onClick={saveLocation} disabled={locating}
                  style={{ ...btnStyle, background: "transparent", border: "1.5px solid #FF4500", color: "#FF4500", marginBottom: 8, opacity: locating ? 0.6 : 1 }}>
                  {locating ? "Getting location..." : "📍 Allow GPS Location"}
                </button>
              ) : (
                <div style={{ padding: 14, borderRadius: 14, border: "1px solid #22c55e33", background: "#0d1f0d", color: "#22c55e", fontWeight: 700, fontSize: 14, textAlign: "center", marginBottom: 8 }}>
                  ✓ GPS location saved!
                </div>
              )}
              {/* Profile summary before finish */}
              <div style={{ background: "#111", borderRadius: 16, padding: 16, border: "1px solid #1e1e1e", marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: "#333", fontWeight: 700, letterSpacing: 0.5, marginBottom: 12 }}>YOUR PROFILE SUMMARY</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {fullName && <SummaryRow emoji="👤" text={fullName} />}
                  {sports.length > 0 && <SummaryRow emoji="🏋️" text={sports.slice(0, 3).join(", ") + (sports.length > 3 ? ` +${sports.length - 3}` : "")} />}
                  {fitnessLevel && <SummaryRow emoji="💪" text={fitnessLevel.charAt(0).toUpperCase() + fitnessLevel.slice(1)} />}
                  {city && <SummaryRow emoji="📍" text={city} />}
                  {Object.values(availability).some(Boolean) && <SummaryRow emoji="📅" text={DAYS.filter(d => availability[d]).join(", ")} />}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setStep(5)} style={backBtnStyle}>←</button>
                <button onClick={finish} disabled={saving}
                  style={{ ...btnStyle, flex: 1, opacity: saving ? 0.6 : 1, background: saving ? "#222" : "#FF4500" }}>
                  {saving ? "Setting up..." : "🚀 Find My Matches!"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{ color: "#666", fontSize: 13 }}>{text}</span>
    </div>
  );
}

const headStyle: React.CSSProperties = { color: "#fff", fontSize: 28, fontWeight: 900, marginBottom: 10, letterSpacing: -0.5 };
const subStyle: React.CSSProperties = { color: "#555", fontSize: 14, lineHeight: 1.7, marginBottom: 24 };
const labelStyle: React.CSSProperties = { fontSize: 11, color: "#333", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" };
const inputStyle: React.CSSProperties = { width: "100%", background: "#111", border: "1.5px solid #1e1e1e", borderRadius: 14, padding: "13px 16px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" };
const btnStyle: React.CSSProperties = { display: "block", width: "100%", padding: "15px 0", borderRadius: 16, border: "none", background: "#FF4500", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", textAlign: "center", boxShadow: "0 6px 24px rgba(255,69,0,0.35)" };
const backBtnStyle: React.CSSProperties = { padding: "15px 18px", borderRadius: 16, border: "1.5px solid #1e1e1e", background: "transparent", color: "#555", fontWeight: 700, fontSize: 16, cursor: "pointer" };
