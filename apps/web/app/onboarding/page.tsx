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
  { label: "Football", emoji: "⚽" }, { label: "Basketball", emoji: "🏀" },
  { label: "Tennis", emoji: "🎾" }, { label: "Boxing", emoji: "🥊" },
  { label: "Yoga", emoji: "🧘" }, { label: "CrossFit", emoji: "💪" },
  { label: "Pilates", emoji: "🎯" }, { label: "Hiking", emoji: "🏔️" },
  { label: "Rowing", emoji: "🚣" }, { label: "Dancing", emoji: "💃" },
  { label: "HIIT", emoji: "⚡" }, { label: "Other", emoji: "🏅" },
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

const TOTAL_STEPS = 6;

/* ─── Component ─────────────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Step 1 — Identity
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");

  // Step 2 — Sports
  const [sports, setSports] = useState<string[]>([]);

  // Step 3 — Level + Goals
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [goal, setGoal] = useState("");

  // Step 4 — Schedule
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Record<string, boolean>>(
    Object.fromEntries(DAYS.map(d => [d, false]))
  );

  // Step 5 — Location + City
  const [city, setCity] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);

  // Step 6 — Professional
  const [occupation, setOccupation] = useState("");
  const [industry, setIndustry] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      setUsername(user.email?.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase() ?? "");
    });
  }, [router]);

  function toggleSport(s: string) {
    setSports(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  }
  function toggleTime(t: string) {
    setPreferredTimes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  }
  function toggleDay(d: string) {
    setAvailability(p => ({ ...p, [d]: !p[d] }));
  }

  async function saveLocation() {
    if (!navigator.geolocation || !userId) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await supabase.from("users").update({ lat: pos.coords.latitude, lng: pos.coords.longitude }).eq("id", userId);
        setLocationSaved(true);
        setLocating(false);
      },
      () => setLocating(false)
    );
  }

  async function finish() {
    if (!userId) return;
    setSaving(true);

    // Generate a unique referral code for this user
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
      occupation: occupation.trim() || null,
      industry: industry || null,
      referral_code: myCode,
      onboarding_completed: true,
    });

    await awardBadge(userId, "early_adopter");

    // Process referral if user came via a referral link
    const refCode = localStorage.getItem("referral_code");
    if (refCode) {
      const { data: referrer } = await supabase
        .from("users").select("id").eq("referral_code", refCode.toUpperCase()).single();
      if (referrer && referrer.id !== userId) {
        // Link referred user
        await supabase.from("users").update({ referred_by: referrer.id }).eq("id", userId);
        // Log referral
        await supabase.from("referrals").insert({ referrer_id: referrer.id, referred_user_id: userId });
        // Check referrer's referral count → award badges
        const { count } = await supabase
          .from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", referrer.id);
        await awardBadge(referrer.id, "first_referral");
        if ((count ?? 0) >= 5) await awardBadge(referrer.id, "referral_master");
        // Notify referrer
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

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: "var(--accent)", letterSpacing: -1 }}>FlexMatches</div>
        </div>

        {/* Progress */}
        <div style={{ background: "var(--bg-card-alt)", borderRadius: 99, height: 4, marginBottom: 8 }}>
          <div style={{ background: "var(--accent)", width: `${progress}%`, height: 4, borderRadius: 99, transition: "width 0.4s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 28 }}>
          <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 1 }}>STEP {step} OF {TOTAL_STEPS}</span>
          {step > 1 && step < TOTAL_STEPS && (
            <button onClick={() => setStep(s => s + 1)}
              style={{ fontSize: 12, color: "var(--text-ultra-faint)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
              Skip →
            </button>
          )}
        </div>

        {/* ── STEP 1: Identity ─────────────────────────────────── */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
            <h1 style={{ color: "var(--text-primary)", fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Welcome!</h1>
            <p style={{ color: "var(--text-faint)", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              Let's set up your profile so fitness partners can find you.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>YOUR NAME</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Alex Johnson" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>USERNAME <span style={{ color: "var(--accent)" }}>*</span></label>
                <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="e.g. alexj92" style={inputStyle} />
                <div style={{ fontSize: 11, color: "var(--text-ultra-faint)", marginTop: 6 }}>flexmatches.com/u/{username || "yourname"}</div>
              </div>
              <div>
                <label style={labelStyle}>AGE (OPTIONAL)</label>
                <input value={age} onChange={e => setAge(e.target.value)} type="number"
                  placeholder="e.g. 27" style={{ ...inputStyle, maxWidth: 120 }} />
              </div>
            </div>
            <button onClick={() => setStep(2)} disabled={!username.trim()}
              style={{ ...btnStyle, marginTop: 28, opacity: !username.trim() ? 0.4 : 1 }}>
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 2: Sports ───────────────────────────────────── */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏋️</div>
            <h1 style={{ color: "var(--text-primary)", fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Your Sports</h1>
            <p style={{ color: "var(--text-faint)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Pick the activities you love. We'll match you with people who share your interests.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {SPORTS_LIST.map(({ label, emoji }) => {
                const active = sports.includes(label);
                return (
                  <button key={label} onClick={() => toggleSport(label)}
                    style={{ padding: "12px 10px", borderRadius: 14, border: `1px solid ${active ? "var(--accent)" : "var(--bg-input)"}`, background: active ? "#FF450015" : "var(--bg-card)", color: active ? "var(--accent)" : "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{emoji}</span>
                    {label}
                    {active && <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: 14 }}>✓</span>}
                  </button>
                );
              })}
            </div>
            {sports.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                {sports.length} selected
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setStep(1)} style={backBtnStyle}>←</button>
              <button onClick={() => setStep(3)} disabled={sports.length === 0}
                style={{ ...btnStyle, flex: 1, opacity: sports.length === 0 ? 0.4 : 1 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Level + Goal ─────────────────────────────── */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <h1 style={{ color: "var(--text-primary)", fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Your Level & Goal</h1>
            <p style={{ color: "var(--text-faint)", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              This helps us find the most compatible training partners.
            </p>

            <label style={labelStyle}>FITNESS LEVEL <span style={{ color: "var(--accent)" }}>*</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {FITNESS_LEVELS.map(lvl => (
                <button key={lvl.value} onClick={() => setFitnessLevel(lvl.value)}
                  style={{ padding: 14, borderRadius: 14, border: `1px solid ${fitnessLevel === lvl.value ? "var(--accent)" : "var(--bg-input)"}`, background: fitnessLevel === lvl.value ? "#FF450011" : "var(--bg-card)", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{lvl.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: fitnessLevel === lvl.value ? "var(--accent)" : "var(--text-primary)", fontSize: 14 }}>{lvl.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 1 }}>{lvl.desc}</div>
                  </div>
                  {fitnessLevel === lvl.value && <span style={{ marginLeft: "auto", color: "var(--accent)" }}>✓</span>}
                </button>
              ))}
            </div>

            <label style={labelStyle}>WHAT ARE YOU LOOKING FOR?</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {GOALS.map(g => (
                <button key={g.value} onClick={() => setGoal(g.value)}
                  style={{ padding: "12px 10px", borderRadius: 14, border: `1px solid ${goal === g.value ? "var(--accent)" : "var(--bg-input)"}`, background: goal === g.value ? "#FF450015" : "var(--bg-card)", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{g.emoji}</div>
                  <div style={{ fontWeight: 700, color: goal === g.value ? "var(--accent)" : "var(--text-primary)", fontSize: 12, lineHeight: 1.3 }}>{g.label}</div>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setStep(2)} style={backBtnStyle}>←</button>
              <button onClick={() => setStep(4)} disabled={!fitnessLevel}
                style={{ ...btnStyle, flex: 1, opacity: !fitnessLevel ? 0.4 : 1 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Schedule ─────────────────────────────────── */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
            <h1 style={{ color: "var(--text-primary)", fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Your Schedule</h1>
            <p style={{ color: "var(--text-faint)", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              When are you usually free? We'll match you with people on a compatible schedule.
            </p>

            <label style={labelStyle}>AVAILABLE DAYS</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {DAYS.map(d => (
                <button key={d} onClick={() => toggleDay(d)}
                  style={{ padding: "10px 14px", borderRadius: 12, border: `1px solid ${availability[d] ? "var(--accent)" : "var(--bg-input)"}`, background: availability[d] ? "var(--accent)" : "var(--bg-card)", color: availability[d] ? "var(--text-primary)" : "var(--text-faint)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {d}
                </button>
              ))}
            </div>

            <label style={labelStyle}>PREFERRED TRAINING TIME</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TIME_OPTIONS.map(t => {
                const active = preferredTimes.includes(t.value);
                return (
                  <button key={t.value} onClick={() => toggleTime(t.value)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: `1px solid ${active ? "var(--accent)" : "var(--bg-input)"}`, background: active ? "#FF450011" : "var(--bg-card)", cursor: "pointer" }}>
                    <span style={{ fontSize: 20 }}>{t.emoji}</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 700, color: active ? "var(--accent)" : "var(--text-primary)", fontSize: 14 }}>{t.label}</div>
                      <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{t.sub}</div>
                    </div>
                    {active && <span style={{ marginLeft: "auto", color: "var(--accent)" }}>✓</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setStep(3)} style={backBtnStyle}>←</button>
              <button onClick={() => setStep(5)}
                style={{ ...btnStyle, flex: 1 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Location ─────────────────────────────────── */}
        {step === 5 && (
          <div>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
            <h1 style={{ color: "var(--text-primary)", fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Your Location</h1>
            <p style={{ color: "var(--text-faint)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Find fitness partners near you.
            </p>

            <label style={labelStyle}>YOUR CITY</label>
            <input value={city} onChange={e => setCity(e.target.value)}
              placeholder="e.g. London, New York, Istanbul"
              style={{ ...inputStyle, marginBottom: 16 }} />

            <label style={labelStyle}>PRECISE LOCATION (OPTIONAL)</label>
            {!locationSaved ? (
              <button onClick={saveLocation} disabled={locating}
                style={{ ...btnStyle, background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)", marginBottom: 8, opacity: locating ? 0.6 : 1 }}>
                {locating ? "Getting location..." : "📍 Allow GPS Location"}
              </button>
            ) : (
              <div style={{ padding: 14, borderRadius: 14, border: "1px solid #22c55e33", background: "#0d1f0d", color: "var(--success)", fontWeight: 600, fontSize: 14, textAlign: "center", marginBottom: 8 }}>
                ✓ GPS location saved!
              </div>
            )}
            <p style={{ fontSize: 12, color: "var(--text-ultra-faint)", textAlign: "center", marginBottom: 20 }}>
              Used only to show distance to matches. Never shared publicly.
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(4)} style={backBtnStyle}>←</button>
              <button onClick={() => setStep(6)}
                style={{ ...btnStyle, flex: 1 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 6: Professional + Finish ────────────────────── */}
        {step === 6 && (
          <div>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💼</div>
            <h1 style={{ color: "var(--text-primary)", fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Professional Info</h1>
            <p style={{ color: "var(--text-faint)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Optional — helps us match you with people from similar backgrounds.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>JOB TITLE (OPTIONAL)</label>
                <input value={occupation} onChange={e => setOccupation(e.target.value)}
                  placeholder="e.g. Software Engineer" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>INDUSTRY (OPTIONAL)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {INDUSTRIES.map(ind => (
                    <button key={ind} onClick={() => setIndustry(ind === industry ? "" : ind)}
                      style={{ padding: "8px 14px", borderRadius: 999, border: `1px solid ${industry === ind ? "var(--accent)" : "var(--bg-input)"}`, background: industry === ind ? "#FF450015" : "var(--bg-card)", color: industry === ind ? "var(--accent)" : "var(--text-faint)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary card */}
            <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 16, border: "1px solid var(--border)", marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 12 }}>YOUR PROFILE SUMMARY</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {fullName && <SummaryRow emoji="👤" text={fullName} />}
                <SummaryRow emoji="🏋️" text={sports.slice(0, 3).join(", ") + (sports.length > 3 ? ` +${sports.length - 3}` : "")} />
                {fitnessLevel && <SummaryRow emoji="💪" text={fitnessLevel.charAt(0).toUpperCase() + fitnessLevel.slice(1)} />}
                {city && <SummaryRow emoji="📍" text={city} />}
                {Object.values(availability).some(Boolean) && (
                  <SummaryRow emoji="📅" text={DAYS.filter(d => availability[d]).join(", ")} />
                )}
                {industry && <SummaryRow emoji="💼" text={industry} />}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(5)} style={backBtnStyle}>←</button>
              <button onClick={finish} disabled={saving}
                style={{ ...btnStyle, flex: 1, opacity: saving ? 0.6 : 1, background: saving ? "#333" : "var(--accent)" }}>
                {saving ? "Setting up..." : "🚀 Find My Matches!"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function SummaryRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{text}</span>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: "var(--text-faint)", fontWeight: 700,
  display: "block", marginBottom: 8, letterSpacing: 0.5,
};
const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)",
  borderRadius: 12, padding: "12px 14px", color: "var(--text-primary)", fontSize: 15,
  outline: "none", boxSizing: "border-box",
};
const btnStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "14px 0", borderRadius: 14,
  border: "none", background: "var(--accent)", color: "var(--text-primary)",
  fontWeight: 700, fontSize: 16, cursor: "pointer", textAlign: "center",
};
const backBtnStyle: React.CSSProperties = {
  padding: "14px 18px", borderRadius: 14, border: "1px solid var(--border-medium)",
  background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 16,
  cursor: "pointer",
};
