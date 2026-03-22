"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { awardBadge } from "../../../lib/badges";

const WORKOUT_TYPES = [
  "Gym", "Running", "Cycling", "Swimming", "Boxing", "Yoga",
  "CrossFit", "Pilates", "HIIT", "Football", "Basketball", "Hiking", "Other",
];

type Quote = { text: string; author: string; emoji: string; tags: string[] };

const QUOTES: Quote[] = [
  // Strength / Gym
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown", emoji: "💪", tags: ["gym", "general"] },
  { text: "Strength does not come from the body. It comes from the will of the soul.", author: "Gandhi", emoji: "🏋️", tags: ["gym", "strength"] },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold", emoji: "🔥", tags: ["gym", "strength"] },
  { text: "Push yourself because no one else is going to do it for you.", author: "Unknown", emoji: "💥", tags: ["gym", "general"] },
  { text: "Wake up. Work out. Look hot. Kick ass.", author: "Unknown", emoji: "⚡", tags: ["gym", "general"] },
  { text: "Bodybuilding is much like any other sport. To be successful, you must dedicate yourself 100%.", author: "Arnold Schwarzenegger", emoji: "🏋️", tags: ["gym", "bodybuilding"] },
  { text: "Sweat is just fat crying.", author: "Unknown", emoji: "💦", tags: ["gym", "general"] },
  // Running
  { text: "Every mile is two in winter.", author: "George Herbert", emoji: "🏃", tags: ["running"] },
  { text: "Run when you can, walk if you have to, crawl if you must; just never give up.", author: "Dean Karnazes", emoji: "🏃", tags: ["running"] },
  { text: "Your legs are not giving out. Your head is giving up. Keep going.", author: "Unknown", emoji: "🏁", tags: ["running"] },
  { text: "The miracle isn't that I finished. The miracle is that I had the courage to start.", author: "John Bingham", emoji: "✨", tags: ["running"] },
  { text: "Running is the greatest metaphor for life, because you get out of it what you put into it.", author: "Oprah Winfrey", emoji: "🌅", tags: ["running"] },
  // Cycling
  { text: "Life is like riding a bicycle. To keep your balance you must keep moving.", author: "Einstein", emoji: "🚴", tags: ["cycling"] },
  { text: "When in doubt, pedal it out.", author: "Unknown", emoji: "🚵", tags: ["cycling"] },
  { text: "A bicycle ride around the world begins with a single pedal stroke.", author: "Scott Stoll", emoji: "🌍", tags: ["cycling"] },
  // Swimming
  { text: "The water is your friend. You don't have to fight with water, just share the same spirit as the water.", author: "Aleksandr Popov", emoji: "🏊", tags: ["swimming"] },
  { text: "Go fast. Turn left. Don't touch the lane rope.", author: "Unknown", emoji: "💨", tags: ["swimming"] },
  // Boxing / Martial Arts
  { text: "Float like a butterfly, sting like a bee.", author: "Muhammad Ali", emoji: "🥊", tags: ["boxing", "martial arts"] },
  { text: "It's not about how hard you hit. It's about how hard you can get hit and keep moving forward.", author: "Rocky Balboa", emoji: "🥊", tags: ["boxing"] },
  { text: "Champions aren't made in gyms. Champions are made from something deep inside them.", author: "Muhammad Ali", emoji: "🏆", tags: ["boxing", "general"] },
  // Yoga / Mindfulness
  { text: "Yoga is not about touching your toes. It's about what you learn on the way down.", author: "Jigar Gor", emoji: "🧘", tags: ["yoga"] },
  { text: "The body benefits from movement, and the mind benefits from stillness.", author: "Sakyong Mipham", emoji: "🌿", tags: ["yoga", "mindfulness"] },
  { text: "Peace comes from within. Do not seek it without.", author: "Buddha", emoji: "☮️", tags: ["yoga", "mindfulness"] },
  // CrossFit / HIIT
  { text: "Embrace the suck. Suffer a little. Grow a lot.", author: "Unknown", emoji: "🔥", tags: ["crossfit", "hiit"] },
  { text: "The clock is always running. Make the most of it.", author: "Unknown", emoji: "⏱️", tags: ["crossfit", "hiit"] },
  { text: "Comfort is the enemy of achievement.", author: "Farrah Gray", emoji: "💢", tags: ["crossfit", "general"] },
  // Football / Team Sports
  { text: "Individual commitment to a group effort — that is what makes a team work.", author: "Vince Lombardi", emoji: "⚽", tags: ["football", "basketball", "team"] },
  { text: "Talent wins games, but teamwork and intelligence win championships.", author: "Michael Jordan", emoji: "🏀", tags: ["basketball", "football", "team"] },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke", emoji: "🏆", tags: ["basketball", "football", "general"] },
  // Hiking / Outdoor
  { text: "The summit is what drives us, but the climb itself is what matters.", author: "Conrad Anker", emoji: "🏔️", tags: ["hiking", "outdoor"] },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien", emoji: "🌲", tags: ["hiking", "outdoor"] },
  { text: "In every walk with nature, one receives far more than he seeks.", author: "John Muir", emoji: "🌄", tags: ["hiking", "outdoor"] },
  // General motivation
  { text: "Success is not given. It is earned. On the track, on the field, in the gym.", author: "Unknown", emoji: "🎯", tags: ["general"] },
  { text: "Your body can do almost anything. It's your mind you have to convince.", author: "Unknown", emoji: "🧠", tags: ["general"] },
  { text: "One hour of training a day is 4% of your day. No excuses.", author: "Unknown", emoji: "⏰", tags: ["general"] },
  { text: "Don't limit your challenges. Challenge your limits.", author: "Unknown", emoji: "🚀", tags: ["general"] },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar", emoji: "⭐", tags: ["general"] },
  { text: "Great things never come from comfort zones.", author: "Unknown", emoji: "🌊", tags: ["general"] },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb", emoji: "🥋", tags: ["general", "resilience"] },
  { text: "Your health is an investment, not an expense.", author: "Unknown", emoji: "💚", tags: ["general", "health"] },
  { text: "Be stronger than your excuses.", author: "Unknown", emoji: "💪", tags: ["general"] },
  { text: "Train insane or remain the same.", author: "Unknown", emoji: "🔥", tags: ["gym", "general"] },
];

function getDailyQuote(sports: string[]): Quote {
  const today = new Date();
  const dayIndex = today.getFullYear() * 1000 + today.getMonth() * 31 + today.getDate();
  // Try sport-specific first
  const sportLower = (sports[0] ?? "").toLowerCase();
  const relevant = QUOTES.filter((q) =>
    q.tags.some((t) => sportLower.includes(t) || t.includes(sportLower))
  );
  const pool = relevant.length >= 3 ? relevant : QUOTES;
  return pool[dayIndex % pool.length];
}

type Workout = {
  id: string;
  workout_type: string;
  duration_minutes: number | null;
  notes: string | null;
  logged_at: string;
};

type Event = {
  id: string;
  title: string;
  sport: string;
  event_date: string;
  location: string | null;
};

type Goal = {
  id: string;
  title: string;
  goal_type: string;
  current_value: number;
  target_value: number | null;
  unit: string | null;
};

type SuggestedUser = {
  id: string;
  username: string;
  avatar_url: string | null;
  city: string | null;
  sports: string[] | null;
  fitness_level: string | null;
  sharedSports: string[];
  score: number;
};

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

  // Workout log
  const [showLogForm, setShowLogForm] = useState(false);
  const [logType, setLogType] = useState("Gym");
  const [logDuration, setLogDuration] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logging, setLogging] = useState(false);
  const [todayWorkouts, setTodayWorkouts] = useState<Workout[]>([]);
  const [weekCount, setWeekCount] = useState(0);

  // Weight tracking
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [savingWeight, setSavingWeight] = useState(false);

  // Data
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [dailyQuote, setDailyQuote] = useState<Quote>(QUOTES[0]);
  const [quoteLiked, setQuoteLiked] = useState(false);
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
  type PendingRequest = { id: string; sender_id: string; full_name: string; avatar_url: string | null; sports: string[] };
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [processingReq, setProcessingReq] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const today = localToday();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [{ data: userData }, { data: workoutsData }, { data: eventsData }, { data: goalsData }, { data: likedData }, { data: passedData }, { data: blockedData }] = await Promise.all([
      supabase.from("users").select("username, full_name, current_streak, weight, sports, fitness_level, city, preferred_times, bio, avatar_url, gym_name, is_at_gym, age, occupation, career_goals, availability").eq("id", user.id).single(),
      supabase.from("workouts").select("*").eq("user_id", user.id).gte("logged_at", weekAgo).order("logged_at", { ascending: false }),
      supabase.from("events").select("id, title, sport, event_date, location").gte("event_date", today).order("event_date").limit(3),
      supabase.from("goals").select("id, title, goal_type, current_value, target_value, unit").eq("user_id", user.id).eq("status", "active").limit(3),
      supabase.from("matches").select("receiver_id").eq("sender_id", user.id),
      supabase.from("passes").select("passed_id").eq("user_id", user.id),
      supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
    ]);

    setUsername(userData?.username ?? "");
    const first = userData?.full_name?.trim().split(" ")[0] ?? userData?.username ?? "";
    setFirstName(first);
    setCurrentStreak(userData?.current_streak ?? 0);
    setCurrentWeight(userData?.weight ?? null);
    setIsAtGym(userData?.is_at_gym ?? false);

    // Pending incoming match requests
    const { data: pendingData } = await supabase
      .from("matches")
      .select("id, sender_id, users!matches_sender_id_fkey(full_name, avatar_url, sports)")
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
      }))
    );

    // Profile completeness — same 10 fields as profile page
    const checks: { label: string; filled: boolean }[] = [
      { label: "🖼️ Profile photo",  filled: !!userData?.avatar_url },
      { label: "📛 Full name",       filled: !!userData?.full_name },
      { label: "📝 Bio",            filled: !!userData?.bio },
      { label: "📍 City",           filled: !!userData?.city },
      { label: "⭐ Fitness level",  filled: !!userData?.fitness_level },
      { label: "🎂 Age",            filled: !!userData?.age },
      { label: "🏋️ Sports",        filled: (userData?.sports ?? []).length > 0 },
      { label: "🕐 Availability",   filled: !!userData?.availability && Object.values(userData.availability as Record<string, boolean>).some(Boolean) },
      { label: "💼 Occupation",     filled: !!userData?.occupation },
      { label: "🎯 Career goals",   filled: !!userData?.career_goals },
    ];
    const missing = checks.filter((c) => !c.filled).map((c) => c.label);
    const pct = Math.round(((checks.length - missing.length) / checks.length) * 100);
    setProfileScore(pct);
    setMissingFields(missing);
    setBannerDismissed(sessionStorage.getItem("profile_banner_dismissed") === "1");
    const quote = getDailyQuote(userData?.sports ?? []);
    setDailyQuote(quote);
    const likeKey = `quote_liked_${quote.text.slice(0, 20)}`;
    setQuoteLiked(localStorage.getItem(likeKey) === "1");

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
      .select("id, username, avatar_url, city, sports, fitness_level, privacy_settings")
      .neq("id", user.id)
      .limit(60);

    const scored: SuggestedUser[] = (candidates ?? [])
      .filter((u: any) => !excludeIds.has(u.id) && !(u.privacy_settings as any)?.hide_profile)
      .map((u: any) => {
        const shared = mySports.filter((s) => (u.sports ?? []).includes(s));
        let score = shared.length * 30;
        if (myLevel && u.fitness_level === myLevel) score += 20;
        if (myCity && u.city && u.city.toLowerCase() === myCity.toLowerCase()) score += 25;
        return { ...u, sharedSports: shared, score };
      })
      .filter((u: SuggestedUser) => u.score > 0)
      .sort((a: SuggestedUser, b: SuggestedUser) => b.score - a.score)
      .slice(0, 3);

    setSuggested(scored);

    const allWorkouts = workoutsData ?? [];
    setTodayWorkouts(allWorkouts.filter((w: Workout) => w.logged_at.startsWith(today)));
    setWeekCount(allWorkouts.length);
    setUpcomingEvents(eventsData ?? []);
    setActiveGoals(goalsData ?? []);
    setLoading(false);
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
    await awardBadge(userId, "goal_setter");
    setShowLogForm(false);
    setLogDuration("");
    setLogNotes("");
    setLogging(false);
    loadData();
  }

  async function saveWeight() {
    if (!userId || !weightInput) return;
    setSavingWeight(true);
    await supabase.from("users").update({ weight: parseFloat(weightInput) }).eq("id", userId);
    setCurrentWeight(parseFloat(weightInput));
    setWeightInput("");
    setShowWeightForm(false);
    setSavingWeight(false);
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

  const todayCheckedIn = todayWorkouts.length > 0;

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "0 0 80px", maxWidth: 480, margin: "0 auto" }}>

      {/* ── 1. Greeting Header ─────────────────────────────────── */}
      <div style={{ padding: "24px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, letterSpacing: 0.3 }}>{getGreeting()}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.5, lineHeight: 1.2 }}>{firstName} 👋</div>
        </div>
        <button
          onClick={toggleGymStatus}
          disabled={gymTogglingOn}
          style={{
            padding: "8px 14px", borderRadius: 99,
            border: `1px solid ${isAtGym ? "#22c55e66" : "var(--border-medium)"}`,
            background: isAtGym ? "#0d1f0d" : "var(--bg-card)",
            color: isAtGym ? "#22c55e" : "var(--text-faint)",
            fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
          }}>
          {gymTogglingOn ? "..." : isAtGym ? "🏋️ At Gym" : "🏋️ Check In"}
        </button>
      </div>

      {/* ── 2. Streak + Check-in Banner ────────────────────────── */}
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {/* Streak card */}
        <div style={{ background: "var(--bg-card)", borderRadius: 18, padding: "18px 16px", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -10, right: -10, fontSize: 60, opacity: 0.06 }}>🔥</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: 0.5, marginBottom: 6 }}>STREAK</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>{currentStreak}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>days in a row 🔥</div>
        </div>
        {/* Check-in card */}
        <button
          onClick={() => setShowLogForm(true)}
          style={{
            background: "var(--bg-card)",
            borderRadius: 18, padding: "18px 16px",
            border: "1px solid var(--border)",
            position: "relative", overflow: "hidden", cursor: "pointer", textAlign: "left",
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
                background: "var(--bg-card)", border: "1px solid #FF450033",
                borderRadius: 14, padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 22, flexShrink: 0,
                  background: "var(--accent)", overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 800, color: "#fff",
                }}>
                  {req.avatar_url
                    ? <img src={req.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (req.full_name?.[0] ?? "?").toUpperCase()
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{req.full_name}</div>
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
                    style={{ padding: "7px 12px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    {processingReq === req.id ? "..." : "✓ Accept"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. Find Your Partner CTA ──────────────────────────── */}
      <div style={{ padding: "0 16px", marginBottom: 20 }}>
        <button
          onClick={() => router.push("/app/discover")}
          style={{ width: "100%", padding: "18px 20px", borderRadius: 18, border: "none", background: "linear-gradient(135deg, var(--accent), #ff6b35)", cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -15, right: -15, fontSize: 80, opacity: 0.12 }}>🔍</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 4 }}>Find Your Partner</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
            {suggested.length > 0 ? `${suggested.length} people near you match your schedule` : "Discover fitness partners near you"}
          </div>
        </button>
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
                style={{ flexShrink: 0, width: 130, background: "var(--bg-card)", borderRadius: 18, padding: 14, border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}>
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" style={{ width: 52, height: 52, borderRadius: 26, objectFit: "cover", border: "2px solid #FF450044" }} />
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: 26, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>
                    {u.username[0].toUpperCase()}
                  </div>
                )}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 12 }}>@{u.username}</div>
                  {u.city && <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 2 }}>📍 {u.city}</div>}
                  {u.sports && u.sports.length > 0 && (
                    <div style={{ fontSize: 10, color: "var(--accent)", marginTop: 3, fontWeight: 600 }}>{u.sports[0]}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. Profile Completion ──────────────────────────────── */}
      {profileScore < 100 && !bannerDismissed && (
        <div style={{ padding: "0 16px", marginBottom: 20 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid #22c55e22", borderRadius: 16, padding: 16 }}>
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
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#1a0800", border: "1px solid #FF450033", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>💪</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{w.workout_type}</div>
                  {w.notes && <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{w.notes}</div>}
                </div>
                {w.duration_minutes && (
                  <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 800, background: "#1a0800", borderRadius: 8, padding: "3px 10px", border: "1px solid #FF450033" }}>{w.duration_minutes}m</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── More row ───────────────────────────────────────────── */}
      <div style={{ padding: "0 16px", marginBottom: 20 }}>
        <div style={{ marginBottom: 10 }}>
          <SectionTitle>More</SectionTitle>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "📰 Activity Feed", path: "/app/feed" },
            { label: "🏅 Leaderboard", path: "/app/leaderboard" },
            { label: "🎯 Goals", path: "/app/goals" },
            { label: "📊 Analytics", path: "/app/analytics" },
            { label: "🏆 Challenges", path: "/app/challenges" },
            { label: "📣 Invite Friends & Earn", path: "/app/referral" },
            { label: "⚙️ Settings", path: "/app/settings" },
          ].map((item) => (
            <button key={item.path} onClick={() => router.push(item.path)}
              style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-primary)", fontWeight: 600, fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{item.label}</span>
              <span style={{ color: "var(--text-faint)" }}>→</span>
            </button>
          ))}
        </div>
      </div>

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

      {/* Track Weight Modal */}
      {showWeightForm && (
        <div onClick={() => setShowWeightForm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Track Weight</h2>
            {currentWeight && (
              <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 16 }}>Current: {currentWeight} lbs</p>
            )}
            <input value={weightInput} onChange={(e) => setWeightInput(e.target.value)}
              type="number" placeholder="Enter weight in lbs"
              style={{ ...inputStyle, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10, paddingBottom: 16 }}>
              <button onClick={() => setShowWeightForm(false)}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={saveWeight} disabled={savingWeight || !weightInput}
                style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 16, cursor: "pointer", opacity: (savingWeight || !weightInput) ? 0.5 : 1 }}>
                {savingWeight ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ emoji, value, label, color }: { emoji: string; value: string | number; label: string; color: string }) {
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "14px 10px", border: "1px solid var(--border)", textAlign: "center" }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 0 }}>{String(children).toUpperCase()}</div>;
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
