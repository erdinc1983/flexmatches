"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  goal_type: string;
  target_value: number | null;
  unit: string | null;
  end_date: string | null;
  created_by: string;
  participant_count?: number;
  my_value?: number;
  joined?: boolean;
};

type LeaderEntry = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  current_value: number;
};

const GOAL_TYPES = [
  { key: "running", label: "Running", emoji: "🏃", unit: "mi" },
  { key: "workout_streak", label: "Workout Days", emoji: "💪", unit: "days" },
  { key: "weight_loss", label: "Weight Loss", emoji: "⚖️", unit: "lbs" },
  { key: "steps", label: "Steps", emoji: "👟", unit: "steps" },
  { key: "cycling", label: "Cycling", emoji: "🚴", unit: "mi" },
  { key: "custom", label: "Custom", emoji: "🎯", unit: "" },
];

export default function ChallengesPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [progressInput, setProgressInput] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);

  // Form
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("running");
  const [formTarget, setFormTarget] = useState("");
  const [formUnit, setFormUnit] = useState("mi");
  const [formDesc, setFormDesc] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadChallenges(); }, []);

  async function loadChallenges() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: cData } = await supabase
      .from("challenges").select("*").eq("is_public", true).order("created_at", { ascending: false });

    const { data: myParts } = await supabase
      .from("challenge_participants").select("challenge_id, current_value").eq("user_id", user.id);

    const myMap = Object.fromEntries((myParts ?? []).map((p: any) => [p.challenge_id, p.current_value]));

    const enriched = await Promise.all((cData ?? []).map(async (c: Challenge) => {
      const { count } = await supabase.from("challenge_participants")
        .select("id", { count: "exact", head: true }).eq("challenge_id", c.id);
      return {
        ...c,
        participant_count: count ?? 0,
        my_value: myMap[c.id] ?? null,
        joined: c.id in myMap,
      };
    }));

    setChallenges(enriched);
    setLoading(false);
  }

  async function openChallenge(c: Challenge) {
    setSelectedChallenge(c);
    setProgressInput(c.my_value?.toString() ?? "");
    const { data } = await supabase
      .from("challenge_participants")
      .select("current_value, user_id, users(username, avatar_url)")
      .eq("challenge_id", c.id)
      .order("current_value", { ascending: false })
      .limit(10);
    setLeaderboard((data ?? []).map((r: any) => ({
      user_id: r.user_id,
      username: r.users?.username ?? "?",
      avatar_url: r.users?.avatar_url ?? null,
      current_value: r.current_value,
    })));
  }

  async function joinChallenge(challengeId: string) {
    if (!userId) return;
    await supabase.from("challenge_participants").insert({ challenge_id: challengeId, user_id: userId, current_value: 0 });
    loadChallenges();
    if (selectedChallenge?.id === challengeId) {
      setSelectedChallenge({ ...selectedChallenge, joined: true, my_value: 0 });
    }
  }

  async function updateProgress() {
    if (!userId || !selectedChallenge) return;
    setSavingProgress(true);
    await supabase.from("challenge_participants")
      .update({ current_value: parseFloat(progressInput) || 0 })
      .eq("challenge_id", selectedChallenge.id).eq("user_id", userId);
    setSavingProgress(false);
    openChallenge({ ...selectedChallenge, my_value: parseFloat(progressInput) || 0 });
    loadChallenges();
  }

  async function createChallenge() {
    if (!userId || !formTitle.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("challenges").insert({
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      goal_type: formType,
      target_value: parseFloat(formTarget) || null,
      unit: formUnit || GOAL_TYPES.find(t => t.key === formType)?.unit || "",
      end_date: formEndDate || null,
      created_by: userId,
    }).select().single();
    if (data) {
      await supabase.from("challenge_participants").insert({ challenge_id: data.id, user_id: userId, current_value: 0 });
    }
    setSaving(false);
    setShowForm(false);
    setFormTitle(""); setFormDesc(""); setFormTarget(""); setFormEndDate("");
    loadChallenges();
  }

  const daysLeft = (endDate: string | null) => {
    if (!endDate) return null;
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    return diff > 0 ? diff : 0;
  };

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer", padding: 0 }}>←</button>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>Challenges 🏆</h1>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ background: "var(--accent)", border: "none", borderRadius: 12, padding: "9px 16px", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          + Create
        </button>
      </div>

      {/* Empty state */}
      {challenges.length === 0 && (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 52 }}>🏆</div>
          <p style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, marginTop: 16 }}>No challenges yet</p>
          <p style={{ color: "var(--text-faint)", fontSize: 14, marginTop: 8 }}>Create the first challenge and invite others!</p>
          <button onClick={() => setShowForm(true)}
            style={{ marginTop: 20, padding: "12px 28px", borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, cursor: "pointer" }}>
            Create Challenge
          </button>
        </div>
      )}

      {/* Challenges list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {challenges.map((c) => {
          const typeInfo = GOAL_TYPES.find(t => t.key === c.goal_type) ?? { emoji: "🎯", label: c.goal_type, unit: "" };
          const days = daysLeft(c.end_date);
          const pct = c.target_value && c.my_value != null ? Math.min((c.my_value / c.target_value) * 100, 100) : null;
          return (
            <div key={c.id} onClick={() => openChallenge(c)}
              style={{ background: "var(--bg-card-alt)", borderRadius: 16, padding: 16, border: `1px solid ${c.joined ? "#FF450033" : "var(--bg-input)"}`, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 28 }}>{typeInfo.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{typeInfo.label} · {c.participant_count} joined</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {days !== null && <div style={{ fontSize: 11, color: days <= 3 ? "#ff6b6b" : "var(--text-faint)", fontWeight: 700 }}>{days}d left</div>}
                  {c.joined && <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, marginTop: 2 }}>✓ Joined</div>}
                </div>
              </div>
              {c.description && <p style={{ color: "var(--text-faint)", fontSize: 12, margin: "0 0 10px", lineHeight: 1.5 }}>{c.description}</p>}
              {pct !== null && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{c.my_value} / {c.target_value} {c.unit}</span>
                    <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>{Math.round(pct)}%</span>
                  </div>
                  <div style={{ background: "var(--bg-card)", borderRadius: 99, height: 5 }}>
                    <div style={{ background: "var(--accent)", width: `${pct}%`, height: 5, borderRadius: 99 }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Challenge Detail Modal */}
      {selectedChallenge && (
        <div onClick={() => setSelectedChallenge(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 20, marginBottom: 6 }}>{selectedChallenge.title}</h2>
            {selectedChallenge.description && <p style={{ color: "var(--text-faint)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>{selectedChallenge.description}</p>}

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {selectedChallenge.target_value && <span style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-card-alt)", borderRadius: 999, padding: "4px 12px", border: "1px solid var(--border-medium)" }}>🎯 {selectedChallenge.target_value} {selectedChallenge.unit}</span>}
              {selectedChallenge.end_date && <span style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-card-alt)", borderRadius: 999, padding: "4px 12px", border: "1px solid var(--border-medium)" }}>📅 {new Date(selectedChallenge.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
              <span style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-card-alt)", borderRadius: 999, padding: "4px 12px", border: "1px solid var(--border-medium)" }}>👥 {selectedChallenge.participant_count}</span>
            </div>

            {!selectedChallenge.joined ? (
              <button onClick={() => joinChallenge(selectedChallenge.id)}
                style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 16, cursor: "pointer", marginBottom: 20 }}>
                Join Challenge 🏆
              </button>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, marginBottom: 8 }}>UPDATE YOUR PROGRESS</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={progressInput} onChange={(e) => setProgressInput(e.target.value)}
                    type="number" placeholder={`Current ${selectedChallenge.unit ?? "value"}`}
                    style={{ flex: 1, background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none" }} />
                  <button onClick={updateProgress} disabled={savingProgress}
                    style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, cursor: "pointer", opacity: savingProgress ? 0.6 : 1 }}>
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, marginBottom: 10 }}>LEADERBOARD</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {leaderboard.map((entry, i) => (
                    <div key={entry.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--bg-card-alt)", borderRadius: 12, border: entry.user_id === userId ? "1px solid var(--accent-faint)" : "1px solid var(--border-medium)" }}>
                      <span style={{ fontSize: 16, width: 24, textAlign: "center", fontWeight: 800, color: i === 0 ? "#eab308" : i === 1 ? "#9ca3af" : i === 2 ? "#f97316" : "var(--text-faint)" }}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                      </span>
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: 16, objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: 16, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
                          {entry.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <span style={{ flex: 1, color: entry.user_id === userId ? "var(--accent)" : "var(--text-primary)", fontWeight: 600, fontSize: 14 }}>@{entry.username}</span>
                      <span style={{ color: "var(--accent)", fontWeight: 800, fontSize: 15 }}>{entry.current_value} <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{selectedChallenge.unit}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Challenge Modal */}
      {showForm && (
        <div onClick={() => setShowForm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>New Challenge</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>CHALLENGE TYPE</label>
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
              <div>
                <label style={labelStyle}>TITLE</label>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Run 50 miles in January"
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>DESCRIPTION (OPTIONAL)</label>
                <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="What's this challenge about?"
                  style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>TARGET</label>
                  <input type="number" value={formTarget} onChange={(e) => setFormTarget(e.target.value)}
                    placeholder="e.g. 50" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>UNIT</label>
                  <input value={formUnit} onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="mi, days..." style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>END DATE</label>
                <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)}
                  style={{ ...inputStyle, colorScheme: "dark" }} />
              </div>
              <div style={{ display: "flex", gap: 10, paddingBottom: 16 }}>
                <button onClick={() => setShowForm(false)}
                  style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={createChallenge} disabled={saving || !formTitle.trim()}
                  style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 16, cursor: "pointer", opacity: (saving || !formTitle.trim()) ? 0.5 : 1 }}>
                  {saving ? "Creating..." : "Create 🏆"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-faint)", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" };

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
