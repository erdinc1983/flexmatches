"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { awardBadge } from "../../lib/badges";

const SPORTS_LIST = [
  "Gym", "Running", "Cycling", "Swimming", "Football",
  "Basketball", "Tennis", "Boxing", "Yoga", "CrossFit", "Pilates", "Hiking",
];
const FITNESS_LEVELS = [
  { value: "beginner", label: "Beginner", desc: "Just getting started" },
  { value: "intermediate", label: "Intermediate", desc: "Training regularly" },
  { value: "advanced", label: "Advanced", desc: "Competing or coaching" },
];
const TOTAL_STEPS = 4;

const TIME_OPTIONS = [
  { value: "morning", label: "Morning", sub: "06:00 – 12:00", emoji: "🌅" },
  { value: "afternoon", label: "Afternoon", sub: "12:00 – 17:00", emoji: "☀️" },
  { value: "evening", label: "Evening", sub: "17:00 – 23:00", emoji: "🌙" },
];

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
  const [fitnessLevel, setFitnessLevel] = useState<string>("");
  const [age, setAge] = useState("");
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  // Step 4
  const [locating, setLocating] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      const emailName = user.email?.split("@")[0] ?? "";
      setUsername(emailName);
    });
  }, [router]);

  function toggleSport(sport: string) {
    setSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  }

  async function saveLocation() {
    if (!navigator.geolocation || !userId) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await supabase.from("users").update({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }).eq("id", userId);
        setLocationSaved(true);
        setLocating(false);
      },
      () => { setLocating(false); }
    );
  }

  function toggleTime(t: string) {
    setPreferredTimes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
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
      age: parseInt(age) || null,
      preferred_times: preferredTimes,
      onboarding_completed: true,
    });
    await awardBadge(userId, "early_adopter");
    router.replace("/app/discover");
  }

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#FF4500", letterSpacing: -1 }}>FlexMatches</div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>Let's set up your profile</div>
        </div>

        {/* Progress bar */}
        <div style={{ background: "#1a1a1a", borderRadius: 99, height: 4, marginBottom: 32 }}>
          <div style={{ background: "#FF4500", width: `${progress}%`, height: 4, borderRadius: 99, transition: "width 0.4s" }} />
        </div>
        <div style={{ fontSize: 11, color: "#555", fontWeight: 700, marginBottom: 24, letterSpacing: 1 }}>
          STEP {step} OF {TOTAL_STEPS}
        </div>

        {/* Step 1: Name & Username */}
        {step === 1 && (
          <div>
            <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Welcome! 👋</h1>
            <p style={{ color: "#666", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              Tell us a bit about yourself so others can find you.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>YOUR NAME</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>USERNAME</label>
                <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  placeholder="e.g. alexj92"
                  style={inputStyle} />
              </div>
            </div>
            <button onClick={() => setStep(2)} disabled={!username.trim()}
              style={{ ...btnStyle, marginTop: 32, opacity: !username.trim() ? 0.4 : 1 }}>
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Sports */}
        {step === 2 && (
          <div>
            <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Your Sports 🏋️</h1>
            <p style={{ color: "#666", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Pick the activities you love. We'll match you with people who share your interests.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {SPORTS_LIST.map((sport) => {
                const active = sports.includes(sport);
                return (
                  <button key={sport} onClick={() => toggleSport(sport)}
                    style={{ padding: "10px 16px", borderRadius: 999, border: `1px solid ${active ? "#FF4500" : "#2a2a2a"}`, background: active ? "#FF4500" : "transparent", color: active ? "#fff" : "#888", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.15s" }}>
                    {sport}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
              <button onClick={() => setStep(1)} style={backBtnStyle}>←</button>
              <button onClick={() => setStep(3)} disabled={sports.length === 0}
                style={{ ...btnStyle, flex: 1, opacity: sports.length === 0 ? 0.4 : 1 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Fitness level + age */}
        {step === 3 && (
          <div>
            <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Your Level 💪</h1>
            <p style={{ color: "#666", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              This helps us match you with the right training partners.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {FITNESS_LEVELS.map((lvl) => (
                <button key={lvl.value} onClick={() => setFitnessLevel(lvl.value)}
                  style={{ padding: 14, borderRadius: 14, border: `1px solid ${fitnessLevel === lvl.value ? "#FF4500" : "#2a2a2a"}`, background: fitnessLevel === lvl.value ? "#FF450011" : "transparent", textAlign: "left", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ fontWeight: 700, color: fitnessLevel === lvl.value ? "#FF4500" : "#fff", fontSize: 15 }}>{lvl.label}</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{lvl.desc}</div>
                </button>
              ))}
            </div>
            <div>
              <label style={labelStyle}>AGE (OPTIONAL)</label>
              <input value={age} onChange={(e) => setAge(e.target.value)}
                type="number" placeholder="e.g. 27"
                style={{ ...inputStyle, maxWidth: 120 }} />
            </div>
            <div style={{ marginTop: 20 }}>
              <label style={labelStyle}>PREFERRED TRAINING TIME (OPTIONAL)</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {TIME_OPTIONS.map((t) => {
                  const active = preferredTimes.includes(t.value);
                  return (
                    <button key={t.value} onClick={() => toggleTime(t.value)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: `1px solid ${active ? "#FF4500" : "#2a2a2a"}`, background: active ? "#FF450011" : "transparent", cursor: "pointer", transition: "all 0.15s" }}>
                      <span style={{ fontSize: 20 }}>{t.emoji}</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: 700, color: active ? "#FF4500" : "#fff", fontSize: 14 }}>{t.label}</div>
                        <div style={{ fontSize: 12, color: "#555" }}>{t.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
              <button onClick={() => setStep(2)} style={backBtnStyle}>←</button>
              <button onClick={() => setStep(4)} disabled={!fitnessLevel}
                style={{ ...btnStyle, flex: 1, opacity: !fitnessLevel ? 0.4 : 1 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Location */}
        {step === 4 && (
          <div>
            <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Find Nearby Partners 📍</h1>
            <p style={{ color: "#666", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              Share your location to discover fitness buddies near you. You can skip this and do it later in your profile.
            </p>
            {!locationSaved ? (
              <button onClick={saveLocation} disabled={locating}
                style={{ ...btnStyle, background: "transparent", border: "1px solid #FF4500", color: "#FF4500", marginBottom: 12, opacity: locating ? 0.6 : 1 }}>
                {locating ? "Getting location..." : "📍 Allow Location"}
              </button>
            ) : (
              <div style={{ padding: 14, borderRadius: 14, border: "1px solid #22c55e33", background: "#0d1f0d", color: "#22c55e", fontWeight: 600, fontSize: 14, textAlign: "center", marginBottom: 12 }}>
                ✓ Location saved!
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => setStep(3)} style={backBtnStyle}>←</button>
              <button onClick={finish} disabled={saving}
                style={{ ...btnStyle, flex: 1, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Setting up..." : "🚀 Let's Go!"}
              </button>
            </div>
            {!locationSaved && (
              <button onClick={finish} disabled={saving}
                style={{ width: "100%", marginTop: 12, background: "none", border: "none", color: "#444", fontSize: 13, cursor: "pointer", padding: 8 }}>
                Skip for now
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: "#555", fontWeight: 700,
  display: "block", marginBottom: 8, letterSpacing: 0.5,
};
const inputStyle: React.CSSProperties = {
  width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a",
  borderRadius: 12, padding: "12px 14px", color: "#fff", fontSize: 15,
  outline: "none", boxSizing: "border-box",
};
const btnStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "14px 0", borderRadius: 14,
  border: "none", background: "#FF4500", color: "#fff",
  fontWeight: 700, fontSize: 16, cursor: "pointer", textAlign: "center",
};
const backBtnStyle: React.CSSProperties = {
  padding: "14px 18px", borderRadius: 14, border: "1px solid #2a2a2a",
  background: "transparent", color: "#888", fontWeight: 600, fontSize: 16,
  cursor: "pointer",
};
