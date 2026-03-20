"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

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

const GOAL_TYPES = [
  { key: "weight_loss", label: "Weight Loss", emoji: "⚖️", unit: "kg" },
  { key: "muscle_gain", label: "Muscle Gain", emoji: "💪", unit: "kg" },
  { key: "running", label: "Running", emoji: "🏃", unit: "km" },
  { key: "workout_streak", label: "Workout Streak", emoji: "🔥", unit: "days" },
  { key: "steps", label: "Daily Steps", emoji: "👟", unit: "steps" },
  { key: "custom", label: "Custom", emoji: "🎯", unit: "" },
];

const TYPE_MAP = Object.fromEntries(GOAL_TYPES.map((t) => [t.key, t]));

export default function GoalsPage() {
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

  useEffect(() => { loadGoals(); }, []);

  async function loadGoals() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    setGoals(data ?? []);
    setLoading(false);
  }

  function openAddForm() {
    setEditingGoal(null);
    setFormTitle("");
    setFormType("weight_loss");
    setFormTarget("");
    setFormCurrent("0");
    setFormUnit("kg");
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
    setSaving(false);
    setShowForm(false);
    loadGoals();
  }

  async function updateProgress(goal: Goal, newValue: number) {
    await supabase.from("goals").update({ current_value: newValue }).eq("id", goal.id);
    setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, current_value: newValue } : g));
  }

  async function completeGoal(goalId: string) {
    await supabase.from("goals").update({ status: "completed" }).eq("id", goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  }

  async function deleteGoal(goalId: string) {
    await supabase.from("goals").update({ status: "removed" }).eq("id", goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  }

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>Goals</h1>
        <button onClick={openAddForm}
          style={{ background: "#FF4500", border: "none", borderRadius: 12, padding: "9px 16px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          + Add Goal
        </button>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <div style={{ fontSize: 56 }}>🎯</div>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 18, marginTop: 16 }}>No goals yet</p>
          <p style={{ color: "#555", marginTop: 8, marginBottom: 24 }}>Set your first fitness goal and start tracking!</p>
          <button onClick={openAddForm}
            style={{ background: "#FF4500", border: "none", borderRadius: 14, padding: "14px 32px", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
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
            <div key={goal.id} style={{ background: "#1a1a1a", borderRadius: 18, padding: 18, border: `1px solid ${isComplete ? "#FF4500" : "#2a2a2a"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 28 }}>{typeInfo.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>{goal.title}</div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{typeInfo.label}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => openEditForm(goal)}
                    style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: 8, padding: "4px 10px", color: "#888", fontSize: 12, cursor: "pointer" }}>
                    Edit
                  </button>
                  <button onClick={() => deleteGoal(goal.id)}
                    style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: 8, padding: "4px 10px", color: "#555", fontSize: 12, cursor: "pointer" }}>
                    ✕
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {goal.target_value && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "#888" }}>
                      {goal.current_value} / {goal.target_value} {goal.unit}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isComplete ? "#22c55e" : "#FF4500" }}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div style={{ background: "#111", borderRadius: 99, height: 8 }}>
                    <div style={{ background: isComplete ? "#22c55e" : "#FF4500", width: `${progress}%`, height: 8, borderRadius: 99, transition: "width 0.3s" }} />
                  </div>
                </div>
              )}

              {/* Deadline */}
              {goal.deadline && (
                <div style={{ fontSize: 12, color: "#555", marginBottom: 10 }}>
                  📅 {new Date(goal.deadline).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              )}

              {/* Update progress */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  defaultValue={goal.current_value}
                  onBlur={(e) => updateProgress(goal, parseFloat(e.target.value) || 0)}
                  style={{ flex: 1, background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "7px 10px", color: "#fff", fontSize: 13, outline: "none" }}
                  placeholder={`Update ${goal.unit ?? "value"}`}
                />
                {isComplete ? (
                  <button onClick={() => completeGoal(goal.id)}
                    style={{ background: "#22c55e", border: "none", borderRadius: 8, padding: "7px 14px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                    ✓ Complete
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: "#555", whiteSpace: "nowrap" }}>{goal.unit}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div onClick={() => setShowForm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", border: "1px solid #1a1a1a" }}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>
              {editingGoal ? "Edit Goal" : "New Goal"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Goal Type */}
              <div>
                <label style={labelStyle}>GOAL TYPE</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {GOAL_TYPES.map((t) => (
                    <button key={t.key} onClick={() => { setFormType(t.key); setFormUnit(t.unit); }}
                      style={{ padding: "10px 6px", borderRadius: 12, border: `1px solid ${formType === t.key ? "#FF4500" : "#2a2a2a"}`, background: formType === t.key ? "#FF450022" : "transparent", color: formType === t.key ? "#FF4500" : "#888", fontWeight: 600, fontSize: 11, cursor: "pointer", textAlign: "center" }}>
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

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowForm(false)}
                  style={{ flex: 1, padding: 14, borderRadius: 14, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={saveGoal} disabled={saving || !formTitle.trim()}
                  style={{ flex: 2, padding: 14, borderRadius: 14, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
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

const labelStyle: React.CSSProperties = { fontSize: 11, color: "#555", fontWeight: 700, display: "block", marginBottom: 6, letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" };

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
