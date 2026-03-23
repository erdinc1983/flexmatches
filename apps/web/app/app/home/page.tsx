"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const WORKOUT_TYPES = [
  "Gym", "Running", "Cycling", "Swimming", "Boxing", "Yoga",
  "CrossFit", "Pilates", "HIIT", "Football", "Basketball", "Hiking", "Other",
];


type Workout = {
  id: string;
  workout_type: string;
  duration_minutes: number | null;
  notes: string | null;
  logged_at: string;
};


type SuggestedUser = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  sports: string[] | null;
  fitness_level: string | null;
  gender: string | null;
  age: number | null;
  sharedSports: string[];
  score: number;
};

const MALE_AVATARS: Record<"young" | "middle" | "senior", string[]> = {
  young:  ["/avatars/male/m1.jpeg","/avatars/male/m2.jpeg","/avatars/male/m3.jpeg","/avatars/male/m4.jpeg","/avatars/male/m5.jpeg","/avatars/male/m6.jpeg"],
  middle: ["/avatars/male/m7.jpeg","/avatars/male/m8.jpeg","/avatars/male/m9.jpeg","/avatars/male/m10.jpeg"],
  senior: ["/avatars/male/m11.jpeg","/avatars/male/m12.jpeg"],
};
const FEMALE_AVATARS: Record<"young" | "middle" | "senior", string[]> = {
  young:  ["/avatars/female/f1.jpeg","/avatars/female/f2.jpeg","/avatars/female/f3.jpeg","/avatars/female/f4.jpeg","/avatars/female/f5.jpeg","/avatars/female/f6.jpeg"],
  middle: ["/avatars/female/f7.jpeg","/avatars/female/f8.jpeg","/avatars/female/f9.jpeg","/avatars/female/f10.jpeg"],
  senior: ["/avatars/female/f11.jpeg","/avatars/female/f12.jpeg"],
};
function getAgeGroup(age: number | null): "young" | "middle" | "senior" {
  if (!age || age < 38) return "young";
  if (age < 55) return "middle";
  return "senior";
}
function getDefaultAvatar(userId: string, gender: string | null, age: number | null): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  const group = getAgeGroup(age);
  if (gender === "female") return FEMALE_AVATARS[group][hash % FEMALE_AVATARS[group].length];
  return MALE_AVATARS[group][hash % MALE_AVATARS[group].length];
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function HomePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Workout log
  const [showLogForm, setShowLogForm] = useState(false);
  const [logType, setLogType] = useState("Gym");
  const [logDuration, setLogDuration] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logging, setLogging] = useState(false);
  const [todayWorkouts, setTodayWorkouts] = useState<Workout[]>([]);
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [profileScore, setProfileScore] = useState(100);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Gym status
  const [isAtGym, setIsAtGym] = useState(false);
  const [gymTogglingOn, setGymTogglingOn] = useState(false);

  // Pending match requests
  type PendingRequest = { id: string; sender_id: string; full_name: string; avatar_url: string | null; sports: string[]; gender: string | null; age: number | null };
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [processingReq, setProcessingReq] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);

  useEffect(() => { loadData(); }, []);

  // Realtime: refresh pending requests when a new match arrives
  useEffect(() => {
    const channel = supabase.channel("home-matches")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches" }, async () => {
        if (!userIdRef.current) return;
        const uid = userIdRef.current;
        const { data: pendingData } = await supabase
          .from("matches")
          .select("id, sender_id, users!matches_sender_id_fkey(full_name, avatar_url, sports, gender, age)")
          .eq("receiver_id", uid).eq("status", "pending").limit(5);
        setPendingRequests((pendingData ?? []).map((m: any) => ({
          id: m.id, sender_id: m.sender_id,
          full_name: m.users?.full_name ?? "Unknown",
          avatar_url: m.users?.avatar_url ?? null,
          sports: m.users?.sports ?? [],
          gender: m.users?.gender ?? null,
          age: m.users?.age ?? null,
        })));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadData() {
    try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    userIdRef.current = user.id;

    const today = localToday();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [{ data: userData }, { data: workoutsData }, { data: likedData }, { data: passedData }, { data: blockedData }] = await Promise.all([
      supabase.from("users").select("username, full_name, current_streak, sports, fitness_level, city, bio, avatar_url, gym_name, is_at_gym, age, availability").eq("id", user.id).single(),
      supabase.from("workouts").select("*").eq("user_id", user.id).gte("logged_at", weekAgo).order("logged_at", { ascending: false }),
      supabase.from("matches").select("receiver_id").eq("sender_id", user.id),
      supabase.from("passes").select("passed_id").eq("user_id", user.id),
      supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
    ]);

    setUsername(userData?.username ?? "");
    const first = userData?.full_name?.trim().split(" ")[0] ?? userData?.username ?? "";
    setFirstName(first);
    setCurrentStreak(userData?.current_streak ?? 0);
    setIsAtGym(userData?.is_at_gym ?? false);

    // Pending incoming match requests
    const { data: pendingData } = await supabase
      .from("matches")
      .select("id, sender_id, users!matches_sender_id_fkey(full_name, avatar_url, sports, gender, age)")
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .limit(5);
    setPendingRequests(
      (pendingData ?? []).map((m: any) => ({
        id: m.id,
        sender_id: m.sender_id,
        full_name: m.users?.full_name ?? "Unknown",
        avatar_url: m.users?.avatar_url ?? null,
        sports: m.users?.sports ?? [],
        gender: m.users?.gender ?? null,
        age: m.users?.age ?? null,
      }))
    );

    // Profile completeness
    const checks: { label: string; filled: boolean }[] = [
      { label: "🖼️ Profile photo",  filled: !!userData?.avatar_url },
      { label: "📛 Full name",       filled: !!userData?.full_name },
      { label: "📝 Bio",            filled: !!userData?.bio },
      { label: "📍 City",           filled: !!userData?.city },
      { label: "⭐ Fitness level",  filled: !!userData?.fitness_level },
      { label: "🎂 Age",            filled: !!userData?.age },
      { label: "🏋️ Sports",        filled: (userData?.sports ?? []).length > 0 },
      { label: "🕐 Availability",   filled: !!userData?.availability && Object.values(userData.availability as Record<string, boolean>).some(Boolean) },
    ];
    const missing = checks.filter((c) => !c.filled).map((c) => c.label);
    const pct = Math.round(((checks.length - missing.length) / checks.length) * 100);
    setProfileScore(pct);
    setMissingFields(missing);
    setBannerDismissed(sessionStorage.getItem("profile_banner_dismissed") === "1");

    // Build suggested matches
    const excludeIds = new Set([
      user.id,
      ...(likedData ?? []).map((r: any) => r.receiver_id),
      ...(passedData ?? []).map((r: any) => r.passed_id),
      ...(blockedData ?? []).map((r: any) => r.blocked_id),
    ]);
    const mySports: string[] = userData?.sports ?? [];
    const myLevel: string = userData?.fitness_level ?? "";
    const myCity: string = userData?.city ?? "";

    const { data: candidates } = await supabase
      .from("users")
      .select("id, username, full_name, avatar_url, city, sports, fitness_level, gender, age, privacy_settings")
      .neq("id", user.id);

    const scored: SuggestedUser[] = (candidates ?? [])
      .filter((u: any) => !excludeIds.has(u.id) && !(u.privacy_settings as any)?.hide_profile)
      .map((u: any) => {
        const shared = mySports.filter((s) => (u.sports ?? []).includes(s));
        let score = shared.length * 30;
        if (myLevel && u.fitness_level === myLevel) score += 20;
        if (myCity && u.city && u.city.toLowerCase() === myCity.toLowerCase()) score += 25;
        return { ...u, sharedSports: shared, score };
      })
      .sort((a: SuggestedUser, b: SuggestedUser) => b.score - a.score)
      .slice(0, 3);

    setSuggested(scored);

    const allWorkouts = workoutsData ?? [];
    setTodayWorkouts(allWorkouts.filter((w: Workout) => w.logged_at.startsWith(today)));
    setLoading(false);
    } catch {
      setLoadError(true);
      setLoading(false);
    }
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
    setShowLogForm(false);
    setLogDuration("");
    setLogNotes("");
    setLogging(false);
    loadData();
  }

  async function toggleGymStatus() {
    if (!userId) return;
    setGymTogglingOn(true);
    const next = !isAtGym;
    await supabase.from("users").update({
      is_at_gym: next,
      gym_checkin_at: next ? new Date().toISOString() : null,
    }).eq("id", userId);
    setIsAtGym(next);
    setGymTogglingOn(false);
  }

  async function acceptRequest(matchId: string) {
    setProcessingReq(matchId);
    await supabase.from("matches").update({ status: "matched" }).eq("id", matchId);
    setPendingRequests((prev) => prev.filter((r) => r.id !== matchId));
    setProcessingReq(null);
  }

  async function declineRequest(matchId: string) {
    setProcessingReq(matchId);
    await supabase.from("matches").update({ status: "declined" }).eq("id", matchId);
    setPendingRequests((prev) => prev.filter((r) => r.id !== matchId));
    setProcessingReq(null);
  }

  async function quickConnect(target: SuggestedUser) {
    if (!userId || connectingId) return;
    setConnectingId(target.id);
    const { data: mutual } = await supabase.from("matches").select("id").eq("sender_id", target.id).eq("receiver_id", userId).eq("status", "pending").maybeSingle();
    if (mutual) {
      await supabase.from("matches").update({ status: "accepted" }).eq("id", mutual.id);
    } else {
      await supabase.from("matches").insert({ sender_id: userId, receiver_id: target.id, status: "pending" });
    }
    setConnectedIds((prev) => new Set([...prev, target.id]));
    setConnectingId(null);
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  }

  function getWorkoutTime() {
    const h = new Date().getHours();
    if (h < 12) return "this morning's";
    if (h < 17) return "this afternoon's";
    return "tonight's";
  }

  const todayCheckedIn = todayWorkouts.length > 0;

  if (loadError) return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)", marginBottom: 8 }}>Couldn't load</div>
      <div style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>Check your connection and try again.</div>
      <button onClick={() => { setLoadError(false); setLoading(true); loadData(); }} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Try Again</button>
    </div>
  );

  if (loading) return (
    <div style={{ padding: "20px 16px", paddingBottom: 80 }}>
      <div style={{ height: 28, width: "55%", borderRadius: 8, background: "linear-gradient(90deg, var(--bg-card-alt) 25%, var(--border) 50%, var(--bg-card-alt) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", marginBottom: 20 }} />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ borderRadius: 16, padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", marginBottom: 10 }}>
          <div style={{ height: 16, width: "60%", borderRadius: 8, background: "linear-gradient(90deg, var(--bg-card-alt) 25%, var(--border) 50%, var(--bg-card-alt) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
          <div style={{ height: 12, width: "80%", borderRadius: 8, background: "linear-gradient(90deg, var(--bg-card-alt) 25%, var(--border) 50%, var(--bg-card-alt) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", marginTop: 10 }} />
          <div style={{ height: 12, width: "40%", borderRadius: 8, background: "linear-gradient(90deg, var(--bg-card-alt) 25%, var(--border) 50%, var(--bg-card-alt) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", marginTop: 8 }} />
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ padding: "0 0 80px", maxWidth: 480, margin: "0 auto" }}>

      {/* ── 1. Greeting Header ─────────────────────────────────── */}
      <div style={{ padding: "24px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, letterSpacing: 0.3 }}>{getGreeting()}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.5, lineHeight: 1.2, fontFamily: "var(--font-display)" }}>{firstName} 👋</div>
        </div>
        <button
          onClick={toggleGymStatus}
          disabled={gymTogglingOn}
          style={{
            padding: "8px 14px", borderRadius: 99,
            border: `1px solid ${isAtGym ? "#22c55e66" : "var(--border-medium)"}`,
            background: isAtGym ? "var(--bg-card-alt)" : "var(--bg-card)",
            color: isAtGym ? "#22c55e" : "var(--text-faint)",
            fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
          }}>
          {gymTogglingOn ? "..." : isAtGym ? "🏋️ At Gym" : "🏋️ Check In"}
        </button>
      </div>

      {/* ── 2. Streak + Check-in Banner ────────────────────────── */}
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {/* Streak card */}
        <div style={{ background: "var(--bg-card)", borderRadius: 18, padding: "18px 16px", border: "1px solid var(--border-medium)", position: "relative", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
          <div style={{ position: "absolute", top: -8, right: -8, fontSize: 72, opacity: 0.07 }}>🔥</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>Streak</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>{currentStreak}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>day streak</div>
        </div>
        {/* Check-in card */}
        <button
          onClick={() => setShowLogForm(true)}
          style={{
            background: "var(--bg-card)",
            borderRadius: 18, padding: "18px 16px",
            border: "1px solid var(--border)",
            position: "relative", overflow: "hidden", cursor: "pointer", textAlign: "left",
            boxShadow: "var(--shadow-card)",
          }}>
          <div style={{ position: "absolute", top: -10, right: -10, fontSize: 60, opacity: 0.06 }}>✅</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: 0.5, marginBottom: 6 }}>TODAY</div>
          <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 4 }}>{todayCheckedIn ? "✅" : "⬜"}</div>
          <div style={{ fontSize: 12, color: todayCheckedIn ? "var(--success)" : "var(--text-muted)", fontWeight: 600 }}>
            {todayCheckedIn ? "Checked in!" : "Check in today"}
          </div>
        </button>
      </div>

      {/* ── Pending match requests ─────────────────────────────── */}
      {pendingRequests.length > 0 && (
        <div style={{ padding: "0 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <SectionTitle>Match Requests ({pendingRequests.length})</SectionTitle>
            <button onClick={() => router.push("/app/matches")}
              style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              See All →
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendingRequests.map((req) => (
              <div key={req.id} style={{
                background: "var(--bg-card)", border: "1px solid var(--border-medium)",
                borderLeft: "3px solid var(--accent)",
                borderRadius: 14, padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <img
                  src={req.avatar_url || getDefaultAvatar(req.sender_id, req.gender, req.age)}
                  alt="" style={{ width: 44, height: 44, borderRadius: 22, objectFit: "cover", flexShrink: 0, border: "2px solid var(--border-medium)" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{req.full_name?.split(" ")[0] ?? "Someone"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{req.full_name}</div>
                  {req.sports.length > 0 && (
                    <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                      {req.sports.slice(0, 2).join(" · ")}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => declineRequest(req.id)} disabled={processingReq === req.id}
                    style={{ padding: "7px 12px", borderRadius: 10, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-muted)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    ✕
                  </button>
                  <button onClick={() => acceptRequest(req.id)} disabled={processingReq === req.id}
                    style={{ padding: "7px 14px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                    {processingReq === req.id ? "..." : "✓ Accept"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. Find Your Partner Hero ─────────────────────────── */}
      <div style={{ padding: "0 16px", marginBottom: 20 }}>
        <div style={{
          borderRadius: 24,
          background: "linear-gradient(135deg, var(--accent) 0%, #ff6b35 100%)",
          padding: "24px 20px",
          position: "relative", overflow: "hidden",
          boxShadow: "0 16px 40px rgba(255, 90, 31, 0.25)",
        }}>
          <div style={{ position: "absolute", top: -20, right: -20, fontSize: 110, opacity: 0.08, lineHeight: 1, pointerEvents: "none" }}>🔍</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            Find a partner
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 8, fontFamily: "var(--font-display)" }}>
            {suggested.length > 0
              ? `Find a partner for ${getWorkoutTime()} workout`
              : "Find your training partner"}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", marginBottom: 20, lineHeight: 1.5 }}>
            {suggested.length > 0
              ? `${suggested.length} ${suggested.length === 1 ? "person matches" : "people match"} your schedule and level.`
              : "Discover fitness partners who match your goals and schedule."}
          </div>
          <button
            onClick={() => router.push("/app/discover")}
            style={{
              background: "#fff", color: "#1f1a17",
              border: "none", borderRadius: 14,
              padding: "14px 20px", width: "100%",
              fontWeight: 800, fontSize: 15, cursor: "pointer",
              textAlign: "center" as const,
            }}>
            See your best matches →
          </button>
        </div>
      </div>

      {/* ── 4. Suggested Matches ───────────────────────────────── */}
      {suggested.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ padding: "0 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SectionTitle>Suggested for You</SectionTitle>
            <button onClick={() => router.push("/app/discover")}
              style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              See All →
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingLeft: 16, paddingRight: 16, paddingBottom: 4, scrollbarWidth: "none" }}>
            {suggested.map((u) => (
              <button key={u.id} onClick={() => router.push("/app/discover")}
                style={{ flexShrink: 0, width: 140, background: "var(--bg-card)", borderRadius: 18, padding: 14, border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                {(() => { const src = u.avatar_url || getDefaultAvatar(u.id, u.gender, u.age); return (
                  <img src={src} alt="" style={{ width: 56, height: 56, borderRadius: 28, objectFit: "cover", border: "2px solid var(--accent)" }} />
                ); })()}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 13 }}>{u.full_name?.trim().split(" ")[0] ?? u.username}</div>
                  {u.city && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{u.city}</div>}
                  {u.sports && u.sports.length > 0 && (
                    <span style={{ fontSize: 10, color: "var(--accent)", marginTop: 4, fontWeight: 700, background: "var(--bg-card-alt)", borderRadius: 999, padding: "2px 8px", display: "inline-block" }}>{u.sports[0]}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 4b. Keep Momentum Card ─────────────────────────────── */}
      <div style={{ padding: "0 16px", marginBottom: 20 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, boxShadow: "var(--shadow-card)" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>Log today's workout</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>Track it once. Keep the streak alive.</div>
          </div>
          <button onClick={() => setShowLogForm(true)}
            style={{ flexShrink: 0, background: "#1f1a17", color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
            Log
          </button>
        </div>
      </div>

      {/* ── 5. Profile Completion ──────────────────────────────── */}
      {profileScore < 100 && !bannerDismissed && (
        <div style={{ padding: "0 16px", marginBottom: 20 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid #22c55e22", borderRadius: 16, padding: 16, boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#22c55e", marginBottom: 2 }}>
                  Complete your profile to get better matches
                </div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Profile {profileScore}% complete</div>
              </div>
              <button
                onClick={() => { sessionStorage.setItem("profile_banner_dismissed", "1"); setBannerDismissed(true); }}
                style={{ background: "none", border: "none", color: "var(--text-ultra-faint)", fontSize: 16, cursor: "pointer", padding: 0, marginLeft: 8, flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ background: "var(--bg-card-alt)", borderRadius: 99, height: 6, marginBottom: 10 }}>
              <div style={{ background: "#22c55e", width: `${profileScore}%`, height: 6, borderRadius: 99, transition: "width 0.5s" }} />
            </div>
            {missingFields.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {missingFields.slice(0, 2).map((f) => (
                  <span key={f} style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-card-alt)", borderRadius: 999, padding: "3px 10px", border: "1px solid var(--border-medium)" }}>{f}</span>
                ))}
              </div>
            )}
            <button
              onClick={() => window.location.href = "/app/profile"}
              style={{ width: "100%", padding: "10px 0", borderRadius: 12, border: "none", background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              Complete Profile →
            </button>
          </div>
        </div>
      )}

      {/* ── 6. Recent Activity ─────────────────────────────────── */}
      {todayWorkouts.length > 0 && (
        <div style={{ padding: "0 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <SectionTitle>Recent Activity</SectionTitle>
            <button onClick={() => router.push("/app/activity")}
              style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              See All →
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayWorkouts.slice(0, 2).map((w) => (
              <div key={w.id} style={{ background: "var(--bg-card)", borderRadius: 14, padding: "14px 16px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>💪</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{w.workout_type}</div>
                  {w.notes && <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{w.notes}</div>}
                </div>
                {w.duration_minutes && (
                  <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 800, background: "var(--bg-card-alt)", borderRadius: 8, padding: "3px 10px", border: "1px solid var(--border-medium)" }}>{w.duration_minutes}m</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log Workout Modal */}
      {showLogForm && (
        <div onClick={() => setShowLogForm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>Log Workout</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>WORKOUT TYPE</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {WORKOUT_TYPES.map((t) => (
                    <button key={t} onClick={() => setLogType(t)}
                      style={{ padding: "7px 12px", borderRadius: 999, border: `1px solid ${logType === t ? "var(--accent)" : "var(--bg-input)"}`, background: logType === t ? "var(--accent)" : "transparent", color: logType === t ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
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
                  style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={logWorkout} disabled={logging}
                  style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 16, cursor: "pointer", opacity: logging ? 0.6 : 1 }}>
                  {logging ? "Logging..." : "Log Workout 💪"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 800, letterSpacing: 1, marginBottom: 0, textTransform: "uppercase" }}>{String(children)}</div>;
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-faint)", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "11px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" };

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
