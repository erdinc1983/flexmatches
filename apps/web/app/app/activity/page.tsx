"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { checkAndAwardWorkoutBadges } from "../../../lib/badges";

const EXERCISE_TYPES = [
  { key: "weightlifting", label: "Weightlifting", emoji: "🏋️" },
  { key: "running", label: "Running", emoji: "🏃" },
  { key: "cycling", label: "Cycling", emoji: "🚴" },
  { key: "swimming", label: "Swimming", emoji: "🏊" },
  { key: "football", label: "Football", emoji: "⚽" },
  { key: "basketball", label: "Basketball", emoji: "🏀" },
  { key: "tennis", label: "Tennis", emoji: "🎾" },
  { key: "boxing", label: "Boxing", emoji: "🥊" },
  { key: "yoga", label: "Yoga", emoji: "🧘" },
  { key: "crossfit", label: "CrossFit", emoji: "💪" },
  { key: "pilates", label: "Pilates", emoji: "🎯" },
  { key: "hiking", label: "Hiking", emoji: "🏔️" },
  { key: "rowing", label: "Rowing", emoji: "🚣" },
  { key: "dancing", label: "Dancing", emoji: "💃" },
  { key: "stretching", label: "Stretching", emoji: "🤸" },
  { key: "other", label: "Other", emoji: "⚡" },
];

// Approximate calories per minute for each exercise at moderate intensity
const CALORIES_PER_MIN: Record<string, number> = {
  weightlifting: 6, running: 10, cycling: 8, swimming: 9, football: 8,
  basketball: 8, tennis: 7, boxing: 10, yoga: 3, crossfit: 12,
  pilates: 4, hiking: 6, rowing: 9, dancing: 5, stretching: 3, other: 5,
};

type Workout = {
  id: string;
  exercise_type: string;
  duration_min: number | null;
  calories: number | null;
  notes: string | null;
  logged_at: string;
};

export default function ActivityPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"log" | "history" | "stats">("log");
  const [userId, setUserId] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  // Log form
  const [selectedType, setSelectedType] = useState("weightlifting");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [autoCalc, setAutoCalc] = useState(true);
  const [notes, setNotes] = useState("");
  const [logging, setLogging] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: workoutData }, { data: userData }] = await Promise.all([
      supabase.from("workouts").select("*").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(50),
      supabase.from("users").select("current_streak").eq("id", user.id).single(),
    ]);

    setWorkouts(workoutData ?? []);
    setStreak(userData?.current_streak ?? 0);
    setLoading(false);
  }

  function calcCalories(type: string, mins: string) {
    const m = parseFloat(mins);
    if (!m || !type) return "";
    return Math.round((CALORIES_PER_MIN[type] ?? 5) * m).toString();
  }

  function handleTypeChange(type: string) {
    setSelectedType(type);
    if (autoCalc && duration) setCalories(calcCalories(type, duration));
  }

  function handleDurationChange(val: string) {
    setDuration(val);
    if (autoCalc) setCalories(calcCalories(selectedType, val));
  }

  async function logWorkout() {
    if (!userId || !duration) return;
    setLogging(true);
    const cal = autoCalc ? parseInt(calcCalories(selectedType, duration)) || null : parseInt(calories) || null;
    const { data } = await supabase.from("workouts").insert({
      user_id: userId,
      exercise_type: selectedType,
      duration_min: parseInt(duration) || null,
      calories: cal,
      notes: notes.trim() || null,
      logged_at: new Date().toISOString(),
    }).select().single();

    if (data) {
      setWorkouts((prev) => [data, ...prev]);
      setDuration("");
      setCalories("");
      setNotes("");
      setJustLogged(true);
      setTimeout(() => setJustLogged(false), 3000);
      checkAndAwardWorkoutBadges(userId);
    }
    setLogging(false);
  }

  // Stats calculations
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeek = workouts.filter((w) => new Date(w.logged_at) >= weekStart);
  const weekWorkouts = thisWeek.length;
  const weekMinutes = thisWeek.reduce((s, w) => s + (w.duration_min ?? 0), 0);
  const weekCalories = thisWeek.reduce((s, w) => s + (w.calories ?? 0), 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = workouts.filter((w) => new Date(w.logged_at) >= monthStart);
  const monthWorkouts = thisMonth.length;
  const monthMinutes = thisMonth.reduce((s, w) => s + (w.duration_min ?? 0), 0);
  const monthCalories = thisMonth.reduce((s, w) => s + (w.calories ?? 0), 0);

  // Most used exercise
  const typeCount: Record<string, number> = {};
  for (const w of workouts) typeCount[w.exercise_type] = (typeCount[w.exercise_type] ?? 0) + 1;
  const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];
  const topTypeInfo = topType ? EXERCISE_TYPES.find((e) => e.key === topType[0]) : null;

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  async function deleteWorkout(id: string) {
    await supabase.from("workouts").delete().eq("id", id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: "20px 16px", paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5, margin: 0 }}>Activity</h1>
          <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>Track your workouts</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1a1a1a", borderRadius: 12, padding: "8px 14px", border: "1px solid #2a2a2a" }}>
          <span style={{ fontSize: 18 }}>🔥</span>
          <div>
            <div style={{ fontWeight: 800, color: "#FF4500", fontSize: 18, lineHeight: 1 }}>{streak}</div>
            <div style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>STREAK</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#1a1a1a", borderRadius: 12, padding: 3, marginBottom: 20 }}>
        {(["log", "history", "stats"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: tab === t ? "#FF4500" : "transparent", color: tab === t ? "#fff" : "#555", fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>
            {t === "log" ? "📝 Log" : t === "history" ? "📋 History" : "📊 Stats"}
          </button>
        ))}
      </div>

      {/* LOG TAB */}
      {tab === "log" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {justLogged && (
            <div style={{ background: "#052e16", border: "1px solid #22c55e44", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 14 }}>Workout logged!</span>
            </div>
          )}

          {/* Exercise type */}
          <div>
            <label style={labelStyle}>EXERCISE TYPE</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {EXERCISE_TYPES.map((e) => (
                <button key={e.key} onClick={() => handleTypeChange(e.key)}
                  style={{ padding: "10px 4px", borderRadius: 12, border: `1px solid ${selectedType === e.key ? "#FF4500" : "#2a2a2a"}`, background: selectedType === e.key ? "#FF450022" : "#1a1a1a", color: selectedType === e.key ? "#FF4500" : "#888", fontWeight: 600, fontSize: 10, cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{e.emoji}</div>
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label style={labelStyle}>DURATION (MINUTES)</label>
            <input type="number" value={duration} onChange={(e) => handleDurationChange(e.target.value)}
              placeholder="e.g. 45"
              style={inputStyle} />
          </div>

          {/* Calories */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>CALORIES BURNED</label>
              <button onClick={() => setAutoCalc(!autoCalc)}
                style={{ fontSize: 11, color: autoCalc ? "#FF4500" : "#555", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                {autoCalc ? "⚡ Auto" : "✏️ Manual"}
              </button>
            </div>
            <input type="number" value={calories} onChange={(e) => { setAutoCalc(false); setCalories(e.target.value); }}
              placeholder={autoCalc ? "Auto-calculated" : "e.g. 350"}
              style={{ ...inputStyle, color: autoCalc ? "#555" : "#fff" }} />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>NOTES (OPTIONAL)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Felt strong today, PR on bench"
              style={inputStyle} />
          </div>

          <button onClick={logWorkout} disabled={!duration || logging}
            style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: duration ? "#FF4500" : "#1a1a1a", color: duration ? "#fff" : "#555", fontWeight: 800, fontSize: 16, cursor: duration ? "pointer" : "default", opacity: logging ? 0.6 : 1 }}>
            {logging ? "Logging..." : "💪 Log Workout"}
          </button>

          {/* Goals shortcut */}
          <button onClick={() => router.push("/app/goals")}
            style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid #2a2a2a", background: "transparent", color: "#888", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            🎯 Goals & Streak →
          </button>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {workouts.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 52 }}>📋</div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 18, marginTop: 16 }}>No workouts yet</p>
              <p style={{ color: "#555", fontSize: 14 }}>Log your first workout to get started!</p>
              <button onClick={() => setTab("log")}
                style={{ marginTop: 20, padding: "12px 28px", borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Log Workout
              </button>
            </div>
          ) : workouts.map((w) => {
            const typeInfo = EXERCISE_TYPES.find((e) => e.key === w.exercise_type) ?? { emoji: "⚡", label: w.exercise_type };
            return (
              <div key={w.id} style={{ background: "#1a1a1a", borderRadius: 16, padding: 14, border: "1px solid #2a2a2a", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, border: "1px solid #2a2a2a" }}>
                  {typeInfo.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{typeInfo.label}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {w.duration_min && <span>⏱ {w.duration_min} min</span>}
                    {w.calories && <span>🔥 {w.calories} kcal</span>}
                  </div>
                  {w.notes && <div style={{ fontSize: 12, color: "#555", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.notes}</div>}
                  <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{timeAgo(w.logged_at)}</div>
                </div>
                <button onClick={() => deleteWorkout(w.id)}
                  style={{ background: "none", border: "none", color: "#444", fontSize: 16, cursor: "pointer", padding: 4, flexShrink: 0 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* STATS TAB */}
      {tab === "stats" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* This week */}
          <div style={{ background: "#1a1a1a", borderRadius: 18, padding: 18, border: "1px solid #2a2a2a" }}>
            <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>THIS WEEK</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <StatBox value={weekWorkouts} label="Workouts" color="#FF4500" />
              <StatBox value={weekMinutes} label="Minutes" color="#f59e0b" />
              <StatBox value={weekCalories} label="Calories" color="#22c55e" />
            </div>
          </div>

          {/* This month */}
          <div style={{ background: "#1a1a1a", borderRadius: 18, padding: 18, border: "1px solid #2a2a2a" }}>
            <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>THIS MONTH</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <StatBox value={monthWorkouts} label="Workouts" color="#FF4500" />
              <StatBox value={monthMinutes} label="Minutes" color="#f59e0b" />
              <StatBox value={monthCalories} label="Calories" color="#22c55e" />
            </div>
          </div>

          {/* All time */}
          <div style={{ background: "#1a1a1a", borderRadius: 18, padding: 18, border: "1px solid #2a2a2a" }}>
            <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>ALL TIME</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <StatBox value={workouts.length} label="Workouts" color="#FF4500" />
              <StatBox value={workouts.reduce((s, w) => s + (w.duration_min ?? 0), 0)} label="Minutes" color="#f59e0b" />
              <StatBox value={workouts.reduce((s, w) => s + (w.calories ?? 0), 0)} label="Calories" color="#22c55e" />
            </div>
          </div>

          {/* Top sport */}
          {topTypeInfo && (
            <div style={{ background: "#1a1a1a", borderRadius: 18, padding: 18, border: "1px solid #2a2a2a", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 40 }}>{topTypeInfo.emoji}</div>
              <div>
                <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 0.5 }}>FAVOURITE SPORT</div>
                <div style={{ fontWeight: 800, color: "#fff", fontSize: 18, marginTop: 4 }}>{topTypeInfo.label}</div>
                <div style={{ fontSize: 13, color: "#888" }}>{topType[1]} session{topType[1] !== 1 ? "s" : ""} logged</div>
              </div>
            </div>
          )}

          {workouts.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <div style={{ fontSize: 52 }}>📊</div>
              <p style={{ color: "#888", marginTop: 16 }}>Log workouts to see your stats</p>
              <button onClick={() => setTab("log")}
                style={{ marginTop: 16, padding: "12px 28px", borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Log First Workout
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: "center", background: "#111", borderRadius: 12, padding: "12px 8px", border: "1px solid #2a2a2a" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 11, color: "#555", fontWeight: 600, marginTop: 4 }}>{label}</div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: "#555", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "11px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" };
