"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Profile = { username: string; full_name: string | null; bio: string | null; city: string | null; gym_name: string | null; fitness_level: "beginner" | "intermediate" | "advanced" | null; age: number | null };
const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase.from("users").select("username, full_name, bio, city, gym_name, fitness_level, age").eq("id", user.id).single();
    if (data) { setProfile(data); setForm(data); }
    else {
      // No profile row yet — seed with email-based username
      const fallback = { username: user.email?.split("@")[0] ?? "user", full_name: null, bio: null, city: null, gym_name: null, fitness_level: null, age: null };
      setProfile(fallback as Profile);
      setForm(fallback as Profile);
    }
    setLoading(false);
  }

  async function saveProfile() {
    if (!form || !userId) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("users").upsert({ id: userId, username: form.username, full_name: form.full_name, bio: form.bio, city: form.city, gym_name: form.gym_name, fitness_level: form.fitness_level, age: form.age });
    setSaving(false);
    if (err) { setError(err.message); }
    else { setProfile(form); setEditing(false); }
  }

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ width: 80, height: 80, borderRadius: 40, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#fff", margin: "0 auto 12px" }}>
          {profile?.username?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div style={{ fontWeight: 700, color: "#fff", fontSize: 18 }}>@{profile?.username}</div>
        {profile?.fitness_level && (
          <span style={{ fontSize: 12, color: "#FF4500", fontWeight: 600, background: "#1a1a1a", borderRadius: 999, padding: "3px 12px", border: "1px solid #2a2a2a", display: "inline-block", marginTop: 8, textTransform: "capitalize" }}>
            {profile.fitness_level}
          </span>
        )}
      </div>

      {editing && form ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Full Name" value={form.full_name ?? ""} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Field label="Bio" value={form.bio ?? ""} onChange={(v) => setForm({ ...form, bio: v })} multiline />
          <Field label="City" value={form.city ?? ""} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="Gym Name" value={form.gym_name ?? ""} onChange={(v) => setForm({ ...form, gym_name: v })} />
          <Field label="Age" value={form.age?.toString() ?? ""} onChange={(v) => setForm({ ...form, age: parseInt(v) || null })} type="number" />

          <div>
            <label style={{ fontSize: 13, color: "#888", fontWeight: 600, display: "block", marginBottom: 8 }}>Fitness Level</label>
            <div style={{ display: "flex", gap: 8 }}>
              {FITNESS_LEVELS.map((level) => (
                <button key={level} onClick={() => setForm({ ...form, fitness_level: level })}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1px solid ${form.fitness_level === level ? "#FF4500" : "#2a2a2a"}`, background: form.fitness_level === level ? "#FF4500" : "transparent", color: form.fitness_level === level ? "#fff" : "#888", fontWeight: 600, fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>
                  {level}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ color: "#ff6b6b", fontSize: 13, textAlign: "center" }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={() => { setForm(profile); setEditing(false); setError(null); }} style={{ flex: 1, padding: 14, borderRadius: 14, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button onClick={saveProfile} disabled={saving} style={{ flex: 1, padding: 14, borderRadius: 14, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {profile?.full_name && <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, textAlign: "center" }}>{profile.full_name}</p>}
          {profile?.bio && <p style={{ color: "#888", textAlign: "center", lineHeight: 1.6 }}>{profile.bio}</p>}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {profile?.city && <Chip>📍 {profile.city}</Chip>}
            {profile?.gym_name && <Chip>🏋️ {profile.gym_name}</Chip>}
            {profile?.age && <Chip>🎂 {profile.age} years old</Chip>}
          </div>

          <button onClick={() => setEditing(true)} style={{ padding: 14, borderRadius: 14, border: "1px solid #FF4500", background: "transparent", color: "#FF4500", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 8 }}>
            Edit Profile
          </button>

          <button onClick={() => supabase.auth.signOut().then(() => window.location.href = "/login")}
            style={{ padding: 14, borderRadius: 14, border: "1px solid #2a2a2a", background: "transparent", color: "#555", fontWeight: 600, cursor: "pointer" }}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, multiline, type }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string }) {
  const style = { width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "12px 14px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" as const, ...(multiline ? { height: 80, resize: "none" as const } : {}) };
  return (
    <div>
      <label style={{ fontSize: 13, color: "#888", fontWeight: 600, display: "block", marginBottom: 6 }}>{label}</label>
      {multiline
        ? <textarea style={style} value={value} onChange={(e) => onChange(e.target.value)} />
        : <input style={style} type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} />
      }
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 13, color: "#ccc", background: "#1a1a1a", borderRadius: 999, padding: "6px 14px", border: "1px solid #2a2a2a" }}>{children}</span>;
}

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
