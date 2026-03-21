"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

/* ─── Types ─────────────────────────────────────────────────────── */
type Workout = { id: string; exercise_type: string; duration_min: number | null; calories: number | null; logged_at: string };
type Measurement = { id: string; weight: number | null; body_fat: number | null; waist: number | null; logged_at: string };
type Timeframe = "week" | "month" | "3months" | "year";

const TIMEFRAME_DAYS: Record<Timeframe, number> = { week: 7, month: 30, "3months": 90, year: 365 };
const TIMEFRAME_LABELS: Record<Timeframe, string> = { week: "7D", month: "30D", "3months": "90D", year: "1Y" };

/* ─── SVG Mini Line Chart ────────────────────────────────────────── */
function LineChart({ data, color, height = 60, width = "100%" }: { data: number[]; color: string; height?: number; width?: string }) {
  if (data.length < 2) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 12 }}>Not enough data</div>;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 300; const H = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 8) - 4;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,${H} ` + pts + ` ${W},${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width, height, display: "block" }}>
      <defs>
        <linearGradient id={`g${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#g${color.replace("#", "")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 8) - 4;
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

/* ─── Bar Chart ─────────────────────────────────────────────────── */
function BarChart({ data, labels, color }: { data: number[]; labels: string[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ width: "100%", borderRadius: "4px 4px 0 0", background: v > 0 ? color : "var(--bg-input)", transition: "height 0.3s", height: `${Math.max((v / max) * 64, v > 0 ? 6 : 2)}px` }} />
          <span style={{ fontSize: 9, color: "var(--text-ultra-faint)", fontWeight: 600 }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Donut Chart ────────────────────────────────────────────────── */
function DonutChart({ pct, color, label, value }: { pct: number; color: string; label: string; value: string }) {
  const r = 34; const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={80} height={80} viewBox="0 0 80 80">
        <circle cx={40} cy={40} r={r} fill="none" stroke="var(--bg-card-alt)" strokeWidth={10} />
        <circle cx={40} cy={40} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 40 40)" />
        <text x={40} y={40} textAnchor="middle" dominantBaseline="middle" fill="var(--text-primary)" fontSize={14} fontWeight={800}>{pct}%</text>
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
        <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 700 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Consistency Score ──────────────────────────────────────────── */
function calcConsistencyScore(workouts: Workout[], days: number): { score: number; label: string; message: string; color: string } {
  const activeDays = new Set(workouts.filter(w => Date.now() - new Date(w.logged_at).getTime() < days * 86400000)
    .map(w => new Date(w.logged_at).toDateString())).size;
  const pct = Math.round((activeDays / days) * 100);
  const score = Math.min(10, Math.round((activeDays / days) * 10 * (days / 7)));

  if (score >= 8) return { score, label: "Elite", color: "var(--success)", message: `🏆 Elite consistency! You trained ${activeDays} of the last ${days} days.` };
  if (score >= 6) return { score, label: "Strong", color: "var(--accent)", message: `💪 Strong effort! ${activeDays} active days. Push for 80%+ consistency.` };
  if (score >= 4) return { score, label: "Building", color: "#f59e0b", message: `📈 Building momentum. Aim for ${Math.ceil(days * 0.6) - activeDays} more sessions this period.` };
  return { score, label: "Starting", color: "var(--text-faint)", message: `🌱 Just getting started. Every workout counts — consistency compounds over time.` };
}

/* ─── Injury Prevention ──────────────────────────────────────────── */
function buildInjuryWarnings(workouts: Workout[]): { risk: string; sport: string; tip: string; level: "high" | "medium" }[] {
  const last14 = workouts.filter(w => Date.now() - new Date(w.logged_at).getTime() < 14 * 86400000);
  const typeCounts: Record<string, number> = {};
  for (const w of last14) typeCounts[w.exercise_type] = (typeCounts[w.exercise_type] ?? 0) + 1;

  const warnings: { risk: string; sport: string; tip: string; level: "high" | "medium" }[] = [];
  if ((typeCounts["running"] ?? 0) >= 6) warnings.push({ risk: "Shin splints / IT band", sport: "Running", tip: "More than 6 runs in 2 weeks. Add rest day + foam roll calves.", level: "high" });
  if ((typeCounts["weightlifting"] ?? 0) >= 8) warnings.push({ risk: "Overuse / joint strain", sport: "Weightlifting", tip: "Heavy lifting 8+ times in 2 weeks. Schedule a deload and check form.", level: "high" });
  if ((typeCounts["cycling"] ?? 0) >= 7) warnings.push({ risk: "Knee overuse", sport: "Cycling", tip: "High cycling frequency. Check seat height and add hip mobility work.", level: "medium" });
  if ((typeCounts["boxing"] ?? 0) >= 5) warnings.push({ risk: "Wrist / shoulder strain", sport: "Boxing", tip: "5+ boxing sessions. Ensure proper glove fit and wrist wraps.", level: "medium" });

  const totalSessions = last14.length;
  if (totalSessions >= 12) warnings.push({ risk: "General overtraining", sport: "All sports", tip: `${totalSessions} sessions in 2 weeks is very high. Your body needs recovery time.`, level: "high" });

  return warnings;
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tf, setTf] = useState<Timeframe>("month");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [challengesCount, setChallengesCount] = useState(0);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: wo }, { data: me }, { data: evts }, { data: chal }, { data: meas }] = await Promise.all([
      supabase.from("workouts").select("id, exercise_type, duration_min, calories, logged_at").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(500),
      supabase.from("users").select("current_streak, longest_streak").eq("id", user.id).single(),
      supabase.from("event_participants").select("event_id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("challenge_participants").select("challenge_id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("body_measurements").select("id, weight, body_fat, waist, logged_at").eq("user_id", user.id).order("logged_at", { ascending: true }).limit(50),
    ]);

    setWorkouts(wo ?? []);
    setStreak(me?.current_streak ?? 0);
    setLongestStreak(me?.longest_streak ?? 0);
    setEventsCount((evts as any)?.count ?? 0);
    setChallengesCount((chal as any)?.count ?? 0);
    setMeasurements(meas ?? []);
    setLoading(false);
  }

  /* ─── Derived data ─────────────────────────────────────────────── */
  const days = TIMEFRAME_DAYS[tf];
  const cutoff = new Date(Date.now() - days * 86400000);
  const periodWorkouts = workouts.filter(w => new Date(w.logged_at) >= cutoff);

  const totalWorkouts = periodWorkouts.length;
  const totalMinutes = periodWorkouts.reduce((s, w) => s + (w.duration_min ?? 0), 0);
  const totalCalories = periodWorkouts.reduce((s, w) => s + (w.calories ?? 0), 0);
  const activeDays = new Set(periodWorkouts.map(w => new Date(w.logged_at).toDateString())).size;

  // Build chart data — group by bucket
  function buildChartData(buckets: number, labelFn: (i: number) => string) {
    const bucketSize = days / buckets;
    const data = Array(buckets).fill(0);
    const labels = Array.from({ length: buckets }, (_, i) => labelFn(i));
    for (const w of periodWorkouts) {
      const age = (Date.now() - new Date(w.logged_at).getTime()) / 86400000;
      const idx = Math.min(buckets - 1, Math.floor((days - age) / bucketSize));
      if (idx >= 0) data[idx]++;
    }
    return { data, labels };
  }

  const chartBuckets = tf === "week" ? 7 : tf === "month" ? 4 : tf === "3months" ? 12 : 12;
  const { data: chartData, labels: chartLabels } = (() => {
    if (tf === "week") {
      const labels = ["M", "T", "W", "T", "F", "S", "S"];
      const data = Array(7).fill(0);
      for (const w of periodWorkouts) {
        const d = new Date(w.logged_at).getDay(); // 0=Sun
        const idx = d === 0 ? 6 : d - 1;
        data[idx]++;
      }
      return { data, labels };
    }
    if (tf === "month") return buildChartData(4, (i) => `W${i + 1}`);
    if (tf === "3months") return buildChartData(12, (i) => {
      const d = new Date(Date.now() - (11 - i) * (days / 12) * 86400000);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    return buildChartData(12, (i) => {
      const d = new Date(Date.now() - (11 - i) * 30 * 86400000);
      return d.toLocaleString("en", { month: "short" });
    });
  })();

  // Calorie trend
  const calChartData = (() => {
    const data = Array(chartBuckets).fill(0);
    const bucketSize = days / chartBuckets;
    for (const w of periodWorkouts) {
      const age = (Date.now() - new Date(w.logged_at).getTime()) / 86400000;
      const idx = Math.min(chartBuckets - 1, Math.floor((days - age) / bucketSize));
      if (idx >= 0) data[idx] += w.calories ?? 0;
    }
    return data;
  })();

  // Weight trend from measurements
  const weightData = measurements.filter(m => m.weight && new Date(m.logged_at) >= cutoff);
  const weightValues = weightData.map(m => m.weight!);
  const weightLabels = weightData.map(m => new Date(m.logged_at).toLocaleDateString("en", { month: "short", day: "numeric" }));
  const weightChange = weightValues.length >= 2 ? (weightValues[weightValues.length - 1] - weightValues[0]).toFixed(1) : null;

  // Consistency
  const consistency = calcConsistencyScore(workouts, days);
  const consistencyPct = Math.min(100, Math.round((activeDays / days) * 100));

  // Personal records
  const longestSession = Math.max(...workouts.map(w => w.duration_min ?? 0), 0);
  const maxCalSession = Math.max(...workouts.map(w => w.calories ?? 0), 0);
  const typeCount: Record<string, number> = {};
  for (const w of workouts) typeCount[w.exercise_type] = (typeCount[w.exercise_type] ?? 0) + 1;
  const topSport = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];

  // Injury warnings
  const injuryWarnings = buildInjuryWarnings(workouts);

  // Streak Insurance check
  const lastWorkout = workouts[0];
  const daysSinceLast = lastWorkout ? Math.floor((Date.now() - new Date(lastWorkout.logged_at).getTime()) / 86400000) : 999;
  const streakAtRisk = streak > 0 && daysSinceLast >= 1;

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer", padding: 0 }}>←</button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>Analytics</h1>
            <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 2 }}>Your fitness journey in numbers</p>
          </div>
        </div>
        <span style={{ fontSize: 11, color: "var(--accent)", background: "#1a0800", border: "1px solid var(--accent-faint)", borderRadius: 999, padding: "3px 10px", fontWeight: 700 }}>AI</span>
      </div>

      {/* Streak Insurance Banner */}
      {streakAtRisk && (
        <div style={{ background: "linear-gradient(135deg, #1a0800, #2a1000)", borderRadius: 16, padding: 14, border: "1px solid #f59e0b44", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div style={{ fontWeight: 800, color: "#f59e0b", fontSize: 14 }}>Streak Insurance</div>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6, margin: "0 0 10px" }}>
            Your 🔥 {streak}-day streak is at risk! You haven't logged a workout today. Even a short 15-min session counts.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {["🧘 Yoga", "🚶 Walk", "🤸 Stretch"].map((act) => (
              <button key={act} onClick={() => router.push("/app/activity")}
                style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: "1px solid #f59e0b44", background: "#f59e0b11", color: "#f59e0b", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                {act}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeframe toggle */}
      <div style={{ display: "flex", gap: 4, background: "var(--bg-card-alt)", borderRadius: 12, padding: 3, marginBottom: 20 }}>
        {(["week", "month", "3months", "year"] as Timeframe[]).map((t) => (
          <button key={t} onClick={() => setTf(t)}
            style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: tf === t ? "var(--accent)" : "transparent", color: tf === t ? "var(--text-primary)" : "var(--text-faint)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {TIMEFRAME_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { emoji: "💪", label: "Workouts", value: totalWorkouts, color: "var(--accent)" },
          { emoji: "⏱️", label: "Minutes", value: totalMinutes, color: "#a855f7" },
          { emoji: "🔥", label: "Calories", value: totalCalories.toLocaleString(), color: "#f59e0b" },
          { emoji: "📅", label: "Active Days", value: activeDays, color: "var(--success)" },
        ].map(({ emoji, label, value, color }) => (
          <div key={label} style={{ background: "var(--bg-card)", borderRadius: 16, padding: "14px 16px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, marginTop: 2 }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Workout frequency chart */}
      <div style={{ background: "var(--bg-card)", borderRadius: 18, padding: 18, border: "1px solid var(--border)", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5 }}>WORKOUT FREQUENCY</div>
          <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>{totalWorkouts} sessions</div>
        </div>
        <BarChart data={chartData} labels={chartLabels} color="var(--accent)" />
      </div>

      {/* Calorie burn trend */}
      {totalCalories > 0 && (
        <div style={{ background: "var(--bg-card)", borderRadius: 18, padding: 18, border: "1px solid var(--border)", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5 }}>CALORIE BURN TREND</div>
            <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>{totalCalories.toLocaleString()} kcal</div>
          </div>
          <LineChart data={calChartData} color="#f59e0b" />
        </div>
      )}

      {/* Consistency Score */}
      <div style={{ background: "var(--bg-card)", borderRadius: 18, padding: 18, border: `1px solid ${consistency.color}33`, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>WORKOUT CONSISTENCY SCORE</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 12 }}>
          <DonutChart pct={consistencyPct} color={consistency.color} label={consistency.label} value={`${activeDays}/${days}d`} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: consistency.color }}>{consistency.score}<span style={{ fontSize: 16, color: "var(--text-faint)" }}>/10</span></div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>{consistency.label}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>🔥 Current streak: {streak} days</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>🏆 Best streak: {longestStreak} days</div>
          </div>
        </div>
        <div style={{ background: "var(--bg-card-alt)", borderRadius: 12, padding: "10px 14px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6, margin: 0 }}>{consistency.message}</p>
        </div>
      </div>

      {/* Body Change Analysis */}
      {measurements.length >= 2 && (
        <div style={{ background: "var(--bg-card)", borderRadius: 18, padding: 18, border: "1px solid var(--border)", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5 }}>BODY CHANGE ANALYSIS</div>
            {weightChange && (
              <div style={{ fontSize: 13, fontWeight: 800, color: parseFloat(weightChange) < 0 ? "var(--success)" : parseFloat(weightChange) > 0 ? "#ff6b6b" : "var(--text-muted)" }}>
                {parseFloat(weightChange) > 0 ? "+" : ""}{weightChange} kg
              </div>
            )}
          </div>
          {weightValues.length >= 2 && (
            <>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>Weight (kg)</div>
              <LineChart data={weightValues} color="#3b82f6" height={70} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Start: {weightValues[0]} kg</span>
                <span style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 700 }}>Now: {weightValues[weightValues.length - 1]} kg</span>
              </div>
            </>
          )}
          {/* Latest measurements grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
            {[
              { label: "Body Fat", val: measurements.filter(m => m.body_fat).slice(-1)[0]?.body_fat, unit: "%" },
              { label: "Waist", val: measurements.filter(m => m.waist).slice(-1)[0]?.waist, unit: "cm" },
              { label: "Entries", val: measurements.length, unit: "logs" },
            ].map(({ label, val, unit }) => val != null && (
              <div key={label} style={{ background: "var(--bg-card-alt)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{val}</div>
                <div style={{ fontSize: 9, color: "var(--text-faint)", fontWeight: 700, marginTop: 2 }}>{unit} · {label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Insights / Personal Records */}
      <div style={{ background: "var(--bg-card)", borderRadius: 18, padding: 18, border: "1px solid var(--border)", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>PERSONAL RECORDS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { emoji: "🏅", label: "Total Workouts", value: `${workouts.length} sessions`, color: "var(--accent)" },
            { emoji: "⏱️", label: "Longest Session", value: `${longestSession} min`, color: "#a855f7" },
            { emoji: "🔥", label: "Best Calorie Burn", value: `${maxCalSession} kcal`, color: "#f59e0b" },
            { emoji: "🏆", label: "Best Streak", value: `${longestStreak} days`, color: "var(--success)" },
            ...(topSport ? [{ emoji: "⭐", label: "Favourite Sport", value: `${topSport[0]} (${topSport[1]}x)`, color: "#3b82f6" }] : []),
          ].map(({ emoji, label, value, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-card-alt)", borderRadius: 12, padding: "12px 14px" }}>
              <span style={{ fontSize: 20 }}>{emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement Metrics */}
      <div style={{ background: "var(--bg-card)", borderRadius: 18, padding: 18, border: "1px solid var(--border)", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>ENGAGEMENT & COMMUNITY</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            { emoji: "🎪", label: "Events", value: eventsCount, color: "#3b82f6" },
            { emoji: "🏆", label: "Challenges", value: challengesCount, color: "#f59e0b" },
            { emoji: "🔥", label: "Streak", value: streak, color: "var(--accent)" },
          ].map(({ emoji, label, value, color }) => (
            <div key={label} style={{ background: "var(--bg-card-alt)", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 22 }}>{emoji}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color, marginTop: 4 }}>{value}</div>
              <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 700, marginTop: 2 }}>{label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Injury Prevention */}
      {injuryWarnings.length > 0 && (
        <div style={{ background: "var(--bg-card)", borderRadius: 18, padding: 18, border: "1px solid #ff6b6b33", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#ff6b6b", fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>⚕️ INJURY PREVENTION ALERTS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {injuryWarnings.map((w, i) => (
              <div key={i} style={{ background: "var(--bg-card-alt)", borderRadius: 12, padding: "12px 14px", borderLeft: `3px solid ${w.level === "high" ? "#ff6b6b" : "#f59e0b"}` }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: w.level === "high" ? "#ff6b6b" : "#f59e0b", fontWeight: 700, background: w.level === "high" ? "#ff6b6b11" : "#f59e0b11", borderRadius: 6, padding: "2px 8px" }}>
                    {w.level === "high" ? "HIGH RISK" : "MEDIUM RISK"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700 }}>{w.sport}</span>
                </div>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13, marginBottom: 4 }}>{w.risk}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{w.tip}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state if no workouts */}
      {workouts.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 52 }}>📊</div>
          <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 18, marginTop: 16 }}>No data yet</p>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Log your first workout to unlock analytics</p>
          <button onClick={() => router.push("/app/activity")}
            style={{ marginTop: 20, padding: "12px 28px", borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Log Workout →
          </button>
        </div>
      )}
    </div>
  );
}
