"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { awardBadge } from "../../../lib/badges";

const WORKOUT_TYPES = [
  "Gym", "Running", "Cycling", "Swimming", "Boxing", "Yoga",
  "CrossFit", "Pilates", "HIIT", "Football", "Basketball", "Hiking", "Other",
];

const FITNESS_TIPS = [
  { emoji: "💧", tip: "Drink at least 8 glasses of water today. Hydration boosts performance by up to 20%." },
  { emoji: "😴", tip: "Aim for 7-9 hours of sleep. Muscle recovery happens during deep sleep." },
  { emoji: "🥗", tip: "Eat protein within 30 minutes after training to maximize muscle recovery." },
  { emoji: "🔥", tip: "Warm up for 5-10 minutes before every workout to prevent injury." },
  { emoji: "📈", tip: "Progressive overload is key — increase weight or reps each week to keep growing." },
  { emoji: "🧘", tip: "Add mobility work to your routine. Flexibility reduces injury risk significantly." },
  { emoji: "⏱️", tip: "Rest 60-90 seconds between sets for hypertrophy, 2-3 minutes for strength." },
];

type Workout = {
  id: string;
  workout_type: string;
  duration_minutes: number | null;
  notes: string | null;
  logged_at: string;
};

type Event = {
  id: string;
  title: string;
  sport: string;
  event_date: string;
  location: string | null;
};

type Goal = {
  id: string;
  title: string;
  goal_type: string;
  current_value: number;
  target_value: number | null;
  unit: string | null;
};

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function HomePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  // Workout log
  const [showLogForm, setShowLogForm] = useState(false);
  const [logType, setLogType] = useState("Gym");
  const [logDuration, setLogDuration] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logging, setLogging] = useState(false);
  const [todayWorkouts, setTodayWorkouts] = useState<Workout[]>([]);
  const [weekCount, setWeekCount] = useState(0);

  // Weight tracking
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [savingWeight, setSavingWeight] = useState(false);

  // Data
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const tip = FITNESS_TIPS[new Date().getDay() % FITNESS_TIPS.length];

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const today = localToday();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [{ data: userData }, { data: workoutsData }, { data: eventsData }, { data: goalsData }] = await Promise.all([
      supabase.from("users").select("username, current_streak, weight").eq("id", user.id).single(),
      supabase.from("workouts").select("*").eq("user_id", user.id).gte("logged_at", weekAgo).order("logged_at", { ascending: false }),
      supabase.from("events").select("id, title, sport, event_date, location").gte("event_date", today).order("event_date").limit(3),
      supabase.from("goals").select("id, title, goal_type, current_value, target_value, unit").eq("user_id", user.id).eq("status", "active").limit(3),
    ]);

    setUsername(userData?.username ?? "");
    setCurrentStreak(userData?.current_streak ?? 0);
    setCurrentWeight(userData?.weight ?? null);

    const allWorkouts = workoutsData ?? [];
    setTodayWorkouts(allWorkouts.filter((w: Workout) => w.logged_at.startsWith(today)));
    setWeekCount(allWorkouts.length);
    setUpcomingEvents(eventsData ?? []);
    setActiveGoals(goalsData ?? []);
    setLoading(false);
  }

  async function logWorkout() {
    if (!userId || !logType) return;
    setLogging(true);
    await supabase.from("workouts").insert({
      user_id: userId,
      workout_type: logType,
      duration_minutes: parseInt(logDuration) || null,
      notes: logNotes.trim() || null,
    });
    await awardBadge(userId, "goal_setter");
    setShowLogForm(false);
    setLogDuration("");
    setLogNotes("");
    setLogging(false);
    loadData();
  }

  async function saveWeight() {
    if (!userId || !weightInput) return;
    setSavingWeight(true);
    await supabase.from("users").update({ weight: parseFloat(weightInput) }).eq("id", userId);
    setCurrentWeight(parseFloat(weightInput));
    setWeightInput("");
    setShowWeightForm(false);
    setSavingWeight(false);
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>{getGreeting()},</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>@{username} 👋</div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <StatCard emoji="🔥" value={currentStreak} label="Day Streak" color="#FF4500" />
        <StatCard emoji="💪" value={weekCount} label="This Week" color="#a855f7" />
        <StatCard emoji="⚖️" value={currentWeight ? `${currentWeight}` : "—"} label="lbs" color="#22c55e" />
      </div>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setShowLogForm(true)}
          style={{ padding: "14px 0", borderRadius: 14, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          💪 Log Workout
        </button>
        <button onClick={() => setShowWeightForm(true)}
          style={{ padding: "14px 0", borderRadius: 14, border: "1px solid #2a2a2a", background: "transparent", color: "#ccc", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          ⚖️ Track Weight
        </button>
      </div>

      {/* Today's workouts */}
      {todayWorkouts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionTitle>Today's Workouts</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayWorkouts.map((w) => (
              <div key={w.id} style={{ background: "#111", borderRadius: 12, padding: "12px 14px", border: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{w.workout_type}</div>
                  {w.notes && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{w.notes}</div>}
                </div>
                {w.duration_minutes && (
                  <span style={{ fontSize: 13, color: "#FF4500", fontWeight: 700 }}>{w.duration_minutes} min</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fitness Tip */}
      <div style={{ background: "#1a0800", borderRadius: 16, padding: 16, border: "1px solid #FF450033", marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#FF4500", fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>TIP OF THE DAY</div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 24 }}>{tip.emoji}</span>
          <p style={{ color: "#ccc", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{tip.tip}</p>
        </div>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <SectionTitle>Active Goals</SectionTitle>
            <button onClick={() => router.push("/app/goals")}
              style={{ background: "none", border: "none", color: "#FF4500", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              See All →
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeGoals.map((g) => {
              const pct = g.target_value ? Math.min((g.current_value / g.target_value) * 100, 100) : 0;
              return (
                <div key={g.id} style={{ background: "#111", borderRadius: 12, padding: "12px 14px", border: "1px solid #1a1a1a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: "#fff", fontSize: 13 }}>{g.title}</span>
                    <span style={{ fontSize: 12, color: "#FF4500", fontWeight: 700 }}>{Math.round(pct)}%</span>
                  </div>
                  <div style={{ background: "#1a1a1a", borderRadius: 99, height: 5 }}>
                    <div style={{ background: "#FF4500", width: `${pct}%`, height: 5, borderRadius: 99, transition: "width 0.3s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <SectionTitle>Upcoming Events</SectionTitle>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => router.push("/app/events?create=1")}
              style={{ background: "#FF4500", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", borderRadius: 8, padding: "4px 10px" }}>
              + Create
            </button>
            <button onClick={() => router.push("/app/events")}
              style={{ background: "none", border: "none", color: "#FF4500", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              See All →
            </button>
          </div>
        </div>
        {upcomingEvents.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcomingEvents.map((e) => (
              <div key={e.id} onClick={() => router.push("/app/events")}
                style={{ background: "#111", borderRadius: 12, padding: "12px 14px", border: "1px solid #1a1a1a", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{e.title}</div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                    {e.sport} · {new Date(e.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "#FF4500", fontWeight: 700, background: "#1a0800", borderRadius: 8, padding: "3px 8px", border: "1px solid #FF450033" }}>Join</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shortcuts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => router.push("/app/activity")}
          style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid #FF450033", background: "#1a0800", color: "#FF4500", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>💪 Log a Workout</span>
          <span style={{ color: "#FF450088" }}>→</span>
        </button>
        <button onClick={() => router.push("/app/goals")}
          style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid #2a2a2a", background: "transparent", color: "#ccc", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🎯 Goals & Streak</span>
          <span style={{ color: "#555" }}>→</span>
        </button>
        <button onClick={() => router.push("/app/communities")}
          style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid #2a2a2a", background: "transparent", color: "#ccc", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🌍 Communities</span>
          <span style={{ color: "#555" }}>→</span>
        </button>
        <button onClick={() => router.push("/app/challenges")}
          style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid #2a2a2a", background: "transparent", color: "#ccc", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🏆 Fitness Challenges</span>
          <span style={{ color: "#555" }}>→</span>
        </button>
      </div>

      {/* Log Workout Modal */}
      {showLogForm && (
        <div onClick={() => setShowLogForm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, border: "1px solid #1a1a1a", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>Log Workout</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>WORKOUT TYPE</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {WORKOUT_TYPES.map((t) => (
                    <button key={t} onClick={() => setLogType(t)}
                      style={{ padding: "7px 12px", borderRadius: 999, border: `1px solid ${logType === t ? "#FF4500" : "#2a2a2a"}`, background: logType === t ? "#FF4500" : "transparent", color: logType === t ? "#fff" : "#888", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>DURATION (MINUTES)</label>
                <input value={logDuration} onChange={(e) => setLogDuration(e.target.value)}
                  type="number" placeholder="e.g. 45"
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>NOTES (OPTIONAL)</label>
                <input value={logNotes} onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="e.g. Leg day, new PR on squats"
                  style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 10, paddingBottom: 16 }}>
                <button onClick={() => setShowLogForm(false)}
                  style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={logWorkout} disabled={logging}
                  style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", opacity: logging ? 0.6 : 1 }}>
                  {logging ? "Logging..." : "Log Workout 💪"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Track Weight Modal */}
      {showWeightForm && (
        <div onClick={() => setShowWeightForm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, border: "1px solid #1a1a1a" }}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Track Weight</h2>
            {currentWeight && (
              <p style={{ color: "#555", fontSize: 13, marginBottom: 16 }}>Current: {currentWeight} lbs</p>
            )}
            <input value={weightInput} onChange={(e) => setWeightInput(e.target.value)}
              type="number" placeholder="Enter weight in lbs"
              style={{ ...inputStyle, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10, paddingBottom: 16 }}>
              <button onClick={() => setShowWeightForm(false)}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={saveWeight} disabled={savingWeight || !weightInput}
                style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", opacity: (savingWeight || !weightInput) ? 0.5 : 1 }}>
                {savingWeight ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ emoji, value, label, color }: { emoji: string; value: string | number; label: string; color: string }) {
  return (
    <div style={{ background: "#111", borderRadius: 14, padding: "14px 10px", border: "1px solid #1a1a1a", textAlign: "center" }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "#555", fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 0.5, marginBottom: 0 }}>{String(children).toUpperCase()}</div>;
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: "#555", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "11px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" };

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
