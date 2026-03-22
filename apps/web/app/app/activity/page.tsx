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
  const [tab, setTab] = useState<"log" | "history" | "stats" | "board">("log");
  const [userId, setUserId] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  // Leaderboard
  type LeaderEntry = { user_id: string; username: string; avatar_url: string | null; workout_count: number; streak: number };
  const [boardMode, setBoardMode] = useState<"workouts" | "streak">("workouts");
  const [boardActivity, setBoardActivity] = useState<string>("all");
  const [boardScope, setBoardScope] = useState<"global" | "city">("global");
  const [myCity, setMyCity] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);

  // Body measurements
  type Measurement = { id: string; weight: number | null; body_fat: number | null; chest: number | null; waist: number | null; hips: number | null; notes: string | null; logged_at: string };
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [mWeight, setMWeight] = useState("");
  const [mBodyFat, setMBodyFat] = useState("");
  const [mChest, setMChest] = useState("");
  const [mWaist, setMWaist] = useState("");
  const [mHips, setMHips] = useState("");
  const [mNotes, setMNotes] = useState("");
  const [savingMeasure, setSavingMeasure] = useState(false);

  // Log form
  const [selectedType, setSelectedType] = useState("weightlifting");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [autoCalc, setAutoCalc] = useState(true);
  const [notes, setNotes] = useState("");
  const [withPartner, setWithPartner] = useState(false);
  const [logging, setLogging] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  // Recap card
  type RecapData = { exerciseType: string; emoji: string; duration: number; calories: number | null; streak: number; notes: string | null };
  const [recapData, setRecapData] = useState<RecapData | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: workoutData }, { data: userData }, { data: measureData }] = await Promise.all([
      supabase.from("workouts").select("*").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(50),
      supabase.from("users").select("current_streak, city").eq("id", user.id).single(),
      supabase.from("body_measurements").select("*").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(20),
    ]);

    setWorkouts(workoutData ?? []);
    setStreak(userData?.current_streak ?? 0);
    setMyCity(userData?.city ?? null);
    setMeasurements(measureData ?? []);
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
    let data: any = null;
    try {
      const result = await supabase.from("workouts").insert({
        user_id: userId,
        exercise_type: selectedType,
        duration_min: parseInt(duration) || null,
        calories: cal,
        notes: notes.trim() || null,
        with_partner: withPartner,
        logged_at: new Date().toISOString(),
      }).select().single();
      data = result.data;
      if (result.error) throw result.error;
    } catch (err: any) {
      // If column doesn't exist yet, retry without with_partner
      if (err?.message?.includes("with_partner") || err?.code === "PGRST204" || err?.code === "42703") {
        console.warn("with_partner column not found, inserting without it");
        const result = await supabase.from("workouts").insert({
          user_id: userId,
          exercise_type: selectedType,
          duration_min: parseInt(duration) || null,
          calories: cal,
          notes: notes.trim() || null,
          logged_at: new Date().toISOString(),
        }).select().single();
        data = result.data;
      } else {
        console.error("logWorkout error:", err);
      }
    }

    if (data) {
      setWorkouts((prev) => [data, ...prev]);
      const typeInfo = EXERCISE_TYPES.find((t) => t.key === selectedType);
      const durationVal = parseInt(duration);
      setRecapData({
        exerciseType: typeInfo?.label ?? selectedType,
        emoji: typeInfo?.emoji ?? "💪",
        duration: durationVal,
        calories: cal,
        streak: streak + 1,
        notes: notes.trim() || null,
      });

      // Auto-post to social feed
      const feedContent = [
        `${typeInfo?.emoji ?? "💪"} ${durationVal} min ${typeInfo?.label ?? selectedType}`,
        cal ? `· ${cal} cal burned` : null,
        notes.trim() ? `— "${notes.trim()}"` : null,
      ].filter(Boolean).join(" ");
      await supabase.from("feed_posts").insert({
        user_id: userId,
        post_type: "workout",
        content: feedContent,
        meta: { exercise_type: selectedType, duration_min: durationVal, calories: cal },
      });

      setDuration("");
      setCalories("");
      setNotes("");
      setJustLogged(true);
      setTimeout(() => setJustLogged(false), 4000);
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

  // Weekly behavioral insights
  const last30 = workouts.filter((w) => Date.now() - new Date(w.logged_at).getTime() < 30 * 86400000);
  const dayCounts: Record<number, number> = {};
  const hourCounts: Record<number, number> = {};
  for (const w of last30) {
    const d = new Date(w.logged_at);
    dayCounts[d.getDay()] = (dayCounts[d.getDay()] ?? 0) + 1;
    const bucket = Math.floor(d.getHours() / 6); // 0=midnight,1=morning,2=afternoon,3=evening
    hourCounts[bucket] = (hourCounts[bucket] ?? 0) + 1;
  }
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const activeDays = Object.entries(dayCounts).sort((a, b) => +b[1] - +a[1]);
  const bestDay = activeDays[0] ? daysFull[parseInt(activeDays[0][0])] : null;
  const timeSlots = ["🌙 Late night", "🌅 Morning", "☀️ Afternoon", "🌆 Evening"];
  const topSlot = Object.entries(hourCounts).sort((a, b) => +b[1] - +a[1])[0];
  const bestTime = topSlot ? timeSlots[parseInt(topSlot[0])] : null;
  const activeDayCount = Object.keys(dayCounts).length;
  const restDayCount = 7 - Math.min(activeDayCount, 7);

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  async function saveMeasurement() {
    if (!userId || (!mWeight && !mWaist && !mChest && !mHips && !mBodyFat)) return;
    setSavingMeasure(true);
    const { data } = await supabase.from("body_measurements").insert({
      user_id: userId,
      weight: parseFloat(mWeight) || null,
      body_fat: parseFloat(mBodyFat) || null,
      chest: parseFloat(mChest) || null,
      waist: parseFloat(mWaist) || null,
      hips: parseFloat(mHips) || null,
      notes: mNotes.trim() || null,
      logged_at: new Date().toISOString(),
    }).select().single();
    if (data) {
      setMeasurements((prev) => [data, ...prev]);
      setMWeight(""); setMBodyFat(""); setMChest(""); setMWaist(""); setMHips(""); setMNotes("");
      setShowMeasureForm(false);
    }
    setSavingMeasure(false);
  }

  async function deleteWorkout(id: string) {
    await supabase.from("workouts").delete().eq("id", id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }

  async function loadLeaderboard(mode: "workouts" | "streak", activity = boardActivity, scope = boardScope) {
    setBoardLoading(true);

    // If city scope, get city user IDs first
    let cityUserIds: string[] | null = null;
    if (scope === "city" && myCity) {
      const { data: cityUsers } = await supabase
        .from("users").select("id").ilike("city", myCity);
      cityUserIds = (cityUsers ?? []).map((u: any) => u.id);
      if (cityUserIds.length === 0) { setLeaderboard([]); setBoardLoading(false); return; }
    }

    if (mode === "workouts") {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      let query = supabase
        .from("workouts")
        .select("user_id")
        .gte("logged_at", since.toISOString());
      if (activity !== "all") query = query.eq("exercise_type", activity);
      if (cityUserIds) query = query.in("user_id", cityUserIds);
      const { data: rows } = await query;

      const counts: Record<string, number> = {};
      for (const r of rows ?? []) counts[r.user_id] = (counts[r.user_id] ?? 0) + 1;
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);

      if (top.length === 0) { setLeaderboard([]); setBoardLoading(false); return; }
      const ids = top.map(([id]) => id);
      const { data: users } = await supabase.from("users").select("id, username, avatar_url, current_streak").in("id", ids);
      const umap = Object.fromEntries((users ?? []).map((u: any) => [u.id, u]));

      setLeaderboard(top.map(([uid, cnt]) => ({
        user_id: uid,
        username: umap[uid]?.username ?? "?",
        avatar_url: umap[uid]?.avatar_url ?? null,
        workout_count: cnt,
        streak: umap[uid]?.current_streak ?? 0,
      })));
    } else {
      let query = supabase
        .from("users")
        .select("id, username, avatar_url, current_streak")
        .order("current_streak", { ascending: false })
        .limit(20);
      if (cityUserIds) query = query.in("id", cityUserIds);
      const { data: users } = await query;

      setLeaderboard((users ?? []).map((u: any) => ({
        user_id: u.id,
        username: u.username,
        avatar_url: u.avatar_url,
        workout_count: 0,
        streak: u.current_streak ?? 0,
      })));
    }
    setBoardLoading(false);
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: "20px 16px", paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.5, margin: 0 }}>Activity</h1>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Track your workouts</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-card-alt)", borderRadius: 12, padding: "8px 14px", border: "1px solid var(--border-medium)" }}>
          <span style={{ fontSize: 18 }}>🔥</span>
          <div>
            <div style={{ fontWeight: 800, color: "var(--accent)", fontSize: 18, lineHeight: 1 }}>{streak}</div>
            <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600 }}>STREAK</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 3, background: "var(--bg-card-alt)", borderRadius: 12, padding: 3, marginBottom: 20 }}>
        {(["log", "history", "stats", "board"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); if (t === "board") loadLeaderboard(boardMode); }}
            style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: tab === t ? "var(--accent)" : "transparent", color: tab === t ? "var(--text-primary)" : "var(--text-faint)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
            {t === "log" ? "📝 Log" : t === "history" ? "📋 History" : t === "stats" ? "📊 Stats" : "🏆 Board"}
          </button>
        ))}
      </div>

      {/* LOG TAB */}
      {tab === "log" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {justLogged && (
            <div style={{ background: "#052e16", border: "1px solid #22c55e44", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <span style={{ color: "var(--success)", fontWeight: 700, fontSize: 14 }}>Workout logged!</span>
            </div>
          )}

          {/* Form card */}
          <div style={{ background: "var(--bg-card)", borderRadius: 18, padding: "20px 18px", border: "1px solid var(--border-medium)", boxShadow: "var(--shadow-lift)", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", letterSpacing: 1.5, textTransform: "uppercase" }}>TODAY'S WORKOUT</div>

            {/* Exercise type */}
            <div>
              <label style={labelStyle}>EXERCISE TYPE</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {EXERCISE_TYPES.map((e) => (
                  <button key={e.key} onClick={() => handleTypeChange(e.key)}
                    style={{ padding: "10px 4px", borderRadius: 12, border: `1px solid ${selectedType === e.key ? "var(--accent)" : "var(--bg-input)"}`, background: selectedType === e.key ? "#FF450022" : "var(--bg-card-alt)", color: selectedType === e.key ? "var(--accent)" : "var(--text-muted)", fontWeight: 600, fontSize: 10, cursor: "pointer", textAlign: "center" }}>
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

            {/* Notes */}
            <div>
              <label style={labelStyle}>NOTES (OPTIONAL)</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Felt strong today, PR on bench"
                style={inputStyle} />
            </div>

            {/* Partner toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: "12px 14px" }}>
              <label style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Did you train with a partner? 🤝
              </label>
              <button onClick={() => setWithPartner(!withPartner)}
                style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: withPartner ? "var(--accent)" : "#333", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 2, left: withPartner ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: "var(--text-primary)", transition: "left 0.2s", display: "block" }} />
              </button>
            </div>

            {/* Calories (de-emphasized) */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600, letterSpacing: 0.5 }}>CALORIES BURNED</label>
                <button onClick={() => setAutoCalc(!autoCalc)}
                  style={{ fontSize: 10, color: autoCalc ? "var(--accent)" : "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {autoCalc ? "⚡ Auto" : "✏️ Manual"}
                </button>
              </div>
              <input type="number" value={calories} onChange={(e) => { setAutoCalc(false); setCalories(e.target.value); }}
                placeholder={autoCalc ? "Auto-calculated" : "e.g. 350"}
                style={{ ...inputStyle, fontSize: 13, padding: "8px 12px", color: autoCalc ? "var(--text-faint)" : "var(--text-primary)" }} />
            </div>

            <button onClick={logWorkout} disabled={!duration || logging}
              style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: duration ? "#1f1a17" : "var(--bg-card-alt)", color: duration ? "#fff" : "var(--text-faint)", fontWeight: 800, fontSize: 16, cursor: duration ? "pointer" : "default", opacity: logging ? 0.6 : 1 }}>
              {logging ? "Logging..." : "💪 Log Workout"}
            </button>
          </div>

          {/* Goals shortcut */}
          <button onClick={() => router.push("/app/goals")}
            style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
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
              <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 18, marginTop: 16 }}>No workouts yet</p>
              <p style={{ color: "var(--text-faint)", fontSize: 14 }}>Log your first workout to get started!</p>
              <button onClick={() => setTab("log")}
                style={{ marginTop: 20, padding: "12px 28px", borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Log Workout
              </button>
            </div>
          ) : workouts.map((w) => {
            const typeInfo = EXERCISE_TYPES.find((e) => e.key === w.exercise_type) ?? { emoji: "⚡", label: w.exercise_type };
            return (
              <div key={w.id} style={{ background: "var(--bg-card-alt)", borderRadius: 16, padding: 14, border: "1px solid var(--border-medium)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, border: "1px solid var(--border-medium)" }}>
                  {typeInfo.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{typeInfo.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {w.duration_min && <span>⏱ {w.duration_min} min</span>}
                    {w.calories && <span>🔥 {w.calories} kcal</span>}
                  </div>
                  {w.notes && <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.notes}</div>}
                  <div style={{ fontSize: 11, color: "var(--text-ultra-faint)", marginTop: 4 }}>{timeAgo(w.logged_at)}</div>
                </div>
                <button onClick={() => deleteWorkout(w.id)}
                  style={{ background: "none", border: "none", color: "var(--text-ultra-faint)", fontSize: 16, cursor: "pointer", padding: 4, flexShrink: 0 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* STATS TAB */}
      {tab === "stats" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── YOUR PROGRESS — circular ring ─────────────────────── */}
          {(() => {
            const weekGoal = 5;
            const pct = Math.min(Math.round((weekWorkouts / weekGoal) * 100), 100);
            const r = 70; const stroke = 10; const cx = 90; const cy = 90;
            const circ = 2 * Math.PI * r;
            const outerPct = Math.min((weekWorkouts / weekGoal), 1);
            const innerPct = Math.min((weekMinutes / 150), 1); // 150 min/week goal
            return (
              <div style={{ background: "linear-gradient(135deg, #0d1a1a, #0a1210)", borderRadius: 20, padding: 24, border: "1px solid #0d3a3a", textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#00d4ff", letterSpacing: 1.5, marginBottom: 16 }}>YOUR PROGRESS</div>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <svg width={180} height={180} viewBox="0 0 180 180">
                    {/* Outer track */}
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a2a2a" strokeWidth={stroke} />
                    {/* Outer arc — workouts (cyan) */}
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#00d4ff" strokeWidth={stroke}
                      strokeDasharray={`${circ * outerPct} ${circ}`}
                      strokeLinecap="round"
                      transform={`rotate(-90 ${cx} ${cy})`}
                      style={{ filter: "drop-shadow(0 0 6px #00d4ff88)" }}
                    />
                    {/* Inner track */}
                    <circle cx={cx} cy={cy} r={r - 16} fill="none" stroke="#1a2a1a" strokeWidth={stroke - 2} />
                    {/* Inner arc — minutes (green) */}
                    <circle cx={cx} cy={cy} r={r - 16} fill="none" stroke="#22c55e" strokeWidth={stroke - 2}
                      strokeDasharray={`${2 * Math.PI * (r - 16) * innerPct} ${2 * Math.PI * (r - 16)}`}
                      strokeLinecap="round"
                      transform={`rotate(-90 ${cx} ${cy})`}
                      style={{ filter: "drop-shadow(0 0 4px #22c55e88)" }}
                    />
                    {/* Center text */}
                    <text x={cx} y={cy - 6} textAnchor="middle" fill="#00d4ff" fontSize={28} fontWeight={900}>{pct}%</text>
                    <text x={cx} y={cy + 16} textAnchor="middle" fill="#22c55e" fontSize={14} fontWeight={800}>{pct}%</text>
                  </svg>
                </div>
                {/* Circular icon stats */}
                <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16 }}>
                  {[
                    { emoji: "🏋️", value: weekWorkouts, label: "Workouts", color: "#00d4ff" },
                    { emoji: "🔥", value: weekCalories, label: "Calories", color: "#22c55e" },
                    { emoji: "⏱", value: weekMinutes, label: "Minutes", color: "#f59e0b" },
                  ].map((s) => (
                    <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 54, height: 54, borderRadius: "50%", border: `2px solid ${s.color}`, background: s.color + "18", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 0 12px ${s.color}44` }}>
                        <span style={{ fontSize: 18 }}>{s.emoji}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: "#666", fontWeight: 700 }}>{s.label.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                {/* Weekly bar chart */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 10, color: "#555", fontWeight: 700, marginBottom: 10 }}>WEEKLY ACTIVITY</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-end", justifyContent: "center", height: 48 }}>
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day, i) => {
                      const count = workouts.filter((w) => new Date(w.logged_at).getDay() === i && new Date(w.logged_at) >= weekStart).length;
                      const h = count > 0 ? Math.max(count * 14, 10) : 4;
                      return (
                        <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 24, height: h, borderRadius: 4, background: count > 0 ? "linear-gradient(#00d4ff, #22c55e)" : "#1a2a2a", boxShadow: count > 0 ? "0 0 6px #00d4ff66" : "none" }} />
                          <span style={{ fontSize: 9, color: "#444", fontWeight: 700 }}>{day.slice(0,1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button onClick={() => setTab("log")}
                  style={{ marginTop: 18, width: "100%", padding: "13px 0", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #00d4ff, #22c55e)", color: "#000", fontWeight: 900, fontSize: 15, cursor: "pointer", letterSpacing: 0.5 }}>
                  💪 Log Activity
                </button>
              </div>
            );
          })()}

          {/* ── Weekly Bar Chart ───────────────────────────────── */}
          {(() => {
            // Build data for the last 7 calendar days (today + 6 days back)
            const today7 = new Date();
            today7.setHours(23, 59, 59, 999);
            const days7: { label: string; date: Date; isToday: boolean }[] = [];
            for (let i = 6; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const dayLabel = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()];
              days7.push({ label: dayLabel, date: d, isToday: i === 0 });
            }
            const counts7 = days7.map(({ date }) => {
              const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              return workouts.filter((w) => w.logged_at.startsWith(ds)).length;
            });
            const maxCount = Math.max(...counts7, 1);
            const BAR_MAX_H = 64;
            return (
              <div style={{ background: "var(--bg-card-alt)", borderRadius: 18, padding: 18, border: "1px solid var(--border-medium)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5 }}>THIS WEEK</div>
                  <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>{counts7.reduce((a, b) => a + b, 0)} workouts</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end", justifyContent: "space-between" }}>
                  {days7.map(({ label, isToday }, idx) => {
                    const count = counts7[idx];
                    const barH = count > 0 ? Math.max(Math.round((count / maxCount) * BAR_MAX_H), 12) : 6;
                    const isActive = count > 0;
                    return (
                      <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        {count > 0 && (
                          <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 800 }}>{count}</div>
                        )}
                        <div style={{
                          width: "100%", height: barH, borderRadius: 6,
                          background: isActive
                            ? (isToday ? "var(--accent)" : "linear-gradient(180deg, #FF6B35, #FF4500)")
                            : "var(--bg-card)",
                          border: isToday ? "1px solid var(--accent)" : `1px solid ${isActive ? "#FF450044" : "var(--border)"}`,
                          boxShadow: isActive ? "0 0 8px #FF450033" : "none",
                          transition: "height 0.3s ease",
                        }} />
                        <div style={{
                          fontSize: 10, fontWeight: isToday ? 900 : 600,
                          color: isToday ? "var(--accent)" : "var(--text-faint)",
                        }}>{label}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 14, display: "flex", gap: 14, justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent)" }} />
                    <span style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600 }}>Today</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: "linear-gradient(180deg, #FF6B35, #FF4500)" }} />
                    <span style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600 }}>Active day</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--bg-card)", border: "1px solid var(--border)" }} />
                    <span style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600 }}>Rest day</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* This month */}
          <div style={{ background: "var(--bg-card-alt)", borderRadius: 18, padding: 18, border: "1px solid var(--border-medium)" }}>
            <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>THIS MONTH</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <StatBox value={monthWorkouts} label="Workouts" color="#00d4ff" />
              <StatBox value={monthMinutes} label="Minutes" color="#f59e0b" />
              <StatBox value={monthCalories} label="Calories" color="#22c55e" />
            </div>
          </div>

          {/* All time */}
          <div style={{ background: "var(--bg-card-alt)", borderRadius: 18, padding: 18, border: "1px solid var(--border-medium)" }}>
            <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>ALL TIME</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <StatBox value={workouts.length} label="Workouts" color="#00d4ff" />
              <StatBox value={workouts.reduce((s, w) => s + (w.duration_min ?? 0), 0)} label="Minutes" color="#f59e0b" />
              <StatBox value={workouts.reduce((s, w) => s + (w.calories ?? 0), 0)} label="Calories" color="#22c55e" />
            </div>
          </div>

          {/* Top sport */}
          {topTypeInfo && (
            <div style={{ background: "var(--bg-card-alt)", borderRadius: 18, padding: 18, border: "1px solid var(--border-medium)", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 40 }}>{topTypeInfo.emoji}</div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5 }}>FAVOURITE SPORT</div>
                <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 18, marginTop: 4 }}>{topTypeInfo.label}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{topType[1]} session{topType[1] !== 1 ? "s" : ""} logged</div>
              </div>
            </div>
          )}

          {workouts.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <div style={{ fontSize: 52 }}>📊</div>
              <p style={{ color: "var(--text-muted)", marginTop: 16 }}>Log workouts to see your stats</p>
              <button onClick={() => setTab("log")}
                style={{ marginTop: 16, padding: "12px 28px", borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Log First Workout
              </button>
            </div>
          )}

          {/* Weekly Behavioral Insights */}
          {last30.length >= 3 && (
            <div style={{ background: "var(--bg-card-alt)", borderRadius: 18, padding: 18, border: "1px solid var(--border-medium)" }}>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>⚡ WEEKLY BEHAVIORAL INSIGHTS</div>

              {/* Day heatmap */}
              <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                {dayNames.map((d, i) => {
                  const count = dayCounts[i] ?? 0;
                  const max = activeDays[0] ? parseInt(activeDays[0][1] as any) : 1;
                  const intensity = count === 0 ? 0 : Math.ceil((count / max) * 3);
                  const bg = intensity === 0 ? "var(--bg-card-alt)" : intensity === 1 ? "#FF450033" : intensity === 2 ? "#FF450077" : "var(--accent)";
                  return (
                    <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ width: "100%", maxWidth: 34, height: 34, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {count > 0 && <span style={{ fontSize: 10, color: "var(--text-primary)", fontWeight: 700 }}>{count}</span>}
                      </div>
                      <span style={{ fontSize: 9, color: "var(--text-ultra-faint)", fontWeight: 600 }}>{d}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {bestDay && (
                  <div style={{ background: "var(--bg-card)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 700 }}>POWER DAY</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>{bestDay}</div>
                  </div>
                )}
                {bestTime && (
                  <div style={{ background: "var(--bg-card)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 700 }}>BEST TIME</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>{bestTime}</div>
                  </div>
                )}
                <div style={{ background: "var(--bg-card)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 700 }}>ACTIVE DAYS/WK</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--success)", marginTop: 4 }}>{activeDayCount} <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 400 }}>days</span></div>
                </div>
                <div style={{ background: "var(--bg-card)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 700 }}>REST DAYS/WK</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#f59e0b", marginTop: 4 }}>{restDayCount} <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 400 }}>days</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Body Measurements */}
          <div style={{ background: "var(--bg-card-alt)", borderRadius: 18, padding: 18, border: "1px solid var(--border-medium)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5 }}>BODY MEASUREMENTS</div>
              <button onClick={() => setShowMeasureForm(true)}
                style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", background: "transparent", border: "1px solid var(--accent-faint)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
                + Log
              </button>
            </div>
            {measurements.length === 0 ? (
              <p style={{ color: "var(--text-faint)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>No measurements logged yet</p>
            ) : (
              <>
                {/* Latest values */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[
                    { label: "Weight", val: measurements.find(m => m.weight)?.weight, unit: "kg" },
                    { label: "Body Fat", val: measurements.find(m => m.body_fat)?.body_fat, unit: "%" },
                    { label: "Chest", val: measurements.find(m => m.chest)?.chest, unit: "cm" },
                    { label: "Waist", val: measurements.find(m => m.waist)?.waist, unit: "cm" },
                  ].filter(x => x.val != null).map(({ label, val, unit }) => (
                    <div key={label} style={{ background: "var(--bg-card)", borderRadius: 10, padding: "10px 12px", border: "1px solid var(--border-medium)" }}>
                      <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600, marginBottom: 4 }}>{label.toUpperCase()}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{val} <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{unit}</span></div>
                    </div>
                  ))}
                </div>
                {/* Weight Trend Chart */}
                {measurements.filter(m => m.weight).length >= 2 && (() => {
                  const pts = measurements.filter(m => m.weight).slice(0, 10).reverse();
                  const vals = pts.map(m => m.weight as number);
                  const min = Math.min(...vals) - 1;
                  const max = Math.max(...vals) + 1;
                  const W = 280, H = 70, pad = 8;
                  const x = (i: number) => pad + (i / (pts.length - 1)) * (W - pad * 2);
                  const y = (v: number) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
                  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.weight as number)}`).join(" ");
                  const fillD = `${pathD} L ${x(pts.length - 1)} ${H} L ${x(0)} ${H} Z`;
                  return (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>WEIGHT TREND</div>
                      <div style={{ background: "var(--bg-card)", borderRadius: 10, padding: "10px 8px", border: "1px solid var(--border-medium)", position: "relative" }}>
                        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
                          <defs>
                            <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path d={fillD} fill="url(#wgrad)" />
                          <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          {pts.map((p, i) => (
                            <circle key={i} cx={x(i)} cy={y(p.weight as number)} r="3" fill="var(--accent)" />
                          ))}
                          {pts.map((p, i) => (
                            <text key={`l${i}`} x={x(i)} y={y(p.weight as number) - 6} textAnchor="middle" fontSize="8" fill="var(--text-faint)">{p.weight}</text>
                          ))}
                        </svg>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                          <span style={{ fontSize: 9, color: "var(--text-ultra-faint)" }}>{new Date(pts[0].logged_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                          <span style={{ fontSize: 9, color: "var(--text-ultra-faint)" }}>{new Date(pts[pts.length - 1].logged_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {/* History list */}
                <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>HISTORY</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {measurements.slice(0, 5).map((m) => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--text-muted)" }}>
                        {m.weight && <span>⚖️ {m.weight}kg</span>}
                        {m.body_fat && <span>💧 {m.body_fat}%</span>}
                        {m.waist && <span>📏 {m.waist}cm</span>}
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-ultra-faint)" }}>{new Date(m.logged_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Measurement Form Modal */}
      {showMeasureForm && (
        <div onClick={() => setShowMeasureForm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", border: "1px solid var(--border)", paddingBottom: 24 }}>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, marginBottom: 20 }}>Log Measurements</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={labelStyle}>WEIGHT (kg)</label><input type="number" value={mWeight} onChange={(e) => setMWeight(e.target.value)} placeholder="e.g. 80" style={inputStyle} /></div>
                <div><label style={labelStyle}>BODY FAT (%)</label><input type="number" value={mBodyFat} onChange={(e) => setMBodyFat(e.target.value)} placeholder="e.g. 18" style={inputStyle} /></div>
                <div><label style={labelStyle}>CHEST (cm)</label><input type="number" value={mChest} onChange={(e) => setMChest(e.target.value)} placeholder="e.g. 100" style={inputStyle} /></div>
                <div><label style={labelStyle}>WAIST (cm)</label><input type="number" value={mWaist} onChange={(e) => setMWaist(e.target.value)} placeholder="e.g. 85" style={inputStyle} /></div>
                <div><label style={labelStyle}>HIPS (cm)</label><input type="number" value={mHips} onChange={(e) => setMHips(e.target.value)} placeholder="e.g. 95" style={inputStyle} /></div>
                <div><label style={labelStyle}>NOTES</label><input value={mNotes} onChange={(e) => setMNotes(e.target.value)} placeholder="Optional" style={inputStyle} /></div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowMeasureForm(false)}
                  style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={saveMeasurement} disabled={savingMeasure}
                  style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: savingMeasure ? 0.6 : 1 }}>
                  {savingMeasure ? "Saving..." : "Save Measurements"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEADERBOARD TAB */}
      {tab === "board" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Scope: Global / My City */}
          <div style={{ display: "flex", gap: 4 }}>
            {(["global", "city"] as const).map((s) => {
              const disabled = s === "city" && !myCity;
              const active = boardScope === s;
              return (
                <button key={s} disabled={disabled}
                  onClick={() => { if (disabled) return; setBoardScope(s); loadLeaderboard(boardMode, boardActivity, s); }}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 12, border: `1px solid ${active ? "var(--accent)" : "var(--bg-input)"}`, background: active ? "#FF450018" : "transparent", color: active ? "var(--accent)" : disabled ? "#333" : "var(--text-faint)", fontWeight: 700, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer" }}>
                  {s === "global" ? "🌍 Global" : myCity ? `📍 ${myCity}` : "📍 City (set in profile)"}
                </button>
              );
            })}
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 4, background: "var(--bg-card-alt)", borderRadius: 12, padding: 3 }}>
            {(["workouts", "streak"] as const).map((m) => (
              <button key={m} onClick={() => { setBoardMode(m); loadLeaderboard(m, boardActivity, boardScope); }}
                style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", background: boardMode === m ? "var(--accent)" : "transparent", color: boardMode === m ? "var(--text-primary)" : "var(--text-faint)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {m === "workouts" ? "💪 Weekly" : "🔥 Streak"}
              </button>
            ))}
          </div>

          {/* Activity filter (only relevant for weekly mode) */}
          {boardMode === "workouts" && (
            <div style={{ overflowX: "auto", paddingBottom: 4 }}>
              <div style={{ display: "flex", gap: 6, minWidth: "max-content" }}>
                {[{ key: "all", label: "All", emoji: "🏆" }, ...EXERCISE_TYPES].map((e) => (
                  <button key={e.key}
                    onClick={() => { setBoardActivity(e.key); loadLeaderboard(boardMode, e.key, boardScope); }}
                    style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${boardActivity === e.key ? "var(--accent)" : "var(--bg-input)"}`, background: boardActivity === e.key ? "#FF450022" : "var(--bg-card-alt)", color: boardActivity === e.key ? "var(--accent)" : "var(--text-faint)", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {e.emoji} {e.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {boardLoading ? (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
              <div style={{ width: 28, height: 28, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 52 }}>🏆</div>
              <p style={{ color: "var(--text-muted)", marginTop: 16, fontWeight: 700 }}>
                {boardScope === "city" ? `No activity in ${myCity} yet` : "No data yet — log your first workout!"}
              </p>
              {boardScope === "city" && <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 8 }}>Be the first to lead your city!</p>}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {leaderboard.map((entry, i) => {
                const isMe = entry.user_id === userId;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <div key={entry.user_id} style={{ display: "flex", alignItems: "center", gap: 12, background: isMe ? "#1a0800" : "var(--bg-card-alt)", borderRadius: 14, padding: "12px 14px", border: `1px solid ${isMe ? "#FF450044" : "var(--bg-input)"}` }}>
                    <div style={{ width: 28, textAlign: "center", fontWeight: 800, fontSize: medal ? 20 : 14, color: "var(--text-faint)", flexShrink: 0 }}>
                      {medal ?? `${i + 1}`}
                    </div>
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: 18, objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 18, background: isMe ? "var(--accent)" : "var(--bg-input)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "var(--text-primary)", flexShrink: 0 }}>
                        {entry.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: isMe ? "var(--accent)" : "var(--text-primary)", fontSize: 14 }}>
                        @{entry.username} {isMe && <span style={{ fontSize: 11, color: "var(--accent)" }}>(you)</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, color: "var(--accent)", fontSize: 18 }}>
                        {boardMode === "workouts" ? entry.workout_count : entry.streak}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)" }}>
                        {boardMode === "workouts" ? "workouts" : "day streak"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Workout Recap Card Modal */}
      {recapData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 360 }}>
            {/* Card */}
            <div style={{
              background: "linear-gradient(145deg, #1a0800, #0f0f0f)",
              border: "1px solid #FF450044",
              borderRadius: 24, padding: 28,
              boxShadow: "0 0 40px #FF450022",
            }}>
              {/* Badge top */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 8 }}>{recapData.emoji}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.5 }}>{recapData.exerciseType}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Workout Complete 🎉</div>
              </div>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                <div style={{ background: "#1a0a00", borderRadius: 14, padding: "12px 8px", textAlign: "center", border: "1px solid #FF450033" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--accent)" }}>{recapData.duration}</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600, marginTop: 2 }}>MINUTES</div>
                </div>
                <div style={{ background: "#0a1f0a", borderRadius: 14, padding: "12px 8px", textAlign: "center", border: "1px solid #22c55e33" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#22c55e" }}>{recapData.calories ?? "—"}</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600, marginTop: 2 }}>CALORIES</div>
                </div>
                <div style={{ background: "#1a0a00", borderRadius: 14, padding: "12px 8px", textAlign: "center", border: "1px solid #FF450033" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--accent)" }}>🔥{recapData.streak}</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600, marginTop: 2 }}>STREAK</div>
                </div>
              </div>

              {recapData.notes && (
                <div style={{ background: "#111", borderRadius: 12, padding: "10px 14px", marginBottom: 20, border: "1px solid var(--border)" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0, fontStyle: "italic" }}>"{recapData.notes}"</p>
                </div>
              )}

              <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", marginBottom: 20 }}>
                FlexMatches · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowShareModal(true)}
                  style={{ flex: 1, padding: 13, borderRadius: 12, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  📤 Share
                </button>
                <button onClick={() => setRecapData(null)}
                  style={{ flex: 2, padding: 13, borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                  Done 💪
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && recapData && (
        <div onClick={() => setShowShareModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 340, background: "var(--bg-card)", borderRadius: 20, padding: 24, border: "1px solid var(--border-medium)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>Share Workout</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 16, lineHeight: 1.5 }}>
              {`Just completed ${recapData.duration} min of ${recapData.exerciseType}${recapData.calories ? ` · ${recapData.calories} cal` : ""} · 🔥 ${recapData.streak} day streak — via FlexMatches`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={async () => {
                  const text = `Just completed ${recapData.duration} min of ${recapData.exerciseType}${recapData.calories ? ` · ${recapData.calories} cal` : ""} · 🔥 ${recapData.streak} day streak — via FlexMatches`;
                  await navigator.clipboard.writeText(text);
                  setShareCopied(true);
                  setTimeout(() => { setShareCopied(false); setShowShareModal(false); }, 1500);
                }}
                style={{ padding: "13px 0", borderRadius: 12, border: "none", background: shareCopied ? "var(--success)" : "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {shareCopied ? "✓ Copied!" : "📋 Copy to Clipboard"}
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                style={{ padding: "12px 0", borderRadius: 12, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: "center", background: "var(--bg-card)", borderRadius: 12, padding: "12px 8px", border: "1px solid var(--border-medium)" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, marginTop: 4 }}>{label}</div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-faint)", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "11px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" };
