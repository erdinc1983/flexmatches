"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

/* ─── Constants ─────────────────────────────────────────────────── */
const SPORTS_LIST = [
  { label: "Gym", emoji: "🏋️" }, { label: "Running", emoji: "🏃" },
  { label: "Cycling", emoji: "🚴" }, { label: "Swimming", emoji: "🏊" },
  { label: "Soccer", emoji: "⚽" }, { label: "Football", emoji: "🏈" },
  { label: "Basketball", emoji: "🏀" }, { label: "Tennis", emoji: "🎾" },
  { label: "Boxing", emoji: "🥊" }, { label: "Yoga", emoji: "🧘" },
  { label: "CrossFit", emoji: "💪" }, { label: "Pilates", emoji: "🎯" },
  { label: "Hiking", emoji: "🏔️" }, { label: "Climbing", emoji: "🧗" },
  { label: "Kayaking", emoji: "🛶" }, { label: "Rowing", emoji: "🚣" },
  { label: "Dancing", emoji: "💃" }, { label: "HIIT", emoji: "⚡" },
  { label: "Chess", emoji: "♟️" }, { label: "Board Games", emoji: "🎲" },
  { label: "Other", emoji: "🏅" },
];

const FITNESS_LEVELS = [
  { value: "beginner",     label: "Beginner",     desc: "Just getting started",    emoji: "🌱" },
  { value: "intermediate", label: "Intermediate", desc: "Training regularly",       emoji: "🔥" },
  { value: "advanced",     label: "Advanced",     desc: "Competing or coaching",    emoji: "🏆" },
];

const TIME_OPTIONS = [
  { value: "morning",   label: "Morning",   sub: "06:00 – 12:00", emoji: "🌅" },
  { value: "afternoon", label: "Afternoon", sub: "12:00 – 17:00", emoji: "☀️" },
  { value: "evening",   label: "Evening",   sub: "17:00 – 23:00", emoji: "🌙" },
];

const TOTAL_STEPS = 4;

/* ─── Main Component ─────────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  // Step 2
  const [sports, setSports] = useState<string[]>([]);

  // Step 3
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);

  // Step 4
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

  // Intercept browser back
  useEffect(() => {
    window.history.pushState({ onboarding: true }, "");
    const handlePop = () => {
      setStep(prev => {
        if (prev > 1) {
          window.history.pushState({ onboarding: true }, "");
          return prev - 1;
        }
        return prev;
      });
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  function toggleSport(s: string) { setSports(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]); }
  function toggleTime(t: string)  { setPreferredTimes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]); }

  async function advanceStep(next: number) {
    if (userId) {
      await supabase.from("users").update({ last_onboarding_step: next }).eq("id", userId);
    }
    setStep(next);
  }

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
    await supabase.from("users").upsert({
      id: userId,
      username: username.trim() || userId.slice(0, 8),
      full_name: fullName.trim() || null,
      sports,
      fitness_level: fitnessLevel || null,
      availability: Object.fromEntries(["morning","afternoon","evening"].map(s => [s, preferredTimes.includes(s)])),
      city: city.trim() || null,
      onboarding_completed: true,
    });
    router.replace("/app/home");
  }

  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ padding: "0 20px 100px", maxWidth: 460, margin: "0 auto", width: "100%" }}>

        {/* Progress bar */}
        <div style={{ paddingTop: 52, paddingBottom: 28 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i < step ? "#FF4500" : i === step - 1 ? "#FF4500" : "#1e1e1e",
                transition: "background 0.3s",
              }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#333", fontWeight: 700, letterSpacing: 1 }}>
            STEP {step} OF {TOTAL_STEPS}
          </div>
        </div>

        {/* ── STEP 1: Name & Username ── */}
        {step === 1 && (
          <div key="s1" style={{ animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>👋</div>
            <h1 style={headStyle}>What should we call you?</h1>
            <p style={subStyle}>This is how other fitness partners will find you.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
              <div>
                <label style={labelStyle}>YOUR NAME <span style={{ color: "#444" }}>(optional)</span></label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  style={inputStyle}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>USERNAME <span style={{ color: "#FF4500" }}>*</span></label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="e.g. alexj92"
                  style={inputStyle}
                />
                <div style={{ fontSize: 11, color: "#2a2a2a", marginTop: 6 }}>
                  flexmatches.com/u/{username || "yourname"}
                </div>
              </div>
            </div>

            <button onClick={() => advanceStep(2)} disabled={!username.trim()}
              style={{ ...btnStyle, opacity: !username.trim() ? 0.35 : 1 }}>
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 2: Sports ── */}
        {step === 2 && (
          <div key="s2" style={{ animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🏋️</div>
            <h1 style={headStyle}>What do you do?</h1>
            <p style={subStyle}>Pick everything you're into. We'll match you with people who share your activities.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
              {SPORTS_LIST.map(({ label, emoji }) => {
                const active = sports.includes(label);
                return (
                  <button key={label} onClick={() => toggleSport(label)}
                    style={{
                      padding: "10px 8px", borderRadius: 12,
                      border: `1.5px solid ${active ? "#FF4500" : "#1e1e1e"}`,
                      background: active ? "#FF450014" : "#111",
                      color: active ? "#FF4500" : "#555",
                      fontWeight: 700, fontSize: 12, cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      transition: "all 0.15s",
                    }}>
                    <span style={{ fontSize: 20 }}>{emoji}</span>
                    <span style={{ lineHeight: 1.2 }}>{label}</span>
                    {active && <span style={{ fontSize: 10, color: "#FF4500" }}>✓</span>}
                  </button>
                );
              })}
            </div>

            {sports.length > 0 && (
              <div style={{ fontSize: 12, color: "#FF4500", fontWeight: 700, marginBottom: 14 }}>
                {sports.length} selected ✓
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={backBtnStyle}>←</button>
              <button onClick={() => advanceStep(3)} disabled={sports.length === 0}
                style={{ ...btnStyle, flex: 1, opacity: sports.length === 0 ? 0.35 : 1 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Level + Time ── */}
        {step === 3 && (
          <div key="s3" style={{ animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>⚡</div>
            <h1 style={headStyle}>Level & schedule</h1>
            <p style={subStyle}>Helps us find partners who train like you do.</p>

            <label style={labelStyle}>FITNESS LEVEL <span style={{ color: "#FF4500" }}>*</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {FITNESS_LEVELS.map(lvl => (
                <button key={lvl.value} onClick={() => setFitnessLevel(lvl.value)}
                  style={{
                    padding: "13px 16px", borderRadius: 14,
                    border: `1.5px solid ${fitnessLevel === lvl.value ? "#FF4500" : "#1e1e1e"}`,
                    background: fitnessLevel === lvl.value ? "#FF450012" : "#111",
                    textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
                  }}>
                  <span style={{ fontSize: 24 }}>{lvl.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: fitnessLevel === lvl.value ? "#FF4500" : "#aaa", fontSize: 14 }}>
                      {lvl.label}
                    </div>
                    <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>{lvl.desc}</div>
                  </div>
                  {fitnessLevel === lvl.value && <span style={{ marginLeft: "auto", color: "#FF4500", fontSize: 16 }}>✓</span>}
                </button>
              ))}
            </div>

            <label style={labelStyle}>WHEN DO YOU TRAIN? <span style={{ color: "#444" }}>(optional)</span></label>
            <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
              {TIME_OPTIONS.map(t => {
                const active = preferredTimes.includes(t.value);
                return (
                  <button key={t.value} onClick={() => toggleTime(t.value)}
                    style={{
                      flex: 1, padding: "12px 6px", borderRadius: 14,
                      border: `1.5px solid ${active ? "#FF4500" : "#1e1e1e"}`,
                      background: active ? "#FF450012" : "#111",
                      cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    }}>
                    <span style={{ fontSize: 22 }}>{t.emoji}</span>
                    <span style={{ fontWeight: 700, color: active ? "#FF4500" : "#555", fontSize: 12 }}>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={backBtnStyle}>←</button>
              <button onClick={() => advanceStep(4)} disabled={!fitnessLevel}
                style={{ ...btnStyle, flex: 1, opacity: !fitnessLevel ? 0.35 : 1 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Location ── */}
        {step === 4 && (
          <div key="s4" style={{ animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>📍</div>
            <h1 style={headStyle}>Where are you based?</h1>
            <p style={subStyle}>We use this to show nearby partners. Never shared publicly.</p>

            <label style={labelStyle}>YOUR CITY</label>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Istanbul, New York, London"
              style={{ ...inputStyle, marginBottom: 12 }}
              autoFocus
            />

            {!locationSaved ? (
              <button onClick={saveLocation} disabled={locating}
                style={{ ...btnStyle, background: "transparent", border: "1.5px solid #FF4500", color: "#FF4500", marginBottom: 20, opacity: locating ? 0.6 : 1, boxShadow: "none" }}>
                {locating ? "Getting location..." : "📍 Use precise GPS location"}
              </button>
            ) : (
              <div style={{ padding: "13px 16px", borderRadius: 14, border: "1px solid #22c55e44", background: "#0d1a0d", color: "#22c55e", fontWeight: 700, fontSize: 14, textAlign: "center", marginBottom: 20 }}>
                ✓ GPS location saved
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(3)} style={backBtnStyle}>←</button>
              <button onClick={finish} disabled={saving}
                style={{ ...btnStyle, flex: 1, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Setting up..." : "🚀 Find My Matches"}
              </button>
            </div>

            <button onClick={finish} disabled={saving}
              style={{ marginTop: 12, width: "100%", background: "none", border: "none", color: "#333", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "8px 0" }}>
              Skip for now →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

const headStyle: React.CSSProperties = { color: "#fff", fontSize: 28, fontWeight: 900, marginBottom: 10, letterSpacing: -0.5, margin: "0 0 10px" };
const subStyle: React.CSSProperties = { color: "#555", fontSize: 14, lineHeight: 1.7, marginBottom: 24, margin: "0 0 24px" };
const labelStyle: React.CSSProperties = { fontSize: 11, color: "#333", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" };
const inputStyle: React.CSSProperties = { width: "100%", background: "#111", border: "1.5px solid #1e1e1e", borderRadius: 14, padding: "13px 16px", color: "#fff", fontSize: 15, outline: "none" };
const btnStyle: React.CSSProperties = { display: "block", width: "100%", padding: "15px 0", borderRadius: 16, border: "none", background: "#FF4500", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", textAlign: "center", boxShadow: "0 6px 24px rgba(255,69,0,0.35)" };
const backBtnStyle: React.CSSProperties = { padding: "15px 18px", borderRadius: 16, border: "1.5px solid #1e1e1e", background: "transparent", color: "#555", fontWeight: 700, fontSize: 16, cursor: "pointer" };
