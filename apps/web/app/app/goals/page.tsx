"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { checkAndAwardGoalBadges, awardBadge } from "../../../lib/badges";
import { useUnits } from "../../../lib/useUnits";
import { sendPush } from "../../../lib/sendPush";

type Goal = {
  id: string;
  title: string;
  goal_type: string;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  deadline: string | null;
  status: string;
};

export default function GoalsPage() {
  const { weightUnit, distanceUnit } = useUnits();

  const GOAL_TYPES = [
    { key: "weight_loss", label: "Weight Loss", emoji: "⚖️", unit: weightUnit },
    { key: "muscle_gain", label: "Muscle Gain", emoji: "💪", unit: weightUnit },
    { key: "running", label: "Running", emoji: "🏃", unit: distanceUnit },
    { key: "workout_streak", label: "Workout Streak", emoji: "🔥", unit: "days" },
    { key: "steps", label: "Daily Steps", emoji: "👟", unit: "steps" },
    { key: "custom", label: "Custom", emoji: "🎯", unit: "" },
  ];
  const TYPE_MAP = Object.fromEntries(GOAL_TYPES.map((t) => [t.key, t]));

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("weight_loss");
  const [formTarget, setFormTarget] = useState("");
  const [formCurrent, setFormCurrent] = useState("");
  const [formUnit, setFormUnit] = useState("kg");
  const [formDeadline, setFormDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [sharingGoalId, setSharingGoalId] = useState<string | null>(null);
  const [sharedGoalId, setSharedGoalId] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => { loadGoals(); }, []);

  async function loadGoals() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data }, { data: streakData }] = await Promise.all([
      supabase.from("goals").select("*").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("users").select("current_streak, longest_streak, last_checkin_date").eq("id", user.id).single(),
    ]);

    setGoals(data ?? []);

    if (streakData) {
      setCurrentStreak(streakData.current_streak ?? 0);
      setLongestStreak(streakData.longest_streak ?? 0);
      setCheckedInToday(streakData.last_checkin_date === localToday());
    }

    setLoading(false);
  }

  async function checkIn() {
    if (!userId || checkedInToday) return;
    setCheckingIn(true);

    const today = localToday();
    const { data: streakData } = await supabase
      .from("users").select("current_streak, longest_streak, last_checkin_date").eq("id", userId).single();

    const lastDate = streakData?.last_checkin_date;
    const yesterday = localYesterday();
    const newStreak = lastDate === yesterday ? (streakData?.current_streak ?? 0) + 1 : 1;
    const newLongest = Math.max(newStreak, streakData?.longest_streak ?? 0);

    await supabase.from("users").update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_checkin_date: today,
    }).eq("id", userId);

    if (newStreak >= 7)  await awardBadge(userId, "week_warrior");
    if (newStreak >= 30) await awardBadge(userId, "month_champion");

    setCurrentStreak(newStreak);
    setLongestStreak(newLongest);
    setCheckedInToday(true);
    setCheckingIn(false);
    window.dispatchEvent(new Event("streak-checkin"));
  }

  function openAddForm() {
    setEditingGoal(null);
    setFormTitle("");
    setFormType("weight_loss");
    setFormTarget("");
    setFormCurrent("0");
    setFormUnit(weightUnit);
    setFormDeadline("");
    setShowForm(true);
  }

  function openEditForm(goal: Goal) {
    setEditingGoal(goal);
    setFormTitle(goal.title);
    setFormType(goal.goal_type);
    setFormTarget(goal.target_value?.toString() ?? "");
    setFormCurrent(goal.current_value?.toString() ?? "0");
    setFormUnit(goal.unit ?? "");
    setFormDeadline(goal.deadline ?? "");
    setShowForm(true);
  }

  async function saveGoal() {
    if (!userId || !formTitle.trim()) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      title: formTitle.trim(),
      goal_type: formType,
      target_value: parseFloat(formTarget) || null,
      current_value: parseFloat(formCurrent) || 0,
      unit: formUnit || TYPE_MAP[formType]?.unit || "",
      deadline: formDeadline || null,
      status: "active",
    };

    if (editingGoal) {
      await supabase.from("goals").update(payload).eq("id", editingGoal.id);
    } else {
      await supabase.from("goals").insert(payload);
    }
    if (userId) checkAndAwardGoalBadges(userId);
    setSaving(false);
    setShowForm(false);
    loadGoals();
  }

  async function updateProgress(goal: Goal, newValue: number) {
    await supabase.from("goals").update({ current_value: newValue }).eq("id", goal.id);
    setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, current_value: newValue } : g));
  }

  async function completeGoal(goalId: string) {
    const goal = goals.find((g) => g.id === goalId);
    await supabase.from("goals").update({ status: "completed" }).eq("id", goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    if (userId) {
      checkAndAwardGoalBadges(userId);
      if (goal) {
        await supabase.from("feed_posts").insert({
          user_id: userId,
          post_type: "goal",
          content: `🎯 Crushed my goal: "${goal.title}"${goal.target_value ? ` · ${goal.target_value} ${goal.unit ?? ""}` : ""}`,
          meta: { goal_id: goalId, goal_title: goal.title },
        });
      }
    }
  }

  async function deleteGoal(goalId: string) {
    if (!window.confirm("Remove this goal? This cannot be undone.")) return;
    await supabase.from("goals").update({ status: "removed" }).eq("id", goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  }

  async function shareProgress(goal: Goal) {
    if (!userId) return;
    setSharingGoalId(goal.id);
    const typeInfo = GOAL_TYPES.find((t) => t.key === goal.goal_type) ?? { emoji: "🎯" };
    const progress = goal.target_value ? Math.round((goal.current_value / goal.target_value) * 100) : null;
    const title = `${typeInfo.emoji} ${goal.title}`;
    const body = progress !== null
      ? `${goal.current_value} / ${goal.target_value} ${goal.unit ?? ""} — ${progress}% complete!`
      : `Current: ${goal.current_value} ${goal.unit ?? ""}`;

    // Notify matches via push
    const { data: matches } = await supabase
      .from("matches")
      .select("sender_id, receiver_id")
      .eq("status", "accepted")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    const matchedUserIds = (matches ?? []).map((m: any) =>
      m.sender_id === userId ? m.receiver_id : m.sender_id
    );
    await Promise.all(matchedUserIds.map((id: string) => sendPush(id, title, body, "/app/goals")));

    // External social share
    const shareText = `${title}\n${body}\n\nTracking my fitness on FlexMatches 💪`;
    const shareUrl = "https://www.flexmatches.com";
    if (navigator.share) {
      try { await navigator.share({ title: "FlexMatches Goal Progress", text: shareText, url: shareUrl }); } catch {}
    } else {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`;
      window.open(twitterUrl, "_blank", "width=550,height=420");
    }

    setSharingGoalId(null);
    setSharedGoalId(goal.id);
    setTimeout(() => setSharedGoalId(null), 2500);
  }

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>

      {/* Streak Card */}
      <div style={{ background: checkedInToday ? "#1a0800" : "var(--bg-card-alt)", border: `1px solid ${checkedInToday ? "#FF450044" : "var(--bg-input)"}`, borderRadius: 18, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "var(--accent)" }}>🔥 {currentStreak}</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>CURRENT</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#f59e0b" }}>🏆 {longestStreak}</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>BEST</div>
          </div>
        </div>
        <button onClick={checkIn} disabled={checkedInToday || checkingIn}
          style={{ padding: "10px 16px", borderRadius: 12, border: "none", fontWeight: 700, fontSize: 13, cursor: checkedInToday ? "default" : "pointer", background: checkedInToday ? "var(--bg-input)" : "var(--accent)", color: checkedInToday ? "var(--text-faint)" : "var(--text-primary)", opacity: checkingIn ? 0.6 : 1 }}>
          {checkedInToday ? "✓ Checked In" : checkingIn ? "..." : "Check In"}
        </button>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.5 }}>Goals</h1>
        <button onClick={openAddForm}
          style={{ background: "var(--accent)", border: "none", borderRadius: 12, padding: "9px 16px", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          + Add Goal
        </button>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <div style={{ fontSize: 56 }}>🎯</div>
          <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 18, marginTop: 16 }}>No goals yet</p>
          <p style={{ color: "var(--text-faint)", marginTop: 8, marginBottom: 24 }}>Set your first fitness goal and start tracking!</p>
          <button onClick={openAddForm}
            style={{ background: "var(--accent)", border: "none", borderRadius: 14, padding: "14px 32px", color: "var(--text-primary)", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            Set a Goal
          </button>
        </div>
      )}

      {/* Goals List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {goals.map((goal) => {
          const typeInfo = TYPE_MAP[goal.goal_type] ?? { emoji: "🎯", label: goal.goal_type, unit: "" };
          const progress = goal.target_value ? Math.min((goal.current_value / goal.target_value) * 100, 100) : 0;
          const isComplete = progress >= 100;

          return (
            <div key={goal.id} style={{ background: "var(--bg-card-alt)", borderRadius: 18, padding: 18, border: `1px solid ${isComplete ? "var(--accent)" : "var(--bg-input)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 28 }}>{typeInfo.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>{goal.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{typeInfo.label}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => shareProgress(goal)} disabled={sharingGoalId === goal.id}
                    style={{ background: sharedGoalId === goal.id ? "#22c55e22" : "transparent", border: `1px solid ${sharedGoalId === goal.id ? "#22c55e55" : "var(--bg-input)"}`, borderRadius: 8, padding: "4px 10px", color: sharedGoalId === goal.id ? "var(--success)" : "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>
                    {sharedGoalId === goal.id ? "✓ Shared!" : sharingGoalId === goal.id ? "..." : "📤"}
                  </button>
                  <button onClick={() => openEditForm(goal)}
                    style={{ background: "transparent", border: "1px solid var(--border-medium)", borderRadius: 8, padding: "4px 10px", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>
                    Edit
                  </button>
                  <button onClick={() => deleteGoal(goal.id)}
                    style={{ background: "transparent", border: "1px solid var(--border-medium)", borderRadius: 8, padding: "4px 10px", color: "var(--text-faint)", fontSize: 12, cursor: "pointer" }}>
                    ✕
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {goal.target_value && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {goal.current_value} / {goal.target_value} {goal.unit}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isComplete ? "var(--success)" : "var(--accent)" }}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div style={{ background: "var(--bg-card)", borderRadius: 99, height: 8 }}>
                    <div style={{ background: isComplete ? "var(--success)" : "var(--accent)", width: `${progress}%`, height: 8, borderRadius: 99, transition: "width 0.3s" }} />
                  </div>
                </div>
              )}

              {/* Deadline */}
              {goal.deadline && (
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 10 }}>
                  📅 {new Date(goal.deadline).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              )}

              {/* Update progress */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  defaultValue={goal.current_value}
                  onBlur={(e) => updateProgress(goal, parseFloat(e.target.value) || 0)}
                  style={{ flex: 1, background: "var(--bg-card)", border: "1px solid var(--border-medium)", borderRadius: 8, padding: "7px 10px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                  placeholder={`Update ${goal.unit ?? "value"}`}
                />
                {isComplete ? (
                  <button onClick={() => completeGoal(goal.id)}
                    style={{ background: "var(--success)", border: "none", borderRadius: 8, padding: "7px 14px", color: "var(--text-primary)", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                    ✓ Complete
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--text-faint)", whiteSpace: "nowrap" }}>{goal.unit}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div onClick={() => setShowForm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "85dvh", overflowY: "auto", border: "1px solid var(--border)", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>
              {editingGoal ? "Edit Goal" : "New Goal"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Goal Type */}
              <div>
                <label style={labelStyle}>GOAL TYPE</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {GOAL_TYPES.map((t) => (
                    <button key={t.key} onClick={() => { setFormType(t.key); setFormUnit(t.unit); }}
                      style={{ padding: "10px 6px", borderRadius: 12, border: `1px solid ${formType === t.key ? "var(--accent)" : "var(--bg-input)"}`, background: formType === t.key ? "#FF450022" : "transparent", color: formType === t.key ? "var(--accent)" : "var(--text-muted)", fontWeight: 600, fontSize: 11, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{t.emoji}</div>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={labelStyle}>TITLE</label>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Lose 5kg by summer"
                  style={inputStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>TARGET</label>
                  <input type="number" value={formTarget} onChange={(e) => setFormTarget(e.target.value)}
                    placeholder="e.g. 75" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>CURRENT</label>
                  <input type="number" value={formCurrent} onChange={(e) => setFormCurrent(e.target.value)}
                    placeholder="e.g. 82" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>UNIT</label>
                  <input value={formUnit} onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="kg, km, days..." style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>DEADLINE</label>
                  <input type="date" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)}
                    style={{ ...inputStyle, colorScheme: "dark" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8, paddingBottom: 24 }}>
                <button onClick={() => setShowForm(false)}
                  style={{ flex: 1, padding: 14, borderRadius: 14, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={saveGoal} disabled={saving || !formTitle.trim()}
                  style={{ flex: 2, padding: 14, borderRadius: 14, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 16, cursor: "pointer", opacity: (saving || !formTitle.trim()) ? 0.5 : 1 }}>
                  {saving ? "Saving..." : editingGoal ? "Update Goal" : "Add Goal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-faint)", fontWeight: 700, display: "block", marginBottom: 6, letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" };

function Loading() {
  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>
      <style>{`@keyframes shimmer { 0%{opacity:.4} 50%{opacity:.8} 100%{opacity:.4} }`}</style>
      <div style={{ background: "var(--bg-card-alt)", borderRadius: 18, height: 80, marginBottom: 20, animation: "shimmer 1.4s ease infinite" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ width: 80, height: 28, borderRadius: 8, background: "var(--bg-card-alt)", animation: "shimmer 1.4s ease infinite" }} />
        <div style={{ width: 90, height: 34, borderRadius: 12, background: "var(--bg-card-alt)", animation: "shimmer 1.4s ease infinite" }} />
      </div>
      {[1, 2].map((i) => (
        <div key={i} style={{ background: "var(--bg-card-alt)", borderRadius: 18, height: 140, marginBottom: 14, animation: "shimmer 1.4s ease infinite" }} />
      ))}
    </div>
  );
}
