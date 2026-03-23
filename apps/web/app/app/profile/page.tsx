"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import { BADGE_MAP, type BadgeKey, type Tier, calcTier, calcUserPoints } from "../../../lib/badges";

const EDUCATION_LEVELS = ["High School", "Associate's", "Bachelor's", "Master's", "PhD", "Other"];
const INDUSTRIES = ["Technology", "Finance", "Healthcare", "Education", "Marketing", "Engineering", "Law", "Design", "Sports & Fitness", "Other"];
const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"] as const;
const SPORTS_LIST = ["Gym", "Running", "Cycling", "Swimming", "Soccer", "Football", "Basketball", "Tennis", "Boxing", "Yoga", "CrossFit", "Pilates", "Hiking", "Climbing", "Kayaking", "HIIT", "Rowing", "Dancing", "Chess", "Board Games"];
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
];

const ACT_TYPES = [
  { key: "weightlifting", label: "Weights",  emoji: "🏋️" },
  { key: "running",       label: "Running",  emoji: "🏃" },
  { key: "cycling",       label: "Cycling",  emoji: "🚴" },
  { key: "crossfit",      label: "CrossFit", emoji: "💪" },
  { key: "yoga",          label: "Yoga",     emoji: "🧘" },
  { key: "swimming",      label: "Swimming", emoji: "🏊" },
  { key: "hiking",        label: "Hiking",   emoji: "🏔️" },
  { key: "boxing",        label: "Boxing",   emoji: "🥊" },
  { key: "other",         label: "Other",    emoji: "⚡" },
];
const ACT_EMOJI: Record<string, string> = {
  weightlifting: "🏋️", running: "🏃", cycling: "🚴", swimming: "🏊",
  football: "⚽", basketball: "🏀", tennis: "🎾", boxing: "🥊",
  yoga: "🧘", crossfit: "💪", pilates: "🎯", hiking: "🏔️",
  rowing: "🚣", dancing: "💃", stretching: "🤸", other: "⚡",
  partner_session: "🤝",
};
const CAL_PER_MIN: Record<string, number> = {
  weightlifting: 6, running: 10, cycling: 8, swimming: 9, football: 8,
  basketball: 8, tennis: 7, boxing: 10, yoga: 3, crossfit: 12,
  pilates: 4, hiking: 6, rowing: 9, dancing: 5, stretching: 3, other: 5,
};

function getBestTime(times: string[] | null | undefined): string {
  if (!times || times.length === 0) return "Not set";
  const labels: Record<string, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
  return times.map((t) => labels[t] ?? t).join(", ");
}

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
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [certInput, setCertInput] = useState("");
  const [locating, setLocating] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<BadgeKey[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [userTier, setUserTier] = useState<Tier | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // My Activity tab
  const [profileTab, setProfileTab] = useState<"profile" | "activity">("profile");
  type ActivityWorkout = { id: string; exercise_type: string; duration_minutes: number | null; calories: number | null; logged_at: string };
  const [actWorkouts, setActWorkouts] = useState<ActivityWorkout[]>([]);
  const [actLoading, setActLoading] = useState(false);
  const [actLoaded, setActLoaded] = useState(false);
  const [actLogType, setActLogType] = useState("weightlifting");
  const [actLogDuration, setActLogDuration] = useState("");
  const [actLogging, setActLogging] = useState(false);
  const [actJustLogged, setActJustLogged] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

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

  async function fetchActivity(uid: string) {
    if (actLoaded) return;
    setActLoading(true);
    const { data } = await supabase
      .from("workouts")
      .select("id, exercise_type, duration_minutes, calories, logged_at")
      .eq("user_id", uid)
      .order("logged_at", { ascending: false })
      .limit(20);
    setActWorkouts(data ?? []);
    setActLoaded(true);
    setActLoading(false);
  }

  async function quickLogWorkout() {
    if (!userId || !actLogDuration) return;
    setActLogging(true);
    const dur = parseInt(actLogDuration) || 0;
    const cal = dur * (CAL_PER_MIN[actLogType] ?? 5);
    await supabase.from("workouts").insert({
      user_id: userId,
      exercise_type: actLogType,
      duration_minutes: dur,
      calories: cal,
      logged_at: new Date().toISOString(),
    });
    const { data } = await supabase
      .from("workouts")
      .select("id, exercise_type, duration_minutes, calories, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(20);
    setActWorkouts(data ?? []);
    setActLogDuration("");
    setActLogging(false);
    setActJustLogged(true);
    setTimeout(() => setActJustLogged(false), 2000);
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

  async function selectAvatar(url: string) {
    if (!userId) return;
    await supabase.from("users").update({ avatar_url: url }).eq("id", userId);
    setProfile((p) => p ? { ...p, avatar_url: url } : p);
    setForm((f) => f ? { ...f, avatar_url: url } : f);
    setShowAvatarPicker(false);
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
      setProfile(form); setEditing(false); showToast("Profile saved ✓");
      supabase.from("user_badges").select("badge_key").eq("user_id", userId)
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
    <>
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>

      {/* Avatar */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            src={avatarSrc || "/avatars/male/m1.jpeg"}
            alt="avatar"
            style={{ width: 96, height: 96, borderRadius: 48, objectFit: "cover", objectPosition: "top center", border: "3px solid var(--accent)" }}
          />
          {/* Camera button — upload real photo */}
          <button onClick={() => fileRef.current?.click()}
            style={{ position: "absolute", bottom: 0, right: -2, width: 28, height: 28, borderRadius: 14, background: "var(--accent)", border: "2px solid #0A0A0A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
            {uploading ? "⏳" : "📷"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadAvatar} />
        </div>

        {/* Choose avatar button — only when no real uploaded photo */}
        {(!avatarSrc || avatarSrc.startsWith("/avatars/")) && (
          <div style={{ marginTop: 10 }}>
            <button onClick={() => setShowAvatarPicker(true)}
              style={{ background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 20, padding: "6px 16px", color: "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              🎭 Choose Avatar
            </button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 }}>
          <div style={{ fontWeight: 500, color: "var(--text-muted)", fontSize: 14 }}>@{profile?.username}</div>
          {profile?.is_pro && (
            <span style={{ fontSize: 12, fontWeight: 800, color: "#60a5fa", background: "var(--bg-card-alt)", borderRadius: 999, padding: "3px 10px", border: "1px solid #60a5fa44" }}>💎 Pro</span>
          )}
        </div>
        {profile?.fitness_level && (
          <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, background: "var(--bg-card-alt)", borderRadius: 999, padding: "3px 12px", border: "1px solid var(--border-medium)", display: "inline-block", marginTop: 6, textTransform: "capitalize" }}>
            {profile.fitness_level}
          </span>
        )}
        {!editing && profile?.full_name && (
          <p style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800, margin: "8px 0 0", fontFamily: "var(--font-display)" }}>{profile.full_name}</p>
        )}
        {!editing && profile?.bio && (
          <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, margin: "6px 0 0", maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>{profile.bio}</p>
        )}
        {!editing && (
          <p style={{ color: "var(--text-faint)", fontSize: 12, margin: "6px 0 0", maxWidth: 300, marginLeft: "auto", marginRight: "auto" }}>Show what helps people decide if they should train with you.</p>
        )}
        {!profile?.is_pro && !editing && (
          <button onClick={() => router.push("/app/pro")}
            style={{ display: "block", margin: "10px auto 0", padding: "8px 20px", borderRadius: 999, border: "1px solid #FF450066", background: "transparent", color: "var(--accent)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            ✨ Upgrade to Pro
          </button>
        )}
      </div>


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
          <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 16, marginBottom: 20, border: "1px solid var(--border-medium)", boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--success)" }}>Profile Completeness</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "var(--success)" }}>{pct}%</div>
            </div>
            <div style={{ background: "var(--bg-card-alt)", borderRadius: 99, height: 8, marginBottom: 12 }}>
              <div style={{ background: "var(--success)", width: `${pct}%`, height: 8, borderRadius: 99, transition: "width 0.5s" }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {checks.map((c) => (
                <span key={c.field} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, border: `1px solid ${c.ok ? "var(--success)" : "var(--border-medium)"}`, color: c.ok ? "var(--success)" : "var(--text-faint)", background: c.ok ? "transparent" : "transparent", fontWeight: 600 }}>
                  {c.ok ? "✓" : "○"} {c.label}
                </span>
              ))}
            </div>
            <button onClick={() => setEditing(true)}
              style={{ marginTop: 12, width: "100%", padding: "10px 0", borderRadius: 12, border: "none", background: "var(--success)", color: "var(--text-primary)", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
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
            <Field label="Bio" value={form.bio ?? ""} onChange={(v) => setForm({ ...form, bio: v })} multiline maxLength={300} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="City" value={form.city ?? ""} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label="Age" value={form.age?.toString() ?? ""} onChange={(v) => setForm({ ...form, age: parseInt(v) || null })} type="number" />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <div style={{ display: "flex", gap: 8 }}>
                {GENDERS.map((g) => (
                  <button key={g.value} onClick={() => setForm({ ...form, gender: g.value })}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1px solid ${form.gender === g.value ? "var(--accent)" : "var(--bg-input)"}`, background: form.gender === g.value ? "var(--accent)" : "transparent", color: form.gender === g.value ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
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
                    style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1px solid ${form.fitness_level === level ? "var(--accent)" : "var(--bg-input)"}`, background: form.fitness_level === level ? "var(--accent)" : "transparent", color: form.fitness_level === level ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>
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
                    style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${form.industry === ind ? "var(--accent)" : "var(--bg-input)"}`, background: form.industry === ind ? "var(--accent)" : "transparent", color: form.industry === ind ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
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
                    style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${form.education_level === edu ? "var(--accent)" : "var(--bg-input)"}`, background: form.education_level === edu ? "var(--accent)" : "transparent", color: form.education_level === edu ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
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
                    style={{ padding: "7px 14px", borderRadius: 999, border: `1px solid ${active ? "var(--accent)" : "var(--bg-input)"}`, background: active ? "var(--accent)" : "transparent", color: active ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
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
                style={{ background: "var(--accent)", border: "none", borderRadius: 10, padding: "0 14px", color: "var(--text-primary)", fontWeight: 700, cursor: "pointer" }}>+</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CERT_SUGGESTIONS.map((c) => (
                <button key={c} onClick={() => addCert(c)}
                  style={{ padding: "5px 10px", borderRadius: 999, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-faint)", fontSize: 12, cursor: "pointer" }}>
                  + {c}
                </button>
              ))}
            </div>
            {(form.certifications ?? []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(form.certifications ?? []).map((c) => (
                  <span key={c} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--accent)", background: "var(--bg-card-alt)", borderRadius: 999, padding: "5px 10px", border: "1px solid var(--border-medium)" }}>
                    {c}
                    <button onClick={() => removeCert(c)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </Section>

          {/* Availability */}
          <Section title="Availability">
            <p style={{ fontSize: 12, color: "var(--text-faint)", margin: 0 }}>Which days are you available to train?</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DAYS.map((day) => {
                const active = form.availability?.[day];
                return (
                  <button key={day} onClick={() => toggleDay(day)}
                    style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${active ? "var(--accent)" : "var(--bg-input)"}`, background: active ? "var(--accent)" : "transparent", color: active ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {day}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Preferred Times */}
          <Section title="Training Time">
            <p style={{ fontSize: 12, color: "var(--text-faint)", margin: 0 }}>When do you prefer to train?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TIME_OPTIONS.map((t) => {
                const active = (form.preferred_times ?? []).includes(t.value);
                return (
                  <button key={t.value} onClick={() => {
                    const cur = form.preferred_times ?? [];
                    setForm({ ...form, preferred_times: active ? cur.filter(x => x !== t.value) : [...cur, t.value] });
                  }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, border: `1px solid ${active ? "var(--accent)" : "var(--bg-input)"}`, background: active ? "#FF450011" : "transparent", cursor: "pointer" }}>
                    <span style={{ fontSize: 18 }}>{t.emoji}</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 700, color: active ? "var(--accent)" : "var(--text-primary)", fontSize: 13 }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{t.sub}</div>
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
                <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>{item.label}</span>
                <button onClick={() => setPrivacy(item.key, !(form.privacy_settings ?? DEFAULT_PRIVACY)[item.key])}
                  style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: (form.privacy_settings ?? DEFAULT_PRIVACY)[item.key] ? "var(--accent)" : "#333", position: "relative", transition: "background 0.2s" }}>
                  <span style={{ position: "absolute", top: 2, left: (form.privacy_settings ?? DEFAULT_PRIVACY)[item.key] ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: "var(--text-primary)", transition: "left 0.2s", display: "block" }} />
                </button>
              </div>
            ))}
          </Section>

          {error && <p style={{ color: "#ff6b6b", fontSize: 13, textAlign: "center" }}>{error}</p>}

          <div style={{ display: "flex", gap: 10, paddingBottom: 24 }}>
            <button onClick={() => { setForm(profile); setEditing(false); setError(null); }}
              style={{ flex: 1, padding: 14, borderRadius: 14, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={saveProfile} disabled={saving}
              style={{ flex: 2, padding: 14, borderRadius: 14, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Tab switcher: Profile | Activity */}
          <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", borderRadius: 14, padding: 4 }}>
            {(["profile", "activity"] as const).map((t) => (
              <button key={t} onClick={() => {
                setProfileTab(t);
                if (t === "activity" && userId) fetchActivity(userId);
              }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: profileTab === t ? "var(--accent)" : "transparent", color: profileTab === t ? "var(--text-primary)" : "var(--text-faint)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {t === "profile" ? "👤 Profile" : "💪 My Activity"}
              </button>
            ))}
          </div>

          {/* ── MY ACTIVITY TAB ── */}
          {profileTab === "activity" && (() => {
            const weekStart = new Date(Date.now() - 7 * 86400000).toISOString();
            const weekCount = actWorkouts.filter(w => w.logged_at >= weekStart).length;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { label: "STREAK", value: `🔥 ${profile?.current_streak ?? 0}`, sub: "days" },
                    { label: "THIS WEEK", value: `💪 ${weekCount}`, sub: "sessions" },
                    { label: "ALL TIME", value: `📅 ${actWorkouts.length}${actWorkouts.length === 20 ? "+" : ""}`, sub: "workouts" },
                  ].map(({ label, value, sub }) => (
                    <div key={label} style={{ background: "var(--bg-card-alt)", borderRadius: 14, padding: "12px 10px", border: "1px solid var(--border)", textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-faint)", letterSpacing: 0.6, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text-primary)" }}>{value}</div>
                      <div style={{ fontSize: 11, color: "var(--text-ultra-faint)", marginTop: 2 }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Quick log form */}
                <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 16, border: "1px solid var(--border-medium)" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12 }}>Log a Workout</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {ACT_TYPES.map(({ key, label, emoji }) => (
                      <button key={key} onClick={() => setActLogType(key)}
                        style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${actLogType === key ? "var(--accent)" : "var(--border-medium)"}`, background: actLogType === key ? "var(--accent)" : "var(--bg-card-alt)", color: actLogType === key ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                        {emoji} {label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="number" placeholder="Duration (min)"
                      value={actLogDuration}
                      onChange={(e) => setActLogDuration(e.target.value)}
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-medium)", background: "var(--bg-card-alt)", color: "var(--text-primary)", fontSize: 14, outline: "none" }}
                    />
                    <button onClick={quickLogWorkout} disabled={actLogging || !actLogDuration}
                      style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: (!actLogDuration || actLogging) ? 0.5 : 1 }}>
                      {actJustLogged ? "✓ Done!" : actLogging ? "..." : "Log"}
                    </button>
                  </div>
                </div>

                {/* Recent workouts */}
                {actLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                    <div style={{ width: 24, height: 24, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                ) : actWorkouts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-faint)", fontSize: 14 }}>
                    No workouts yet — log your first one above!
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", letterSpacing: 0.6 }}>RECENT WORKOUTS</div>
                    {actWorkouts.map((w) => {
                      const emoji = ACT_EMOJI[w.exercise_type] ?? "⚡";
                      const label = w.exercise_type.charAt(0).toUpperCase() + w.exercise_type.slice(1).replace(/_/g, " ");
                      const date = new Date(w.logged_at);
                      const diff = Date.now() - date.getTime();
                      const daysAgo = Math.floor(diff / 86400000);
                      const when = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;
                      return (
                        <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-card-alt)", borderRadius: 12, padding: "10px 14px", border: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 22, flexShrink: 0 }}>{emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{label}</div>
                            <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                              {w.duration_minutes ? `${w.duration_minutes} min` : "—"}
                              {w.calories ? ` · ${w.calories} kcal` : ""}
                            </div>
                          </div>
                          <span style={{ fontSize: 12, color: "var(--text-ultra-faint)", flexShrink: 0 }}>{when}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })()}

          {/* ── PROFILE TAB ── */}
          {profileTab === "profile" && <>

          {/* Profile Completeness Bar */}
          {(() => {
            const { pct, missing } = calcCompleteness(profile!);
            if (pct === 100) return null;
            const color = pct >= 70 ? "var(--success)" : pct >= 40 ? "#f59e0b" : "var(--accent)";
            return (
              <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 16, border: `1px solid ${color}33`, boxShadow: "var(--shadow-card)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Profile Completeness</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color }}>{pct}%</span>
                </div>
                <div style={{ background: "var(--bg-card-alt)", borderRadius: 99, height: 6, marginBottom: 12 }}>
                  <div style={{ background: color, width: `${pct}%`, height: 6, borderRadius: 99, transition: "width 0.5s" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {missing.slice(0, 3).map((m) => (
                    <div key={m} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--text-faint)" }}>◦</span>
                      <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{m}</span>
                    </div>
                  ))}
                  {missing.length > 3 && (
                    <span style={{ fontSize: 11, color: "var(--text-ultra-faint)" }}>+{missing.length - 3} more fields</span>
                  )}
                </div>
                <button onClick={() => setEditing(true)}
                  style={{ marginTop: 12, width: "100%", padding: "9px 0", borderRadius: 10, border: `1px solid ${color}55`, background: "transparent", color, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Complete Profile →
                </button>
              </div>
            );
          })()}

          {/* 2×2 Info Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { label: "MAIN GOAL", value: profile?.career_goals || (profile?.fitness_level ? profile.fitness_level.charAt(0).toUpperCase() + profile.fitness_level.slice(1) + " training" : "Not set") },
              { label: "BEST TIME", value: getBestTime(profile?.preferred_times) },
              { label: "ACTIVITIES", value: (profile?.sports ?? []).slice(0, 3).join(", ") || "Not set" },
              { label: "PARTNER VIBE", value: (profile as any)?.looking_for?.[0] ?? (profile?.fitness_level ? profile.fitness_level.charAt(0).toUpperCase() + profile.fitness_level.slice(1) + " level" : "Not set") },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "var(--bg-card-alt)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-faint)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Consistency Score */}
          {(() => {
            const { pct } = calcCompleteness(profile!);
            const currentStreak = profile?.current_streak ?? 0;
            const consistencyScore = Math.min(100, Math.round(pct * 0.6 + Math.min(currentStreak * 5, 25)));
            return (
              <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 16, border: "1px solid var(--border)", marginBottom: 16, boxShadow: "var(--shadow-card)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>Consistency Score</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Activity · Profile · Response rate</div>
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "var(--accent)", fontFamily: "var(--font-display)" }}>{consistencyScore}</div>
                </div>
                <div style={{ background: "var(--bg-card-alt)", borderRadius: 999, height: 8, overflow: "hidden" }}>
                  <div style={{ height: 8, width: `${consistencyScore}%`, borderRadius: 999, background: consistencyScore >= 70 ? "var(--success)" : "var(--accent)", transition: "width 0.6s ease" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
                  {consistencyScore >= 70 ? "Great consistency — partners will trust you." : consistencyScore >= 40 ? "Good start — keep logging workouts to improve." : "Log workouts and complete your profile to raise your score."}
                </div>
              </div>
            );
          })()}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {profile?.city && !privacy.hide_city && <Chip>📍 {profile.city}</Chip>}
            {profile?.gym_name && <Chip>🏋️ {profile.gym_name}</Chip>}
            {profile?.age && !privacy.hide_age && <Chip>🎂 {profile.age} yo</Chip>}
            {profile?.gender && <Chip>{profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}</Chip>}
            {profile?.occupation && <Chip>💼 {profile.occupation}</Chip>}
            {profile?.company && <Chip>🏢 {profile.company}</Chip>}
            {profile?.industry && <Chip>🔖 {profile.industry}</Chip>}
            {profile?.education_level && <Chip>🎓 {profile.education_level}</Chip>}
          </div>

          {profile?.career_goals && (
            <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: 14, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 800, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>Career Goals</div>
              <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{profile.career_goals}</p>
            </div>
          )}

          {(profile?.weight || profile?.target_weight) && !privacy.hide_weight && (
            <div style={{ background: "var(--bg-card-alt)", borderRadius: 16, padding: 16, border: "1px solid var(--border-medium)", display: "flex", justifyContent: "space-around", boxShadow: "var(--shadow-card)" }}>
              {profile.weight && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--accent)" }}>{profile.weight}<span style={{ fontSize: 13, color: "var(--text-faint)" }}>lbs</span></div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>Current</div>
                </div>
              )}
              {profile.target_weight && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--accent)" }}>{profile.target_weight}<span style={{ fontSize: 13, color: "var(--text-faint)" }}>lbs</span></div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>Target</div>
                </div>
              )}
            </div>
          )}

          {profile?.sports && profile.sports.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.sports.map((s) => (
                <span key={s} style={{ fontSize: 13, color: "var(--accent)", background: "var(--bg-card-alt)", borderRadius: 999, padding: "5px 12px", border: "1px solid var(--accent-faint)", fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          )}

          {profile?.certifications && profile.certifications.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 800, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Certifications</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {profile.certifications.map((c) => (
                  <span key={c} style={{ fontSize: 13, color: "var(--success)", background: "var(--bg-card-alt)", borderRadius: 999, padding: "5px 12px", border: "1px solid var(--border-medium)", fontWeight: 600 }}>🏅 {c}</span>
                ))}
              </div>
            </div>
          )}

          {profile?.availability && Object.keys(profile.availability).some(k => profile.availability![k]) && (
            <div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 800, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Availability</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DAYS.filter(d => profile.availability?.[d]).map((d) => (
                  <span key={d} style={{ fontSize: 12, color: "var(--accent)", background: "var(--bg-card-alt)", borderRadius: 8, padding: "4px 10px", border: "1px solid var(--accent-faint)", fontWeight: 700 }}>{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* Preferred Times */}
          {profile?.preferred_times && profile.preferred_times.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 800, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Training Time</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TIME_OPTIONS.filter(t => profile.preferred_times?.includes(t.value)).map(t => (
                  <span key={t.value} style={{ fontSize: 13, color: "var(--accent)", background: "var(--bg-card-alt)", borderRadius: 10, padding: "6px 12px", border: "1px solid var(--accent-faint)", fontWeight: 600 }}>
                    {t.emoji} {t.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tier Card */}
          {userTier && (
            <div style={{ background: "var(--bg-card)", borderRadius: 18, padding: 16, border: "1px solid var(--border-medium)", boxShadow: "var(--shadow-card)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 32 }}>{userTier.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 800, color: userTier.color, fontSize: 18 }}>{userTier.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{userPoints.toLocaleString()} points</div>
                  </div>
                </div>
                {userTier.nextPoints && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>NEXT TIER</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>{(userTier.nextPoints - userPoints).toLocaleString()} pts away</div>
                  </div>
                )}
              </div>
              {userTier.nextPoints && (
                <div>
                  <div style={{ background: "var(--bg-card)", borderRadius: 99, height: 6 }}>
                    <div style={{
                      background: userTier.color,
                      width: `${Math.min(((userPoints - userTier.minPoints) / (userTier.nextPoints - userTier.minPoints)) * 100, 100)}%`,
                      height: 6, borderRadius: 99, transition: "width 0.5s"
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "var(--text-ultra-faint)" }}>
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

          {/* Badges */}
          <div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 800, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Badges</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {earnedBadges.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--text-ultra-faint)", margin: 0 }}>No badges yet — start connecting and completing goals!</p>
              )}
              {earnedBadges.map((key) => {
                const b = BADGE_MAP[key];
                if (!b) return null;
                return (
                  <div key={key} title={b.description}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-card)", border: `1px solid ${b.color}33`, borderRadius: 12, padding: "8px 12px" }}>
                    <span style={{ fontSize: 20 }}>{b.emoji}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: b.color }}>{b.title}</div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{b.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Streak Stats */}
          {((profile?.current_streak ?? 0) > 0 || (profile?.longest_streak ?? 0) > 0) && (
            <div style={{ background: "var(--bg-card-alt)", borderRadius: 16, padding: 16, border: "1px solid var(--border-medium)", display: "flex", justifyContent: "space-around", boxShadow: "var(--shadow-card)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "var(--accent)" }}>🔥 {profile?.current_streak ?? 0}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, marginTop: 2 }}>CURRENT STREAK</div>
              </div>
              <div style={{ width: 1, background: "var(--bg-input)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#f59e0b" }}>🏆 {profile?.longest_streak ?? 0}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, marginTop: 2 }}>BEST STREAK</div>
              </div>
            </div>
          )}

          <button onClick={shareProfile}
            style={{ padding: 14, borderRadius: 14, border: "1px solid var(--border-medium)", background: "var(--bg-card)", color: copied ? "var(--success)" : "var(--text-secondary)", fontWeight: 700, fontSize: 15, cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>{copied ? "✓ Link copied!" : "🔗 Share Profile"}</span>
            {!copied && <span style={{ color: "var(--text-faint)" }}>→</span>}
          </button>
          <a href="/app/settings"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, border: "1px solid var(--border-medium)", background: "var(--bg-card)", color: "var(--text-secondary)", fontWeight: 700, fontSize: 15, cursor: "pointer", textDecoration: "none" }}>
            <span>⚙️ Settings</span>
            <span style={{ color: "var(--text-faint)" }}>→</span>
          </a>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}
            style={{ padding: 14, borderRadius: 14, border: "1px solid #ef444444", background: "transparent", color: "#ef4444", fontWeight: 700, fontSize: 15, cursor: "pointer", width: "100%" }}>
            🚪 Sign Out
          </button>
          <button onClick={() => setEditing(true)}
            style={{ padding: 14, borderRadius: 14, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", width: "100%" }}>
            Edit Profile
          </button>
          <button onClick={saveLocation} disabled={locating}
            style={{ padding: 14, borderRadius: 14, border: "1px solid var(--border-medium)", background: "var(--bg-card)", color: profile?.lat ? "var(--success)" : "var(--text-muted)", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: locating ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <span>{locating ? "Getting location..." : profile?.lat ? "📍 Location saved ✓" : "📍 Save my location"}</span>
            {!locating && !profile?.lat && <span style={{ color: "var(--text-faint)" }}>→</span>}
          </button>
          </>}
        </div>
      )}
    </div>
      {/* ── Avatar Picker Modal ── */}
      {showAvatarPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setShowAvatarPicker(false)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto", padding: 24, paddingBottom: 40 }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)" }}>Choose Your Avatar</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Pick one or upload your own photo 📷</div>
              </div>
              <button onClick={() => setShowAvatarPicker(false)}
                style={{ background: "var(--bg-card-alt)", border: "none", borderRadius: 20, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "var(--text-muted)" }}>✕</button>
            </div>

            {/* Male avatars */}
            {(profile?.gender !== "female") && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Men</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
                  {[
                    "/avatars/male/m1.jpeg", "/avatars/male/m2.jpeg", "/avatars/male/m3.jpeg",
                    "/avatars/male/m4.jpeg", "/avatars/male/m5.jpeg", "/avatars/male/m6.jpeg",
                    "/avatars/male/m7.jpeg", "/avatars/male/m8.jpeg", "/avatars/male/m9.jpeg",
                    "/avatars/male/m10.jpeg", "/avatars/male/m11.jpeg", "/avatars/male/m12.jpeg",
                  ].map((src) => (
                    <button key={src} onClick={() => selectAvatar(src)}
                      style={{ padding: 0, border: avatarSrc === src ? "3px solid var(--accent)" : "2px solid var(--border-medium)", borderRadius: 14, overflow: "hidden", cursor: "pointer", aspectRatio: "1", background: "none" }}>
                      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Female avatars */}
            {(profile?.gender !== "male") && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Women</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
                  {[
                    "/avatars/female/f1.jpeg", "/avatars/female/f2.jpeg", "/avatars/female/f3.jpeg",
                    "/avatars/female/f4.jpeg", "/avatars/female/f5.jpeg", "/avatars/female/f6.jpeg",
                    "/avatars/female/f7.jpeg", "/avatars/female/f8.jpeg", "/avatars/female/f9.jpeg",
                    "/avatars/female/f10.jpeg", "/avatars/female/f11.jpeg", "/avatars/female/f12.jpeg",
                  ].map((src) => (
                    <button key={src} onClick={() => selectAvatar(src)}
                      style={{ padding: 0, border: avatarSrc === src ? "3px solid var(--accent)" : "2px solid var(--border-medium)", borderRadius: 14, overflow: "hidden", cursor: "pointer", aspectRatio: "1", background: "none" }}>
                      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Upload own photo */}
            <button onClick={() => { setShowAvatarPicker(false); fileRef.current?.click(); }}
              style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "2px dashed var(--border-medium)", background: "transparent", color: "var(--text-muted)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              📷 Upload my own photo
            </button>
          </div>
        </div>
      )}
      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          background: "var(--text-primary)", color: "var(--bg-page)",
          padding: "12px 20px", borderRadius: 999, fontWeight: 700, fontSize: 14,
          zIndex: 9999, whiteSpace: "nowrap", animation: "slideUp 0.2s ease",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
        }}>{toast}</div>
      )}
    </>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 13, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 };
const inputStyle: React.CSSProperties = { background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box", width: "100%" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 16, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12, boxShadow: "var(--shadow-card)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, multiline, type, maxLength }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string; maxLength?: number }) {
  const style: React.CSSProperties = { ...inputStyle, ...(multiline ? { height: 72, resize: "none", paddingBottom: maxLength ? 28 : 10 } : {}) };
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {multiline
        ? (
          <div style={{ position: "relative" }}>
            <textarea style={style} value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} />
            {maxLength && (
              <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 11, color: value.length > maxLength * 0.93 ? "var(--error, #ef4444)" : "var(--text-faint)", fontWeight: 600 }}>
                {value.length}/{maxLength}
              </div>
            )}
          </div>
        )
        : <input style={style} type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} />
      }
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 13, color: "var(--text-secondary)", background: "var(--bg-card-alt)", borderRadius: 999, padding: "6px 14px", border: "1px solid var(--border-medium)" }}>{children}</span>;
}

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
