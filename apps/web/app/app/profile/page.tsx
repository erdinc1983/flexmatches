"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import { BADGE_MAP, type BadgeKey, type Tier, calcTier, calcUserPoints, checkAndAwardProfileBadge } from "../../../lib/badges";

const EDUCATION_LEVELS = ["High School", "Associate's", "Bachelor's", "Master's", "PhD", "Other"];
const INDUSTRIES = ["Technology", "Finance", "Healthcare", "Education", "Marketing", "Engineering", "Law", "Design", "Sports & Fitness", "Other"];
const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"] as const;
const SPORTS_LIST = ["Gym", "Running", "Cycling", "Swimming", "Football", "Basketball", "Tennis", "Boxing", "Yoga", "CrossFit", "Pilates", "Hiking"];
const GENDERS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_OPTIONS = [
  { value: "morning", label: "Morning", sub: "06:00–12:00", emoji: "🌅" },
  { value: "afternoon", label: "Afternoon", sub: "12:00–17:00", emoji: "☀️" },
  { value: "evening", label: "Evening", sub: "17:00–23:00", emoji: "🌙" },
];
const CERT_SUGGESTIONS = ["Personal Trainer", "CrossFit L1", "CrossFit L2", "Yoga Instructor", "Pilates Instructor", "Nutritionist", "Sports Massage", "First Aid"];

type Privacy = { hide_age: boolean; hide_city: boolean; hide_weight: boolean; hide_profile: boolean };
const DEFAULT_PRIVACY: Privacy = { hide_age: false, hide_city: false, hide_weight: false, hide_profile: false };

const COMPLETENESS_FIELDS: { key: keyof Profile; label: string }[] = [
  { key: "avatar_url",    label: "Add a profile photo" },
  { key: "full_name",     label: "Add your name" },
  { key: "bio",           label: "Write a bio" },
  { key: "city",          label: "Add your city" },
  { key: "fitness_level", label: "Set fitness level" },
  { key: "age",           label: "Add your age" },
  { key: "sports",        label: "Add at least one sport" },
  { key: "availability",  label: "Set your availability" },
  { key: "occupation",    label: "Add your job title" },
  { key: "career_goals",  label: "Add career goals" },
];

function calcCompleteness(p: Profile): { pct: number; missing: string[] } {
  const missing: string[] = [];
  for (const f of COMPLETENESS_FIELDS) {
    const v = p[f.key];
    const empty = !v || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && !Array.isArray(v) && Object.values(v as Record<string, boolean>).every(x => !x));
    if (empty) missing.push(f.label);
  }
  return { pct: Math.round(((COMPLETENESS_FIELDS.length - missing.length) / COMPLETENESS_FIELDS.length) * 100), missing };
}

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
  preferred_times: string[] | null;
  occupation: string | null;
  company: string | null;
  industry: string | null;
  education_level: string | null;
  career_goals: string | null;
  is_pro: boolean | null;
};

const EMPTY_PROFILE: Omit<Profile, "username"> = {
  full_name: null, bio: null, city: null, gym_name: null,
  fitness_level: null, age: null, avatar_url: null,
  weight: null, target_weight: null, gender: null,
  sports: [], certifications: [], availability: {}, privacy_settings: DEFAULT_PRIVACY,
  lat: null, lng: null, current_streak: 0, longest_streak: 0, preferred_times: [],
  occupation: null, company: null, industry: null, education_level: null, career_goals: null, is_pro: false,
};

export default function ProfilePage() {
  const router = useRouter();
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
  const [userPoints, setUserPoints] = useState(0);
  const [userTier, setUserTier] = useState<Tier | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function shareProfile() {
    const url = `${window.location.origin}/u/${profile?.username}`;
    if (navigator.share) {
      navigator.share({ title: "FlexMatches", text: `Check out my FlexMatches profile!`, url });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from("users")
      .select("username, full_name, bio, city, gym_name, fitness_level, age, avatar_url, weight, target_weight, gender, sports, certifications, availability, privacy_settings, lat, lng, current_streak, longest_streak, preferred_times, occupation, company, industry, education_level, career_goals, is_pro")
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

    const pts = await calcUserPoints(user.id);
    setUserPoints(pts);
    setUserTier(calcTier(pts));

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
      preferred_times: form.preferred_times ?? [],
      occupation: form.occupation,
      company: form.company,
      industry: form.industry,
      education_level: form.education_level,
      career_goals: form.career_goals,
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 }}>
          <div style={{ fontWeight: 700, color: "#fff", fontSize: 18 }}>@{profile?.username}</div>
          {profile?.is_pro && (
            <span style={{ fontSize: 12, fontWeight: 800, color: "#60a5fa", background: "#1e3a5f", borderRadius: 999, padding: "3px 10px", border: "1px solid #60a5fa44" }}>💎 Pro</span>
          )}
        </div>
        {profile?.fitness_level && (
          <span style={{ fontSize: 12, color: "#FF4500", fontWeight: 600, background: "#1a1a1a", borderRadius: 999, padding: "3px 12px", border: "1px solid #2a2a2a", display: "inline-block", marginTop: 6, textTransform: "capitalize" }}>
            {profile.fitness_level}
          </span>
        )}
        {!editing && profile?.full_name && (
          <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: "10px 0 0" }}>{profile.full_name}</p>
        )}
        {!editing && profile?.bio && (
          <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6, margin: "6px 0 0", maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>{profile.bio}</p>
        )}
        {!profile?.is_pro && !editing && (
          <button onClick={() => router.push("/app/pro")}
            style={{ display: "block", margin: "10px auto 0", padding: "8px 20px", borderRadius: 999, border: "1px solid #FF450066", background: "transparent", color: "#FF4500", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            ✨ Upgrade to Pro
          </button>
        )}
      </div>

      {/* Tier Card */}
      {userTier && !editing && (
        <div style={{ background: "#1a1a1a", borderRadius: 18, padding: 16, marginBottom: 20, border: `1px solid ${userTier.color}33` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 32 }}>{userTier.emoji}</span>
              <div>
                <div style={{ fontWeight: 800, color: userTier.color, fontSize: 18 }}>{userTier.label}</div>
                <div style={{ fontSize: 12, color: "#555" }}>{userPoints.toLocaleString()} points</div>
              </div>
            </div>
            {userTier.nextPoints && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>NEXT TIER</div>
                <div style={{ fontSize: 13, color: "#888", fontWeight: 700 }}>{(userTier.nextPoints - userPoints).toLocaleString()} pts away</div>
              </div>
            )}
          </div>
          {userTier.nextPoints && (
            <div>
              <div style={{ background: "#111", borderRadius: 99, height: 6 }}>
                <div style={{
                  background: userTier.color,
                  width: `${Math.min(((userPoints - userTier.minPoints) / (userTier.nextPoints - userTier.minPoints)) * 100, 100)}%`,
                  height: 6, borderRadius: 99, transition: "width 0.5s"
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "#444" }}>
                <span>🏅 badge×100 · 💪 workout×10 · 🔥 streak×5</span>
              </div>
            </div>
          )}
          {!userTier.nextPoints && (
            <div style={{ fontSize: 12, color: userTier.color, fontWeight: 700, textAlign: "center" }}>
              ✨ Maximum tier reached!
            </div>
          )}
        </div>
      )}

      {/* Profile Completeness */}
      {!editing && profile && (() => {
        const checks = [
          { label: "City",           ok: !!profile.city,                              field: "city" },
          { label: "Sports",         ok: (profile.sports ?? []).length > 0,           field: "sports" },
          { label: "Training times", ok: (profile.preferred_times ?? []).length > 0,  field: "preferred_times" },
          { label: "Fitness level",  ok: !!profile.fitness_level,                     field: "fitness_level" },
          { label: "Profile photo",  ok: !!profile.avatar_url,                        field: "avatar" },
          { label: "Bio",            ok: !!profile.bio,                               field: "bio" },
        ];
        const done = checks.filter((c) => c.ok).length;
        const pct = Math.round((done / checks.length) * 100);
        if (pct === 100) return null;
        return (
          <div style={{ background: "#0d1f0d", borderRadius: 16, padding: 16, marginBottom: 20, border: "1px solid #22c55e22" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#22c55e" }}>Profile Completeness</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#22c55e" }}>{pct}%</div>
            </div>
            <div style={{ background: "#1a1a1a", borderRadius: 99, height: 8, marginBottom: 12 }}>
              <div style={{ background: "#22c55e", width: `${pct}%`, height: 8, borderRadius: 99, transition: "width 0.5s" }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {checks.map((c) => (
                <span key={c.field} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, border: `1px solid ${c.ok ? "#22c55e44" : "#333"}`, color: c.ok ? "#22c55e" : "#555", background: c.ok ? "#0d1f0d" : "transparent", fontWeight: 600 }}>
                  {c.ok ? "✓" : "○"} {c.label}
                </span>
              ))}
            </div>
            <button onClick={() => setEditing(true)}
              style={{ marginTop: 12, width: "100%", padding: "10px 0", borderRadius: 12, border: "none", background: "#22c55e", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              Complete Profile → Better Matches
            </button>
          </div>
        );
      })()}

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

          {/* Career */}
          <Section title="Career">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Job Title" value={form.occupation ?? ""} onChange={(v) => setForm({ ...form, occupation: v || null })} />
              <Field label="Company" value={form.company ?? ""} onChange={(v) => setForm({ ...form, company: v || null })} />
            </div>
            <div>
              <label style={labelStyle}>Industry</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {INDUSTRIES.map((ind) => (
                  <button key={ind} onClick={() => setForm({ ...form, industry: form.industry === ind ? null : ind })}
                    style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${form.industry === ind ? "#FF4500" : "#2a2a2a"}`, background: form.industry === ind ? "#FF4500" : "transparent", color: form.industry === ind ? "#fff" : "#888", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                    {ind}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Education</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EDUCATION_LEVELS.map((edu) => (
                  <button key={edu} onClick={() => setForm({ ...form, education_level: form.education_level === edu ? null : edu })}
                    style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${form.education_level === edu ? "#FF4500" : "#2a2a2a"}`, background: form.education_level === edu ? "#FF4500" : "transparent", color: form.education_level === edu ? "#fff" : "#888", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                    {edu}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Career Goals (optional)" value={form.career_goals ?? ""} onChange={(v) => setForm({ ...form, career_goals: v || null })} multiline />
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

          {/* Preferred Times */}
          <Section title="Training Time">
            <p style={{ fontSize: 12, color: "#666", margin: 0 }}>When do you prefer to train?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TIME_OPTIONS.map((t) => {
                const active = (form.preferred_times ?? []).includes(t.value);
                return (
                  <button key={t.value} onClick={() => {
                    const cur = form.preferred_times ?? [];
                    setForm({ ...form, preferred_times: active ? cur.filter(x => x !== t.value) : [...cur, t.value] });
                  }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, border: `1px solid ${active ? "#FF4500" : "#2a2a2a"}`, background: active ? "#FF450011" : "transparent", cursor: "pointer" }}>
                    <span style={{ fontSize: 18 }}>{t.emoji}</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 700, color: active ? "#FF4500" : "#fff", fontSize: 13 }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>{t.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Privacy */}
          <Section title="Privacy Settings">
            {([
              { key: "hide_profile" as keyof Privacy, label: "Hide my profile from Discover" },
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

          {/* Profile Completeness Bar */}
          {(() => {
            const { pct, missing } = calcCompleteness(profile!);
            if (pct === 100) return null;
            const color = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#FF4500";
            return (
              <div style={{ background: "#111", borderRadius: 16, padding: 16, border: `1px solid ${color}33` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Profile Completeness</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color }}>{pct}%</span>
                </div>
                <div style={{ background: "#1a1a1a", borderRadius: 99, height: 6, marginBottom: 12 }}>
                  <div style={{ background: color, width: `${pct}%`, height: 6, borderRadius: 99, transition: "width 0.5s" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {missing.slice(0, 3).map((m) => (
                    <div key={m} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#555" }}>◦</span>
                      <span style={{ fontSize: 12, color: "#666" }}>{m}</span>
                    </div>
                  ))}
                  {missing.length > 3 && (
                    <span style={{ fontSize: 11, color: "#444" }}>+{missing.length - 3} more fields</span>
                  )}
                </div>
                <button onClick={() => setEditing(true)}
                  style={{ marginTop: 12, width: "100%", padding: "9px 0", borderRadius: 10, border: `1px solid ${color}55`, background: "transparent", color, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Complete Profile →
                </button>
              </div>
            );
          })()}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {profile?.city && !privacy.hide_city && <Chip>📍 {profile.city}</Chip>}
            {profile?.gym_name && <Chip>🏋️ {profile.gym_name}</Chip>}
            {profile?.age && !privacy.hide_age && <Chip>🎂 {profile.age} yo</Chip>}
            {profile?.gender && <Chip>{profile.gender}</Chip>}
            {profile?.occupation && <Chip>💼 {profile.occupation}</Chip>}
            {profile?.company && <Chip>🏢 {profile.company}</Chip>}
            {profile?.industry && <Chip>🔖 {profile.industry}</Chip>}
            {profile?.education_level && <Chip>🎓 {profile.education_level}</Chip>}
          </div>

          {profile?.career_goals && (
            <div style={{ background: "#111", borderRadius: 14, padding: 14, border: "1px solid #1a1a1a" }}>
              <div style={{ fontSize: 11, color: "#555", fontWeight: 700, marginBottom: 6 }}>CAREER GOALS</div>
              <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{profile.career_goals}</p>
            </div>
          )}

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

          {/* Preferred Times */}
          {profile?.preferred_times && profile.preferred_times.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 8 }}>TRAINING TIME</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TIME_OPTIONS.filter(t => profile.preferred_times?.includes(t.value)).map(t => (
                  <span key={t.value} style={{ fontSize: 13, color: "#FF4500", background: "#1a0800", borderRadius: 10, padding: "6px 12px", border: "1px solid #FF450033", fontWeight: 600 }}>
                    {t.emoji} {t.label}
                  </span>
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
          <button onClick={shareProfile}
            style={{ padding: 14, borderRadius: 14, border: "1px solid #2a2a2a", background: "transparent", color: copied ? "#22c55e" : "#ccc", fontWeight: 700, fontSize: 16, cursor: "pointer", width: "100%" }}>
            {copied ? "✓ Link copied!" : "🔗 Share Profile"}
          </button>
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
