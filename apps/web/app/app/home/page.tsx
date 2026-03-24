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
  exercise_type: string;
  duration_min: number | null;
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
      supabase.from("users").select("username, full_name, current_streak, sports, fitness_level, city, bio, avatar_url, gym_name, is_at_gym, gym_checkin_at, age, availability").eq("id", user.id).single(),
      supabase.from("workouts").select("*").eq("user_id", user.id).gte("logged_at", weekAgo).order("logged_at", { ascending: false }),
      supabase.from("matches").select("receiver_id").eq("sender_id", user.id),
      supabase.from("passes").select("passed_id").eq("user_id", user.id),
      supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
    ]);

    setUsername(userData?.username ?? "");
    const first = userData?.full_name?.trim().split(" ")[0] ?? userData?.username ?? "";
    setFirstName(first);
    setCurrentStreak(userData?.current_streak ?? 0);
    // Auto-expire at-gym status after 4 hours
    let atGym = userData?.is_at_gym ?? false;
    if (atGym && userData?.gym_checkin_at) {
      const checkinAge = Date.now() - new Date(userData.gym_checkin_at).getTime();
      if (checkinAge > 4 * 60 * 60 * 1000) {
        atGym = false;
        supabase.from("users").update({ is_at_gym: false, gym_checkin_at: null }).eq("id", user.id).then(() => {});
      }
    }
    setIsAtGym(atGym);

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
      exercise_type: logType,
      duration_min: parseInt(logDuration) || null,
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
    await supabase.from("matches").update({ status: "accepted" }).eq("id", matchId);
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

  // ── Derive primary action ──────────────────────────────────
  type PrimaryMode = "requests" | "workout" | "streak" | "discover";
  let primaryMode: PrimaryMode = "discover";
  if (pendingRequests.length > 0) primaryMode = "requests";
  else if (!todayCheckedIn && currentStreak > 0) primaryMode = "streak";
  else if (!todayCheckedIn) primaryMode = "workout";

  return (
    <div style={{ padding: "0 0 88px", maxWidth: 480, margin: "0 auto" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ padding: "20px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{getGreeting()}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.5, lineHeight: 1.2, fontFamily: "var(--font-display)" }}>{firstName} 👋</div>
        </div>
        <button onClick={toggleGymStatus} disabled={gymTogglingOn}
          style={{ padding: "7px 14px", borderRadius: 99, border: `1px solid ${isAtGym ? "#22c55e55" : "var(--border-medium)"}`, background: isAtGym ? "#0d1a0d" : "var(--bg-card)", color: isAtGym ? "#22c55e" : "var(--text-faint)", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
          {gymTogglingOn ? "…" : isAtGym ? "🏋️ At Gym" : "🏋️ Check In"}
        </button>
      </div>

      {/* ── Dynamic Primary Action Card ────────────────────────── */}
      <div style={{ padding: "0 16px", marginBottom: 16, animation: "fadeUp 0.3s ease" }}>

        {primaryMode === "requests" && (() => {
          const req = pendingRequests[0];
          return (
            <div style={{ borderRadius: 22, background: "linear-gradient(135deg, var(--accent) 0%, #ff6b35 100%)", padding: "20px 18px", boxShadow: "0 12px 32px rgba(255,69,0,0.28)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -16, right: -16, fontSize: 90, opacity: 0.07, lineHeight: 1 }}>🤝</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                {pendingRequests.length === 1 ? "New connection request" : `${pendingRequests.length} connection requests`}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <img src={req.avatar_url || getDefaultAvatar(req.sender_id, req.gender, req.age)} alt=""
                  style={{ width: 48, height: 48, borderRadius: 24, objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, color: "#fff", fontSize: 17, lineHeight: 1.2 }}>{req.full_name?.split(" ")[0] ?? "Someone"} wants to train with you</div>
                  {req.sports.length > 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>{req.sports.slice(0, 2).join(" · ")}</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => declineRequest(req.id)} disabled={processingReq === req.id}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  Pass
                </button>
                <button onClick={() => acceptRequest(req.id)} disabled={processingReq === req.id}
                  style={{ flex: 2, padding: "11px 0", borderRadius: 12, border: "none", background: "#fff", color: "#1f1a17", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                  {processingReq === req.id ? "…" : "✓ Accept"}
                </button>
              </div>
              {pendingRequests.length > 1 && (
                <button onClick={() => router.push("/app/matches")}
                  style={{ marginTop: 10, width: "100%", background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "4px 0" }}>
                  +{pendingRequests.length - 1} more waiting →
                </button>
              )}
            </div>
          );
        })()}

        {primaryMode === "streak" && (
          <div style={{ borderRadius: 22, background: "linear-gradient(135deg, #1a0e00 0%, #2d1500 100%)", padding: "20px 18px", border: "1px solid #FF450033", boxShadow: "0 8px 24px rgba(255,69,0,0.15)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -16, right: -16, fontSize: 90, opacity: 0.1, lineHeight: 1 }}>🔥</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Don't break it</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text-primary)", marginBottom: 6, lineHeight: 1.2 }}>
              🔥 {currentStreak}-day streak on the line
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>Log {getWorkoutTime()} workout to keep it alive.</div>
            <button onClick={() => setShowLogForm(true)}
              style={{ width: "100%", padding: "13px 0", borderRadius: 14, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Log Workout 💪
            </button>
          </div>
        )}

        {primaryMode === "workout" && (
          <div style={{ borderRadius: 22, background: "linear-gradient(135deg, var(--accent) 0%, #ff6b35 100%)", padding: "20px 18px", boxShadow: "0 12px 32px rgba(255,69,0,0.28)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -16, right: -16, fontSize: 90, opacity: 0.07, lineHeight: 1 }}>💪</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              {suggested.length > 0 ? `${suggested.length} partner${suggested.length > 1 ? "s" : ""} available now` : "Start tracking"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 6, lineHeight: 1.2 }}>
              {suggested.length > 0 ? `Find a partner for ${getWorkoutTime()} workout` : "Log your first workout"}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 14 }}>Build your streak. Track your progress.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowLogForm(true)}
                style={{ flex: 1, padding: "12px 0", borderRadius: 13, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Log Workout
              </button>
              <button onClick={() => router.push("/app/discover")}
                style={{ flex: 1, padding: "12px 0", borderRadius: 13, border: "none", background: "#fff", color: "#1f1a17", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                Find Partner →
              </button>
            </div>
          </div>
        )}

        {primaryMode === "discover" && (
          <div style={{ borderRadius: 22, background: "linear-gradient(135deg, var(--accent) 0%, #ff6b35 100%)", padding: "20px 18px", boxShadow: "0 12px 32px rgba(255,69,0,0.28)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -16, right: -16, fontSize: 90, opacity: 0.07, lineHeight: 1 }}>🎯</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              {suggested.length > 0 ? `${suggested.length} strong match${suggested.length > 1 ? "es" : ""}` : "All caught up"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 6, lineHeight: 1.2 }}>
              {suggested.length > 0 ? "You have new people to meet" : "Keep discovering partners"}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 14 }}>
              {suggested.length > 0 ? "Based on your sports, level & schedule." : "Check Discover for fresh matches."}
            </div>
            <button onClick={() => router.push("/app/discover")}
              style={{ width: "100%", padding: "13px 0", borderRadius: 14, border: "none", background: "#fff", color: "#1f1a17", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              See your matches →
            </button>
          </div>
        )}
      </div>

      {/* ── Compact Pending Strip (if requests + primary is not requests) ── */}
      {primaryMode !== "requests" && pendingRequests.length > 0 && (
        <div style={{ padding: "0 16px", marginBottom: 14 }}>
          <button onClick={() => router.push("/app/matches")}
            style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--accent)33", borderRadius: 14, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--accent)", flexShrink: 0 }} />
            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13, flex: 1 }}>{pendingRequests.length} pending match request{pendingRequests.length > 1 ? "s" : ""}</div>
            <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>Review →</div>
          </button>
        </div>
      )}

      {/* ── Streak Row ─────────────────────────────────────────── */}
      <div style={{ padding: "0 16px", marginBottom: 16 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 0, boxShadow: "var(--shadow-card)" }}>
          <div style={{ flex: 1, borderRight: "1px solid var(--border)", paddingRight: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>Streak</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>{currentStreak}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>days 🔥</span>
            </div>
          </div>
          <div style={{ flex: 1, paddingLeft: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>Today</div>
            {todayCheckedIn ? (
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--success)" }}>✓ Done</div>
            ) : (
              <button onClick={() => setShowLogForm(true)}
                style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                + Log workout
              </button>
            )}
            {todayWorkouts.length > 0 && (
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1 }}>{todayWorkouts[0].exercise_type}{todayWorkouts[0].duration_min ? ` · ${todayWorkouts[0].duration_min}m` : ""}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Best Matches ───────────────────────────────────────── */}
      {suggested.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ padding: "0 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <SectionTitle>Best Matches</SectionTitle>
            <button onClick={() => router.push("/app/discover")}
              style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              See All →
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingLeft: 16, paddingRight: 16, paddingBottom: 4, scrollbarWidth: "none" }}>
            {suggested.map((u) => {
              const src = u.avatar_url || getDefaultAvatar(u.id, u.gender, u.age);
              const alreadyConnected = connectedIds.has(u.id);
              return (
                <div key={u.id} style={{ flexShrink: 0, width: 148, background: "var(--bg-card)", borderRadius: 18, padding: "14px 12px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: "var(--shadow-card)" }}>
                  <img src={src} alt="" style={{ width: 52, height: 52, borderRadius: 26, objectFit: "cover", border: "2px solid var(--accent)" }} />
                  <div style={{ textAlign: "center", width: "100%" }}>
                    <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 13 }}>{u.full_name?.trim().split(" ")[0] ?? u.username}</div>
                    {u.city && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{u.city}</div>}
                    {u.sharedSports.length > 0 && (
                      <div style={{ fontSize: 10, color: "var(--accent)", marginTop: 5, fontWeight: 700, background: "var(--bg-card-alt)", borderRadius: 999, padding: "2px 8px", display: "inline-block" }}>
                        {u.sharedSports[0]} match
                      </div>
                    )}
                  </div>
                  <button onClick={() => quickConnect(u)} disabled={!!connectingId || alreadyConnected}
                    style={{ width: "100%", padding: "7px 0", borderRadius: 10, border: alreadyConnected ? "1px solid var(--border)" : "none", background: alreadyConnected ? "transparent" : "var(--accent)", color: alreadyConnected ? "var(--text-faint)" : "#fff", fontWeight: 700, fontSize: 12, cursor: alreadyConnected ? "default" : "pointer" }}>
                    {connectingId === u.id ? "…" : alreadyConnected ? "✓ Sent" : "Connect"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick Actions ──────────────────────────────────────── */}
      <div style={{ padding: "0 16px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { icon: "💬", label: "Messages", sub: "Chat with partners", href: "/app/matches" },
            { icon: "🌀", label: "Circles", sub: "Groups & communities", href: "/app/communities" },
            { icon: "🏆", label: "Leaderboard", sub: "Weekly rankings", href: "/app/leaderboard" },
            { icon: "📅", label: "Events", sub: "Upcoming sessions", href: "/app/events" },
          ].map((a) => (
            <button key={a.href} onClick={() => router.push(a.href)}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left", boxShadow: "var(--shadow-card)" }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>{a.label}</div>
                <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 1 }}>{a.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Activity ───────────────────────────────────────────── */}
      <div style={{ padding: "0 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <SectionTitle>Activity</SectionTitle>
          <button onClick={() => router.push("/app/activity")}
            style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            See All →
          </button>
        </div>
        {todayWorkouts.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {todayWorkouts.slice(0, 2).map((w) => (
              <div key={w.id} style={{ background: "var(--bg-card)", borderRadius: 12, padding: "12px 14px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--bg-card-alt)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>💪</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>{w.exercise_type}</div>
                  {w.notes && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1 }}>{w.notes}</div>}
                </div>
                {w.duration_min && <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 800 }}>{w.duration_min}m</span>}
              </div>
            ))}
          </div>
        ) : (
          <button onClick={() => router.push("/app/activity")}
            style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--bg-card-alt)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📊</div>
            <div>
              <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>Stats & history</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Workouts · Leaderboard · Progress</div>
            </div>
          </button>
        )}
      </div>

      {/* ── Profile Completion ─────────────────────────────────── */}
      {profileScore < 100 && !bannerDismissed && (
        <div style={{ padding: "0 16px", marginBottom: 16 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid #22c55e1a", borderRadius: 14, padding: "13px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#22c55e" }}>Profile {profileScore}% complete</div>
              <button onClick={() => { sessionStorage.setItem("profile_banner_dismissed", "1"); setBannerDismissed(true); }}
                style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 14, cursor: "pointer", padding: 0 }}>✕</button>
            </div>
            <div style={{ background: "var(--bg-card-alt)", borderRadius: 99, height: 4, marginBottom: 10 }}>
              <div style={{ background: "#22c55e", width: `${profileScore}%`, height: 4, borderRadius: 99, transition: "width 0.5s" }} />
            </div>
            <button onClick={() => window.location.href = "/app/profile"}
              style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              Complete for better matches →
            </button>
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
