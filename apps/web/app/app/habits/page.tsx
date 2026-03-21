"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

/* ─── Types ─────────────────────────────────────────────────────── */
type Habit = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  created_at: string;
};

type HabitLog = {
  id: string;
  habit_id: string;
  logged_date: string; // YYYY-MM-DD
};

const COLORS = ["var(--accent)", "#a855f7", "var(--success)", "#f59e0b", "#3b82f6", "#ec4899", "#14b8a6"];
const EMOJIS = ["💪", "🏃", "🧘", "💧", "🥗", "😴", "📖", "🚴", "🏋️", "🎯", "⚡", "🔥", "🧠", "🌿", "🏊"];
const PRESET_HABITS = [
  { name: "Morning workout", emoji: "💪", color: "var(--accent)" },
  { name: "Drink 2L water", emoji: "💧", color: "#3b82f6" },
  { name: "Sleep 8 hours", emoji: "😴", color: "#a855f7" },
  { name: "Healthy meal", emoji: "🥗", color: "var(--success)" },
  { name: "Meditate", emoji: "🧘", color: "#14b8a6" },
  { name: "No junk food", emoji: "🚫", color: "#f59e0b" },
];

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysInRange(days: number): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return result;
}

function calcStreak(logs: Set<string>): number {
  let streak = 0;
  let d = new Date();
  while (true) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (logs.has(key)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

export default function HabitsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const today = localToday();
  const last7 = daysInRange(7);

  // New habit form
  const [showForm, setShowForm] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("💪");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: habitsData }, { data: logsData }] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("habit_logs").select("*").eq("user_id", user.id).gte("logged_date", daysInRange(30)[0]),
    ]);

    setHabits(habitsData ?? []);
    setLogs(logsData ?? []);
    setLoading(false);
  }

  async function toggleLog(habitId: string) {
    if (!userId || toggling) return;
    setToggling(habitId);
    const existing = logs.find((l) => l.habit_id === habitId && l.logged_date === today);
    if (existing) {
      await supabase.from("habit_logs").delete().eq("id", existing.id);
      setLogs((prev) => prev.filter((l) => l.id !== existing.id));
    } else {
      const { data } = await supabase.from("habit_logs").insert({
        user_id: userId,
        habit_id: habitId,
        logged_date: today,
      }).select().single();
      if (data) setLogs((prev) => [...prev, data]);
    }
    setToggling(null);
  }

  async function addHabit(name: string, emoji: string, color: string) {
    if (!userId || !name.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("habits").insert({
      user_id: userId,
      name: name.trim(),
      emoji,
      color,
      created_at: new Date().toISOString(),
    }).select().single();
    if (data) setHabits((prev) => [...prev, data]);
    setNewName(""); setNewEmoji("💪"); setNewColor(COLORS[0]);
    setShowForm(false); setShowPresets(false);
    setSaving(false);
  }

  async function deleteHabit(habitId: string) {
    await supabase.from("habit_logs").delete().eq("habit_id", habitId);
    await supabase.from("habits").delete().eq("id", habitId);
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setLogs((prev) => prev.filter((l) => l.habit_id !== habitId));
  }

  // Today's completion
  const todayCompleted = habits.filter((h) => logs.some((l) => l.habit_id === h.id && l.logged_date === today)).length;
  const todayTotal = habits.length;
  const todayPct = todayTotal === 0 ? 0 : Math.round((todayCompleted / todayTotal) * 100);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer", padding: 0 }}>←</button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>Habits</h1>
            <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 2 }}>Build consistency, one day at a time</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ width: 36, height: 36, borderRadius: 18, background: "var(--accent)", border: "none", color: "var(--text-primary)", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          +
        </button>
      </div>

      {/* Today summary */}
      {habits.length > 0 && (
        <div style={{ background: "var(--bg-card)", borderRadius: 18, padding: 18, border: "1px solid var(--border)", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5 }}>TODAY'S PROGRESS</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text-primary)", marginTop: 4 }}>
                {todayCompleted}/{todayTotal} <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-faint)" }}>habits</span>
              </div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: todayPct === 100 ? "var(--success)" : "var(--accent)" }}>
              {todayPct}%
            </div>
          </div>
          <div style={{ background: "var(--bg-page)", borderRadius: 8, height: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${todayPct}%`, background: todayPct === 100 ? "var(--success)" : "var(--accent)", borderRadius: 8, transition: "width 0.4s ease" }} />
          </div>
          {todayPct === 100 && (
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--success)", fontWeight: 700, textAlign: "center" }}>
              🎉 Perfect day! All habits completed!
            </div>
          )}
        </div>
      )}

      {/* Habit list */}
      {habits.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60, paddingBottom: 40 }}>
          <div style={{ fontSize: 56 }}>🎯</div>
          <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 18, marginTop: 16 }}>No habits yet</p>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Start tracking daily habits to build consistency</p>
          <button onClick={() => setShowPresets(true)}
            style={{ marginTop: 20, padding: "12px 28px", borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Quick Start with Presets
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {habits.map((habit) => {
            const doneToday = logs.some((l) => l.habit_id === habit.id && l.logged_date === today);
            const habitLogs = new Set(logs.filter((l) => l.habit_id === habit.id).map((l) => l.logged_date));
            const streak = calcStreak(habitLogs);

            return (
              <div key={habit.id} style={{ background: "var(--bg-card)", borderRadius: 16, border: `1px solid ${doneToday ? habit.color + "44" : "var(--bg-card-alt)"}`, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px" }}>
                  {/* Emoji + check */}
                  <button onClick={() => toggleLog(habit.id)} disabled={toggling === habit.id}
                    style={{ width: 48, height: 48, borderRadius: 14, border: `2px solid ${doneToday ? habit.color : "var(--bg-input)"}`, background: doneToday ? habit.color + "22" : "var(--bg-page)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, transition: "all 0.2s" }}>
                    {doneToday ? "✅" : habit.emoji}
                  </button>

                  {/* Name + streak */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: doneToday ? "var(--text-primary)" : "var(--text-secondary)", fontSize: 15 }}>{habit.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                      {streak > 0 && (
                        <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>🔥 {streak}d streak</span>
                      )}
                      <span style={{ fontSize: 11, color: "var(--text-ultra-faint)" }}>
                        {habitLogs.size} day{habitLogs.size !== 1 ? "s" : ""} total
                      </span>
                    </div>
                  </div>

                  {/* Delete */}
                  <button onClick={() => deleteHabit(habit.id)}
                    style={{ background: "none", border: "none", color: "#333", fontSize: 16, cursor: "pointer", padding: 4, flexShrink: 0 }}>✕</button>
                </div>

                {/* Last 7 days mini heatmap */}
                <div style={{ display: "flex", gap: 4, padding: "8px 16px 12px", borderTop: "1px solid var(--border)" }}>
                  {last7.map((d) => {
                    const done = habitLogs.has(d);
                    const isToday = d === today;
                    return (
                      <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <div style={{ width: "100%", maxWidth: 28, height: 28, borderRadius: 6, background: done ? habit.color : "var(--bg-card-alt)", border: isToday ? `1px solid ${habit.color}88` : "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: done ? 12 : 10 }}>
                          {done ? "✓" : ""}
                        </div>
                        <div style={{ fontSize: 9, color: "#333" }}>
                          {new Date(d + "T12:00:00").toLocaleDateString("en", { weekday: "narrow" })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preset shortcut */}
      {habits.length > 0 && (
        <button onClick={() => setShowPresets(true)}
          style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: 8 }}>
          ⚡ Add from presets
        </button>
      )}

      {/* Add Habit Modal */}
      {showForm && (
        <div onClick={() => setShowForm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, border: "1px solid var(--border)", paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, marginBottom: 20 }}>New Habit</h2>

            {/* Name */}
            <label style={labelStyle}>HABIT NAME</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Morning workout"
              style={inputStyle} autoFocus />

            {/* Emoji picker */}
            <label style={{ ...labelStyle, marginTop: 14 }}>EMOJI</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => setNewEmoji(e)}
                  style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${newEmoji === e ? "var(--accent)" : "var(--bg-input)"}`, background: newEmoji === e ? "#FF450022" : "var(--bg-card-alt)", fontSize: 20, cursor: "pointer" }}>
                  {e}
                </button>
              ))}
            </div>

            {/* Color picker */}
            <label style={labelStyle}>COLOR</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setNewColor(c)}
                  style={{ width: 32, height: 32, borderRadius: 16, background: c, border: `3px solid ${newColor === c ? "var(--text-primary)" : "transparent"}`, cursor: "pointer" }} />
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={() => addHabit(newName, newEmoji, newColor)} disabled={!newName.trim() || saving}
                style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: newName.trim() ? "var(--accent)" : "var(--bg-card-alt)", color: newName.trim() ? "var(--text-primary)" : "var(--text-faint)", fontWeight: 700, fontSize: 15, cursor: newName.trim() ? "pointer" : "default", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Adding..." : "Add Habit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Presets Modal */}
      {showPresets && (
        <div onClick={() => setShowPresets(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, border: "1px solid var(--border)", paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, marginBottom: 16 }}>Quick Start Presets</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PRESET_HABITS.map((p) => {
                const alreadyAdded = habits.some((h) => h.name === p.name);
                return (
                  <button key={p.name} onClick={() => !alreadyAdded && addHabit(p.name, p.emoji, p.color)} disabled={alreadyAdded || saving}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, border: `1px solid ${alreadyAdded ? "var(--bg-card-alt)" : p.color + "44"}`, background: alreadyAdded ? "var(--bg-page)" : p.color + "11", cursor: alreadyAdded ? "default" : "pointer", opacity: alreadyAdded ? 0.4 : 1 }}>
                    <span style={{ fontSize: 26 }}>{p.emoji}</span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{p.name}</div>
                    </div>
                    <span style={{ fontSize: 13, color: alreadyAdded ? "var(--text-faint)" : p.color, fontWeight: 700 }}>
                      {alreadyAdded ? "Added" : "+ Add"}
                    </span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => { setShowPresets(false); setShowForm(true); }}
              style={{ width: "100%", marginTop: 14, padding: 14, borderRadius: 12, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              Create custom habit →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "var(--text-faint)", letterSpacing: 0.5, display: "block", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12,
  padding: "12px 14px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box",
};
