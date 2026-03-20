"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { BADGE_MAP, type BadgeKey, checkAndAwardProfileBadge } from "../../../lib/badges";

const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"] as const;
const SPORTS_LIST = ["Gym", "Running", "Cycling", "Swimming", "Football", "Basketball", "Tennis", "Boxing", "Yoga", "CrossFit", "Pilates", "Hiking"];
const GENDERS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CERT_SUGGESTIONS = ["Personal Trainer", "CrossFit L1", "CrossFit L2", "Yoga Instructor", "Pilates Instructor", "Nutritionist", "Sports Massage", "First Aid"];

type Privacy = { hide_age: boolean; hide_city: boolean; hide_weight: boolean };
const DEFAULT_PRIVACY: Privacy = { hide_age: false, hide_city: false, hide_weight: false };

type Profile = {
  username: string;
  full_name: string | null;
  bio: string | null;
  city: string | null;
  gym_name: string | null;
  fitness_level: "beginner" | "intermediate" | "advanced" | null;
  age: number | null;
  avatar_url: string | null;
  weight: number | null;
  target_weight: number | null;
  gender: string | null;
  sports: string[] | null;
  certifications: string[] | null;
  availability: Record<string, boolean> | null;
  privacy_settings: Privacy | null;
  lat: number | null;
  lng: number | null;
  current_streak: number | null;
  longest_streak: number | null;
};

const EMPTY_PROFILE: Omit<Profile, "username"> = {
  full_name: null, bio: null, city: null, gym_name: null,
  fitness_level: null, age: null, avatar_url: null,
  weight: null, target_weight: null, gender: null,
  sports: [], certifications: [], availability: {}, privacy_settings: DEFAULT_PRIVACY,
  lat: null, lng: null, current_streak: 0, longest_streak: 0,
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [certInput, setCertInput] = useState("");
  const [locating, setLocating] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<BadgeKey[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from("users")
      .select("username, full_name, bio, city, gym_name, fitness_level, age, avatar_url, weight, target_weight, gender, sports, certifications, availability, privacy_settings, lat, lng, current_streak, longest_streak")
      .eq("id", user.id)
      .single();
    if (data) {
      const p = { ...EMPTY_PROFILE, ...data, privacy_settings: data.privacy_settings ?? DEFAULT_PRIVACY };
      setProfile(p); setForm(p);
    } else {
      const fallback: Profile = { username: user.email?.split("@")[0] ?? "user", ...EMPTY_PROFILE };
      setProfile(fallback); setForm(fallback);
    }

    const { data: badges } = await supabase
      .from("user_badges").select("badge_key").eq("user_id", user.id);
    setEarnedBadges((badges ?? []).map((b: { badge_key: string }) => b.badge_key as BadgeKey));

    setLoading(false);
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setError(upErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const urlWithCache = `${publicUrl}?t=${Date.now()}`;
    await supabase.from("users").update({ avatar_url: urlWithCache }).eq("id", userId);
    setProfile((p) => p ? { ...p, avatar_url: urlWithCache } : p);
    setForm((f) => f ? { ...f, avatar_url: urlWithCache } : f);
    setUploading(false);
  }

  async function saveProfile() {
    if (!form || !userId) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("users").upsert({
      id: userId,
      username: form.username,
      full_name: form.full_name,
      bio: form.bio,
      city: form.city,
      gym_name: form.gym_name,
      fitness_level: form.fitness_level,
      age: form.age,
      weight: form.weight,
      target_weight: form.target_weight,
      gender: form.gender,
      sports: form.sports ?? [],
      certifications: form.certifications ?? [],
      availability: form.availability ?? {},
      privacy_settings: form.privacy_settings ?? DEFAULT_PRIVACY,
    });
    setSaving(false);
    if (err) { setError(err.message); }
    else {
      setProfile(form); setEditing(false);
      checkAndAwardProfileBadge(userId, form as unknown as Record<string, unknown>)
        .then(() => supabase.from("user_badges").select("badge_key").eq("user_id", userId))
        .then(({ data }) => setEarnedBadges((data ?? []).map((b: { badge_key: string }) => b.badge_key as BadgeKey)));
    }
  }

  function toggleSport(sport: string) {
    if (!form) return;
    const cur = form.sports ?? [];
    setForm({ ...form, sports: cur.includes(sport) ? cur.filter(s => s !== sport) : [...cur, sport] });
  }

  function toggleDay(day: string) {
    if (!form) return;
    const cur = form.availability ?? {};
    setForm({ ...form, availability: { ...cur, [day]: !cur[day] } });
  }

  function addCert(cert: string) {
    if (!form || !cert.trim()) return;
    const cur = form.certifications ?? [];
    if (!cur.includes(cert)) setForm({ ...form, certifications: [...cur, cert] });
    setCertInput("");
  }

  function removeCert(cert: string) {
    if (!form) return;
    setForm({ ...form, certifications: (form.certifications ?? []).filter(c => c !== cert) });
  }

  async function saveLocation() {
    if (!userId) return;
    if (!navigator.geolocation) { setError("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        await supabase.from("users").update({ lat, lng }).eq("id", userId);
        setProfile((p) => p ? { ...p, lat, lng } : p);
        setForm((f) => f ? { ...f, lat, lng } : f);
        setLocating(false);
      },
      () => { setError("Could not get location"); setLocating(false); }
    );
  }

  function setPrivacy(key: keyof Privacy, val: boolean) {
    if (!form) return;
    setForm({ ...form, privacy_settings: { ...(form.privacy_settings ?? DEFAULT_PRIVACY), [key]: val } });
  }

  if (loading) return <Loading />;

  const privacy = profile?.privacy_settings ?? DEFAULT_PRIVACY;
  const avatarSrc = profile?.avatar_url;

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>

      {/* Avatar */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          {avatarSrc ? (
            <img src={avatarSrc} alt="avatar" style={{ width: 90, height: 90, borderRadius: 45, objectFit: "cover", border: "3px solid #FF4500" }} />
          ) : (
            <div style={{ width: 90, height: 90, borderRadius: 45, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, color: "#fff" }}>
              {profile?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <button onClick={() => fileRef.current?.click()}
            style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, background: "#FF4500", border: "2px solid #0A0A0A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
            {uploading ? "⏳" : "📷"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadAvatar} />
        </div>
        <div style={{ fontWeight: 700, color: "#fff", fontSize: 18, marginTop: 10 }}>@{profile?.username}</div>
        {profile?.fitness_level && (
          <span style={{ fontSize: 12, color: "#FF4500", fontWeight: 600, background: "#1a1a1a", borderRadius: 999, padding: "3px 12px", border: "1px solid #2a2a2a", display: "inline-block", marginTop: 6, textTransform: "capitalize" }}>
            {profile.fitness_level}
          </span>
        )}
      </div>

      {editing && form ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Personal Info */}
          <Section title="Personal Info">
            <Field label="Full Name" value={form.full_name ?? ""} onChange={(v) => setForm({ ...form, full_name: v })} />
            <Field label="Bio" value={form.bio ?? ""} onChange={(v) => setForm({ ...form, bio: v })} multiline />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="City" value={form.city ?? ""} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label="Age" value={form.age?.toString() ?? ""} onChange={(v) => setForm({ ...form, age: parseInt(v) || null })} type="number" />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <div style={{ display: "flex", gap: 8 }}>
                {GENDERS.map((g) => (
                  <button key={g.value} onClick={() => setForm({ ...form, gender: g.value })}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1px solid ${form.gender === g.value ? "#FF4500" : "#2a2a2a"}`, background: form.gender === g.value ? "#FF4500" : "transparent", color: form.gender === g.value ? "#fff" : "#888", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Fitness */}
          <Section title="Fitness">
            <Field label="Gym Name" value={form.gym_name ?? ""} onChange={(v) => setForm({ ...form, gym_name: v })} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Weight (lbs)" value={form.weight?.toString() ?? ""} onChange={(v) => setForm({ ...form, weight: parseFloat(v) || null })} type="number" />
              <Field label="Target (lbs)" value={form.target_weight?.toString() ?? ""} onChange={(v) => setForm({ ...form, target_weight: parseFloat(v) || null })} type="number" />
            </div>
            <div>
              <label style={labelStyle}>Fitness Level</label>
              <div style={{ display: "flex", gap: 8 }}>
                {FITNESS_LEVELS.map((level) => (
                  <button key={level} onClick={() => setForm({ ...form, fitness_level: level })}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1px solid ${form.fitness_level === level ? "#FF4500" : "#2a2a2a"}`, background: form.fitness_level === level ? "#FF4500" : "transparent", color: form.fitness_level === level ? "#fff" : "#888", fontWeight: 600, fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Sports */}
          <Section title="Sports & Activities">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SPORTS_LIST.map((sport) => {
                const active = form.sports?.includes(sport);
                return (
                  <button key={sport} onClick={() => toggleSport(sport)}
                    style={{ padding: "7px 14px", borderRadius: 999, border: `1px solid ${active ? "#FF4500" : "#2a2a2a"}`, background: active ? "#FF4500" : "transparent", color: active ? "#fff" : "#888", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    {sport}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Certifications */}
          <Section title="Certifications">
            <div style={{ display: "flex", gap: 8 }}>
              <input value={certInput} onChange={(e) => setCertInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCert(certInput); } }}
                placeholder="Add certification..."
                style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => addCert(certInput)}
                style={{ background: "#FF4500", border: "none", borderRadius: 10, padding: "0 14px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>+</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CERT_SUGGESTIONS.map((c) => (
                <button key={c} onClick={() => addCert(c)}
                  style={{ padding: "5px 10px", borderRadius: 999, border: "1px solid #2a2a2a", background: "transparent", color: "#666", fontSize: 12, cursor: "pointer" }}>
                  + {c}
                </button>
              ))}
            </div>
            {(form.certifications ?? []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(form.certifications ?? []).map((c) => (
                  <span key={c} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#FF4500", background: "#1a0800", borderRadius: 999, padding: "5px 10px", border: "1px solid #FF450033" }}>
                    {c}
                    <button onClick={() => removeCert(c)} style={{ background: "none", border: "none", color: "#FF4500", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </Section>

          {/* Availability */}
          <Section title="Availability">
            <p style={{ fontSize: 12, color: "#666", margin: 0 }}>Which days are you available to train?</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DAYS.map((day) => {
                const active = form.availability?.[day];
                return (
                  <button key={day} onClick={() => toggleDay(day)}
                    style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${active ? "#FF4500" : "#2a2a2a"}`, background: active ? "#FF4500" : "transparent", color: active ? "#fff" : "#888", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {day}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Privacy */}
          <Section title="Privacy Settings">
            {([
              { key: "hide_age" as keyof Privacy, label: "Hide my age" },
              { key: "hide_city" as keyof Privacy, label: "Hide my city" },
              { key: "hide_weight" as keyof Privacy, label: "Hide my weight" },
            ]).map((item) => (
              <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#ccc", fontSize: 14 }}>{item.label}</span>
                <button onClick={() => setPrivacy(item.key, !(form.privacy_settings ?? DEFAULT_PRIVACY)[item.key])}
                  style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: (form.privacy_settings ?? DEFAULT_PRIVACY)[item.key] ? "#FF4500" : "#333", position: "relative", transition: "background 0.2s" }}>
                  <span style={{ position: "absolute", top: 2, left: (form.privacy_settings ?? DEFAULT_PRIVACY)[item.key] ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 0.2s", display: "block" }} />
                </button>
              </div>
            ))}
          </Section>

          {error && <p style={{ color: "#ff6b6b", fontSize: 13, textAlign: "center" }}>{error}</p>}

          <div style={{ display: "flex", gap: 10, paddingBottom: 24 }}>
            <button onClick={() => { setForm(profile); setEditing(false); setError(null); }}
              style={{ flex: 1, padding: 14, borderRadius: 14, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={saveProfile} disabled={saving}
              style={{ flex: 2, padding: 14, borderRadius: 14, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {profile?.full_name && <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, textAlign: "center", margin: 0 }}>{profile.full_name}</p>}
          {profile?.bio && <p style={{ color: "#888", textAlign: "center", lineHeight: 1.6, margin: 0 }}>{profile.bio}</p>}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {profile?.city && !privacy.hide_city && <Chip>📍 {profile.city}</Chip>}
            {profile?.gym_name && <Chip>🏋️ {profile.gym_name}</Chip>}
            {profile?.age && !privacy.hide_age && <Chip>🎂 {profile.age} yo</Chip>}
            {profile?.gender && <Chip>{profile.gender}</Chip>}
          </div>

          {(profile?.weight || profile?.target_weight) && !privacy.hide_weight && (
            <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 16, border: "1px solid #2a2a2a", display: "flex", justifyContent: "space-around" }}>
              {profile.weight && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#FF4500" }}>{profile.weight}<span style={{ fontSize: 13, color: "#666" }}>lbs</span></div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Current</div>
                </div>
              )}
              {profile.target_weight && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#FF4500" }}>{profile.target_weight}<span style={{ fontSize: 13, color: "#666" }}>lbs</span></div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Target</div>
                </div>
              )}
            </div>
          )}

          {profile?.sports && profile.sports.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.sports.map((s) => (
                <span key={s} style={{ fontSize: 13, color: "#FF4500", background: "#1a1a1a", borderRadius: 999, padding: "5px 12px", border: "1px solid #FF450033", fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          )}

          {profile?.certifications && profile.certifications.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 8 }}>CERTIFICATIONS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {profile.certifications.map((c) => (
                  <span key={c} style={{ fontSize: 13, color: "#22c55e", background: "#0d1f0d", borderRadius: 999, padding: "5px 12px", border: "1px solid #22c55e33", fontWeight: 600 }}>🏅 {c}</span>
                ))}
              </div>
            </div>
          )}

          {profile?.availability && Object.keys(profile.availability).some(k => profile.availability![k]) && (
            <div>
              <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 8 }}>AVAILABILITY</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DAYS.filter(d => profile.availability?.[d]).map((d) => (
                  <span key={d} style={{ fontSize: 12, color: "#FF4500", background: "#1a0800", borderRadius: 8, padding: "4px 10px", border: "1px solid #FF450033", fontWeight: 700 }}>{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* Badges */}
          <div>
            <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 10 }}>BADGES</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {earnedBadges.length === 0 && (
                <p style={{ fontSize: 13, color: "#444", margin: 0 }}>No badges yet — start connecting and completing goals!</p>
              )}
              {earnedBadges.map((key) => {
                const b = BADGE_MAP[key];
                if (!b) return null;
                return (
                  <div key={key} title={b.description}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "#111", border: `1px solid ${b.color}33`, borderRadius: 12, padding: "8px 12px" }}>
                    <span style={{ fontSize: 20 }}>{b.emoji}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: b.color }}>{b.title}</div>
                      <div style={{ fontSize: 10, color: "#555" }}>{b.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Streak Stats */}
          {((profile?.current_streak ?? 0) > 0 || (profile?.longest_streak ?? 0) > 0) && (
            <div style={{ background: "#1a0800", borderRadius: 16, padding: 16, border: "1px solid #FF450033", display: "flex", justifyContent: "space-around" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#FF4500" }}>🔥 {profile?.current_streak ?? 0}</div>
                <div style={{ fontSize: 11, color: "#555", fontWeight: 700, marginTop: 2 }}>CURRENT STREAK</div>
              </div>
              <div style={{ width: 1, background: "#2a2a2a" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#f59e0b" }}>🏆 {profile?.longest_streak ?? 0}</div>
                <div style={{ fontSize: 11, color: "#555", fontWeight: 700, marginTop: 2 }}>BEST STREAK</div>
              </div>
            </div>
          )}

          <a href="/app/store"
            style={{ display: "block", padding: 14, borderRadius: 14, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", textAlign: "center", textDecoration: "none" }}>
            🛍️ Fitness Store
          </a>
          <a href="/app/settings"
            style={{ display: "block", padding: 14, borderRadius: 14, border: "1px solid #2a2a2a", background: "transparent", color: "#ccc", fontWeight: 700, fontSize: 16, cursor: "pointer", textAlign: "center", textDecoration: "none" }}>
            ⚙️ Settings
          </a>
          <button onClick={() => setEditing(true)}
            style={{ padding: 14, borderRadius: 14, border: "1px solid #FF4500", background: "transparent", color: "#FF4500", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            Edit Profile
          </button>
          <button onClick={saveLocation} disabled={locating}
            style={{ padding: 14, borderRadius: 14, border: "1px solid #2a2a2a", background: "transparent", color: profile?.lat ? "#22c55e" : "#888", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: locating ? 0.6 : 1 }}>
            {locating ? "Getting location..." : profile?.lat ? "📍 Location saved ✓" : "📍 Save my location"}
          </button>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 13, color: "#888", fontWeight: 600, display: "block", marginBottom: 6 };
const inputStyle: React.CSSProperties = { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", width: "100%" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111", borderRadius: 16, padding: 16, border: "1px solid #1a1a1a", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#FF4500", marginBottom: 4 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, multiline, type }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string }) {
  const style: React.CSSProperties = { ...inputStyle, ...(multiline ? { height: 72, resize: "none" } : {}) };
  return (
    <div>
      <label style={labelStyle}>{label}</label>
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
