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

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const today = localToday();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [{ data: userData }, { data: workoutsData }, { data: eventsData }, { data: goalsData }, { data: likedData }, { data: passedData }, { data: blockedData }] = await Promise.all([
      supabase.from("users").select("username, full_name, current_streak, weight, sports, fitness_level, city, preferred_times, bio, avatar_url, gym_name").eq("id", user.id).single(),
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

    // Profile completeness
    const checks: { label: string; filled: boolean }[] = [
      { label: "📍 City",           filled: !!userData?.city },
      { label: "🏋️ Sports",        filled: (userData?.sports ?? []).length > 0 },
      { label: "🕐 Training times", filled: (userData?.preferred_times ?? []).length > 0 },
      { label: "⭐ Fitness level",  filled: !!userData?.fitness_level },
      { label: "🖼️ Profile photo",  filled: !!userData?.avatar_url },
      { label: "📝 Bio",            filled: !!userData?.bio },
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

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "var(--text-faint)", fontWeight: 600 }}>{getGreeting()},</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.5 }}>{firstName} 👋</div>
      </div>

      {/* Profile Completeness Banner */}
      {profileScore < 100 && !bannerDismissed && (
        <div style={{ background: "#0d1f0d", border: "1px solid #22c55e33", borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--success)" }}>
                {profileScore >= 80 ? "🌟 Almost there!" : profileScore >= 50 ? "⚡ Boost your matches" : "🚀 Set up your profile"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                Profile {profileScore}% complete — better matches await
              </div>
            </div>
            <button
              onClick={() => { sessionStorage.setItem("profile_banner_dismissed", "1"); setBannerDismissed(true); }}
              style={{ background: "none", border: "none", color: "var(--text-ultra-faint)", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
          </div>
          {/* Progress bar */}
          <div style={{ background: "var(--bg-card-alt)", borderRadius: 99, height: 6, marginBottom: 10 }}>
            <div style={{ background: "var(--success)", width: `${profileScore}%`, height: 6, borderRadius: 99, transition: "width 0.5s" }} />
          </div>
          {/* Missing fields */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {missingFields.slice(0, 4).map((f) => (
              <span key={f} style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-card-alt)", borderRadius: 999, padding: "3px 10px", border: "1px solid var(--border-medium)" }}>{f}</span>
            ))}
            {missingFields.length > 4 && (
              <span style={{ fontSize: 11, color: "var(--text-faint)", padding: "3px 4px" }}>+{missingFields.length - 4} more</span>
            )}
          </div>
          <button
            onClick={() => window.location.href = "/app/profile"}
            style={{ width: "100%", padding: "10px 0", borderRadius: 12, border: "none", background: "var(--success)", color: "var(--text-primary)", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
            Complete Profile → Better Matches
          </button>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <StatCard emoji="🔥" value={currentStreak} label="Day Streak" color="var(--accent)" />
        <StatCard emoji="💪" value={weekCount} label="This Week" color="#a855f7" />
        <StatCard emoji="⚖️" value={currentWeight ? `${currentWeight}` : "—"} label="lbs" color="var(--success)" />
      </div>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setShowLogForm(true)}
          style={{ padding: "14px 0", borderRadius: 14, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          💪 Log Workout
        </button>
        <button onClick={() => setShowWeightForm(true)}
          style={{ padding: "14px 0", borderRadius: 14, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-secondary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          ⚖️ Track Weight
        </button>
        <button onClick={() => router.push("/app/activity")}
          style={{ padding: "14px 0", borderRadius: 14, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-secondary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          📊 Activity
        </button>
        <button onClick={() => router.push("/app/habits")}
          style={{ padding: "14px 0", borderRadius: 14, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-secondary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          🎯 Habits
        </button>
        <button onClick={() => router.push("/app/analytics")}
          style={{ padding: "14px 0", borderRadius: 14, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-secondary)", fontWeight: 700, fontSize: 14, cursor: "pointer", gridColumn: "span 2" }}>
          📈 Analytics & Reports
        </button>
      </div>

      {/* Today's workouts */}
      {todayWorkouts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionTitle>Today's Workouts</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayWorkouts.map((w) => (
              <div key={w.id} style={{ background: "var(--bg-card)", borderRadius: 12, padding: "12px 14px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{w.workout_type}</div>
                  {w.notes && <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{w.notes}</div>}
                </div>
                {w.duration_minutes && (
                  <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>{w.duration_minutes} min</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested for You */}
      {suggested.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <SectionTitle>Suggested for You</SectionTitle>
            <button onClick={() => router.push("/app/discover")}
              style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              See All →
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {suggested.map((u) => {
              const connected = connectedIds.has(u.id);
              return (
                <div key={u.id} style={{ flexShrink: 0, width: 140, background: "var(--bg-card)", borderRadius: 16, padding: 14, border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" style={{ width: 52, height: 52, borderRadius: 26, objectFit: "cover", border: "2px solid #FF450044" }} />
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: 26, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
                      {u.username[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>@{u.username}</div>
                    {u.city && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>📍 {u.city}</div>}
                  </div>
                  {u.sharedSports.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
                      {u.sharedSports.slice(0, 2).map((s) => (
                        <span key={s} style={{ fontSize: 10, color: "var(--success)", background: "#0d1f0d", borderRadius: 999, padding: "2px 6px", border: "1px solid #22c55e33" }}>{s}</span>
                      ))}
                    </div>
                  )}
                  <button onClick={() => quickConnect(u)} disabled={connected || connectingId === u.id}
                    style={{ width: "100%", padding: "7px 0", borderRadius: 10, border: "none", background: connected ? "#22c55e22" : "var(--accent)", color: connected ? "var(--success)" : "var(--text-primary)", fontWeight: 700, fontSize: 12, cursor: connected ? "default" : "pointer", opacity: connectingId === u.id ? 0.6 : 1 }}>
                    {connected ? "✓ Sent" : connectingId === u.id ? "..." : "Connect"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quote of the Day */}
      <div style={{ background: "var(--bg-warm)", borderRadius: 16, padding: 16, border: "1px solid var(--accent-faint)", marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, marginBottom: 12, letterSpacing: 0.5 }}>QUOTE OF THE DAY</div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
          <span style={{ fontSize: 28 }}>{dailyQuote.emoji}</span>
          <div>
            <p style={{ color: "var(--text-primary)", fontSize: 14, lineHeight: 1.6, margin: 0, fontStyle: "italic", fontWeight: 600 }}>"{dailyQuote.text}"</p>
            <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "6px 0 0", fontWeight: 600 }}>— {dailyQuote.author}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, borderTop: "1px solid var(--border-warm)", paddingTop: 10 }}>
          <button
            onClick={() => {
              const key = `quote_liked_${dailyQuote.text.slice(0, 20)}`;
              const next = !quoteLiked;
              setQuoteLiked(next);
              next ? localStorage.setItem(key, "1") : localStorage.removeItem(key);
            }}
            style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1px solid ${quoteLiked ? "var(--accent)" : "var(--border-medium)"}`, background: quoteLiked ? "var(--accent-faint)" : "transparent", color: quoteLiked ? "var(--accent)" : "var(--text-faint)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {quoteLiked ? "❤️ Saved" : "🤍 Save"}
          </button>
          <button
            onClick={() => {
              const shareText = `"${dailyQuote.text}" — ${dailyQuote.author}\n\nvia FlexMatches`;
              if (navigator.share) {
                navigator.share({ text: shareText });
              } else {
                navigator.clipboard.writeText(shareText);
              }
            }}
            style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-faint)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            📤 Share
          </button>
        </div>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <SectionTitle>Active Goals</SectionTitle>
            <button onClick={() => router.push("/app/goals")}
              style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              See All →
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeGoals.map((g) => {
              const pct = g.target_value ? Math.min((g.current_value / g.target_value) * 100, 100) : 0;
              return (
                <div key={g.id} style={{ background: "var(--bg-card)", borderRadius: 12, padding: "12px 14px", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{g.title}</span>
                    <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>{Math.round(pct)}%</span>
                  </div>
                  <div style={{ background: "var(--bg-card-alt)", borderRadius: 99, height: 5 }}>
                    <div style={{ background: "var(--accent)", width: `${pct}%`, height: 5, borderRadius: 99, transition: "width 0.3s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <SectionTitle>Upcoming Events</SectionTitle>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => router.push("/app/events?create=1")}
              style={{ background: "var(--accent)", border: "none", color: "var(--text-primary)", fontSize: 11, fontWeight: 700, cursor: "pointer", borderRadius: 8, padding: "4px 10px" }}>
              + Create
            </button>
            <button onClick={() => router.push("/app/events")}
              style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              See All →
            </button>
          </div>
        </div>
        {upcomingEvents.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcomingEvents.map((e) => (
              <div key={e.id} onClick={() => router.push("/app/events")}
                style={{ background: "var(--bg-card)", borderRadius: 12, padding: "12px 14px", border: "1px solid var(--border)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{e.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                    {e.sport} · {new Date(e.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, background: "#1a0800", borderRadius: 8, padding: "3px 8px", border: "1px solid var(--accent-faint)" }}>Join</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shortcuts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => router.push("/app/recommendations")}
          style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid #a855f733", background: "#180d2a", color: "#a855f7", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🤖 AI Recommendations</span>
          <span style={{ color: "#a855f766" }}>→</span>
        </button>
        <button onClick={() => router.push("/app/activity")}
          style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid var(--accent-faint)", background: "#1a0800", color: "var(--accent)", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>💪 Log a Workout</span>
          <span style={{ color: "#FF450088" }}>→</span>
        </button>
        <button onClick={() => router.push("/app/goals")}
          style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-secondary)", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🎯 Goals & Streak</span>
          <span style={{ color: "var(--text-faint)" }}>→</span>
        </button>
<button onClick={() => router.push("/app/challenges")}
          style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-secondary)", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🏆 Fitness Challenges</span>
          <span style={{ color: "var(--text-faint)" }}>→</span>
        </button>
        <button onClick={() => router.push("/app/referral")}
          style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-secondary)", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>📣 Invite Friends & Earn</span>
          <span style={{ color: "var(--text-faint)" }}>→</span>
        </button>
      </div>

      {/* Log Workout Modal */}
      {showLogForm && (
        <div onClick={() => setShowLogForm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, border: "1px solid var(--border)", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />
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
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, border: "1px solid var(--border)" }}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />
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
