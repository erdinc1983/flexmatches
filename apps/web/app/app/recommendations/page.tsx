"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { calcTier } from "../../../lib/badges";

/* ─── Types ─────────────────────────────────────────────────────── */
type MyProfile = {
  id: string;
  sports: string[] | null;
  fitness_level: string | null;
  preferred_times: string[] | null;
  industry: string | null;
  city: string | null;
  availability: Record<string, boolean> | null;
};

type Candidate = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  fitness_level: string | null;
  sports: string[] | null;
  preferred_times: string[] | null;
  industry: string | null;
  availability: Record<string, boolean> | null;
  is_pro: boolean | null;
  score: number;
  reasons: string[];
  tierEmoji: string;
};

type RecommendedContent = {
  id: string;
  type: "event" | "community" | "challenge";
  title: string;
  subtitle: string;
  emoji: string;
  href: string;
};

type ScheduleSuggestion = {
  day: string;
  time: string;
  reason: string;
  confidence: "high" | "medium" | "low";
};

/* ─── Scoring ────────────────────────────────────────────────────── */
const LEVEL_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
const DAYS_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function scoreCandidate(me: MyProfile, other: Omit<Candidate, "score" | "reasons" | "tierEmoji">): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Sports overlap (up to 40 pts)
  const mySports = me.sports ?? [];
  const otherSports = other.sports ?? [];
  if (mySports.length > 0 && otherSports.length > 0) {
    const common = mySports.filter(s => otherSports.includes(s));
    if (common.length > 0) {
      const pts = Math.round((common.length / Math.max(mySports.length, otherSports.length)) * 40);
      score += pts;
      if (common.length === 1) reasons.push(`Both do ${common[0]}`);
      else reasons.push(`${common.length} sports in common`);
    }
  }

  // Fitness level (up to 20 pts)
  if (me.fitness_level && other.fitness_level) {
    const diff = Math.abs(LEVEL_ORDER[me.fitness_level] - LEVEL_ORDER[other.fitness_level]);
    if (diff === 0) { score += 20; reasons.push(`Same fitness level`); }
    else if (diff === 1) { score += 10; reasons.push("Similar fitness level"); }
  }

  // City (15 pts)
  if (me.city && other.city && me.city.toLowerCase() === other.city.toLowerCase()) {
    score += 15;
    reasons.push(`Same city`);
  }

  // Preferred times overlap (up to 15 pts)
  const myTimes = me.preferred_times ?? [];
  const otherTimes = other.preferred_times ?? [];
  if (myTimes.length > 0 && otherTimes.length > 0) {
    const common = myTimes.filter(t => otherTimes.includes(t));
    if (common.length > 0) {
      score += Math.round((common.length / Math.max(myTimes.length, otherTimes.length)) * 15);
      reasons.push("Available same times");
    }
  }

  // Availability overlap (up to 10 pts)
  const myAvail = me.availability ?? {};
  const otherAvail = other.availability ?? {};
  const avDays = Object.keys(myAvail).filter(d => myAvail[d] && otherAvail[d]);
  if (avDays.length >= 3) { score += 10; reasons.push(`Free ${avDays.length} same days`); }
  else if (avDays.length >= 1) { score += 5; }

  // Industry (10 pts)
  if (me.industry && other.industry && me.industry === other.industry) {
    score += 10;
    reasons.push("Same industry");
  }

  return { score: Math.min(score, 100), reasons };
}

function buildScheduleSuggestions(workoutRows: { logged_at: string }[], availability: Record<string, boolean> | null): ScheduleSuggestion[] {
  if (workoutRows.length === 0) return [];

  // Count by day of week
  const dayCounts: Record<number, number> = {};
  // Count by hour bucket
  const hourCounts: Record<number, number> = {};

  for (const w of workoutRows) {
    const d = new Date(w.logged_at);
    dayCounts[d.getDay()] = (dayCounts[d.getDay()] ?? 0) + 1;
    const bucket = Math.floor(d.getHours() / 3) * 3; // 0,3,6,9,12,15,18,21
    hourCounts[bucket] = (hourCounts[bucket] ?? 0) + 1;
  }

  // Top 2 days
  const topDays = Object.entries(dayCounts).sort((a, b) => +b[1] - +a[1]).slice(0, 2);
  // Top hour bucket
  const topHour = Object.entries(hourCounts).sort((a, b) => +b[1] - +a[1])[0];

  function hourLabel(h: number) {
    if (h === 0) return "midnight";
    if (h < 6) return "early morning";
    if (h < 9) return "morning";
    if (h < 12) return "late morning";
    if (h < 15) return "afternoon";
    if (h < 18) return "late afternoon";
    if (h < 21) return "evening";
    return "night";
  }

  const suggestions: ScheduleSuggestion[] = [];

  if (topDays.length > 0) {
    const dayIdx = parseInt(topDays[0][0]);
    const timeStr = topHour ? hourLabel(parseInt(topHour[0])) : "morning";
    suggestions.push({
      day: DAYS_LABEL[dayIdx],
      time: timeStr,
      reason: `You've logged ${topDays[0][1]} workouts on ${DAYS_LABEL[dayIdx]}s — your most active day`,
      confidence: topDays[0][1] >= 3 ? "high" : "medium",
    });
  }

  if (topDays.length > 1) {
    const dayIdx = parseInt(topDays[1][0]);
    suggestions.push({
      day: DAYS_LABEL[dayIdx],
      time: topHour ? hourLabel(parseInt(topHour[0])) : "afternoon",
      reason: `${DAYS_LABEL[dayIdx]} is your second most active day`,
      confidence: "medium",
    });
  }

  // Suggest a recovery day (least active available day)
  const availDays = Object.entries(availability ?? {}).filter(([, v]) => v).map(([k]) => k);
  const activeDayLabels = topDays.map(([d]) => DAYS_LABEL[parseInt(d)]);
  const restDay = availDays.find(d => !activeDayLabels.includes(d));
  if (restDay) {
    suggestions.push({
      day: restDay,
      time: "any time",
      reason: "Good recovery day — you rarely train here, keep it light",
      confidence: "low",
    });
  }

  return suggestions;
}

/* ─── Recovery Plan ──────────────────────────────────────────────── */
type RecoveryTip = { emoji: string; title: string; desc: string; priority: "high" | "medium" | "low" };

function buildRecoveryPlan(
  workouts: { logged_at: string; exercise_type?: string; duration_minutes?: number }[],
  fitnessLevel: string | null,
  sports: string[] | null,
  currentStreak: number,
): RecoveryTip[] {
  const tips: RecoveryTip[] = [];
  const now = Date.now();
  const last7 = workouts.filter(w => now - new Date(w.logged_at).getTime() < 7 * 86400000);
  const last2 = workouts.filter(w => now - new Date(w.logged_at).getTime() < 2 * 86400000);
  const totalMinutes = last7.reduce((s, w) => s + (w.duration_minutes ?? 45), 0);
  const types = [...new Set(last7.map(w => w.exercise_type).filter(Boolean))] as string[];
  const hasStrength = types.some(t => ["Weightlifting", "Powerlifting", "CrossFit"].includes(t));
  const hasCardio   = types.some(t => ["Running", "Cycling", "Swimming", "HIIT"].includes(t));

  // Overtraining warning
  if (last7.length >= 6 || totalMinutes > 360) {
    tips.push({ emoji: "⚠️", title: "Rest day needed", desc: `You've trained ${last7.length}x this week (${totalMinutes} min). Your muscles need 24–48h recovery. Take a full rest or light walk today.`, priority: "high" });
  } else if (last2.length >= 2) {
    tips.push({ emoji: "😴", title: "Sleep is your superpower", desc: "You trained two days in a row. Aim for 8h sleep tonight — most muscle repair happens in deep sleep stages.", priority: "high" });
  }

  // Strength recovery
  if (hasStrength) {
    tips.push({ emoji: "🧘", title: "Mobility work", desc: "After strength sessions: 10 min of hip flexor and shoulder mobility reduces soreness and improves next session performance.", priority: "medium" });
    tips.push({ emoji: "🥩", title: "Protein window", desc: "Consume 20–40g protein within 2h of lifting. Helps rebuild muscle fibres broken down during resistance training.", priority: "medium" });
  }

  // Cardio recovery
  if (hasCardio) {
    tips.push({ emoji: "💧", title: "Rehydrate properly", desc: `You lost roughly ${Math.round(last2.reduce((s, w) => s + (w.duration_minutes ?? 45), 0) * 0.5 / 10) * 10}ml of fluid in recent cardio sessions. Drink water + electrolytes (not just plain water).`, priority: "high" });
  }

  // Streak-based
  if (currentStreak >= 7) {
    tips.push({ emoji: "🔥", title: `${currentStreak}-day streak — deload week due`, desc: "Impressive streak! After 7+ consecutive days, schedule a deload: cut volume by 50% for 1–2 days. You'll come back stronger.", priority: "medium" });
  }

  // Fitness level adjustments
  if (fitnessLevel === "beginner") {
    tips.push({ emoji: "🐢", title: "Progress slowly", desc: "Beginners need 48–72h between working the same muscle group. Your nervous system adapts slower than elite athletes — that's normal.", priority: "low" });
  } else if (fitnessLevel === "advanced") {
    tips.push({ emoji: "🧊", title: "Cold exposure", desc: "Cold showers (2–3 min) or ice baths post-training reduce inflammation markers by up to 20% in trained athletes.", priority: "low" });
  }

  // Sport-specific
  if (sports?.includes("Running")) {
    tips.push({ emoji: "🦵", title: "Foam roll your calves", desc: "Runners: 60-second foam roll on each calf + IT band reduces DOMS and lowers injury risk in your next run.", priority: "low" });
  }

  // Generic fallback
  if (last7.length === 0) {
    tips.push({ emoji: "💪", title: "Ready to go", desc: "No workouts logged this week. Your body is fully recovered — great time to start or increase intensity.", priority: "low" });
  }

  // Always add sleep tip if not added
  if (!tips.find(t => t.title.includes("Sleep"))) {
    tips.push({ emoji: "😴", title: "Prioritise sleep", desc: "7–9h of sleep is the most underrated performance tool. Growth hormone peaks during deep sleep — this is when you actually get fitter.", priority: "low" });
  }

  return tips.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]));
}

/* ─── Motivation Insights ───────────────────────────────────────── */
type MotivationInsight = {
  emoji: string;
  title: string;
  desc: string;
  type: "achievement" | "pattern" | "tip" | "quote";
  color: string;
};

const MOTIVATION_QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Consistency beats perfection every single time.",
  "Progress, not perfection.",
  "Your only competition is who you were yesterday.",
  "Every rep counts. Every session matters.",
  "Small steps daily lead to big changes yearly.",
];

function buildMotivationInsights(
  workouts: { logged_at: string; exercise_type?: string; duration_minutes?: number }[],
  fitnessLevel: string | null,
  streak: number,
): MotivationInsight[] {
  const insights: MotivationInsight[] = [];
  const now = Date.now();
  const last7 = workouts.filter(w => now - new Date(w.logged_at).getTime() < 7 * 86400000);
  const last30 = workouts.filter(w => now - new Date(w.logged_at).getTime() < 30 * 86400000);
  const prev30 = workouts.filter(w => {
    const age = now - new Date(w.logged_at).getTime();
    return age >= 30 * 86400000 && age < 60 * 86400000;
  });

  // Streak milestone
  if (streak >= 30) {
    insights.push({ emoji: "🏆", title: `${streak}-Day Streak Legend!`, desc: `You've trained every day for ${streak} days straight. You're in the top 1% of consistent athletes. Incredible discipline.`, type: "achievement", color: "#f59e0b" });
  } else if (streak >= 14) {
    insights.push({ emoji: "🔥", title: `${streak}-Day Streak!`, desc: `Two weeks of consistency! Research shows it takes 21 days to form a habit — you're almost there. Don't stop now.`, type: "achievement", color: "#FF4500" });
  } else if (streak >= 7) {
    insights.push({ emoji: "⚡", title: `${streak}-Day Streak!`, desc: `One full week! Your body is starting to adapt. Consistency at this stage creates the neurological patterns that make training feel natural.`, type: "achievement", color: "#a855f7" });
  } else if (streak >= 3) {
    insights.push({ emoji: "📈", title: `${streak} Days Running`, desc: `You're building momentum. Studies show 3+ consecutive days of activity increases the chance of a full week completion by 75%.`, type: "achievement", color: "#22c55e" });
  }

  // Volume trend
  if (last7.length >= 4 && last30.length > prev30.length) {
    const increase = last30.length - prev30.length;
    insights.push({ emoji: "📊", title: "Volume Trending Up", desc: `You did ${last30.length} workouts this month vs ${prev30.length} last month — a ${increase > 0 ? "+" : ""}${increase} increase. Your fitness is compounding.`, type: "pattern", color: "#22c55e" });
  } else if (last7.length < 2 && prev30.length > 5) {
    insights.push({ emoji: "📉", title: "Activity Dip Detected", desc: "You're logging fewer workouts than your usual pace. Life happens — even 15 min sessions maintain your base fitness. Get back on it!", type: "pattern", color: "#f59e0b" });
  }

  // Best day of week
  const dayCounts: Record<number, number> = {};
  for (const w of last30) {
    const d = new Date(w.logged_at).getDay();
    dayCounts[d] = (dayCounts[d] ?? 0) + 1;
  }
  const topDay = Object.entries(dayCounts).sort((a, b) => +b[1] - +a[1])[0];
  if (topDay) {
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][parseInt(topDay[0])];
    insights.push({ emoji: "📅", title: `${dayName} is Your Power Day`, desc: `You complete ${topDay[1]} workouts on ${dayName}s — more than any other day. Schedule your hardest sessions here.`, type: "pattern", color: "#3b82f6" });
  }

  // Total volume milestone
  if (workouts.length >= 100) {
    insights.push({ emoji: "💯", title: `${workouts.length} Workouts Logged!`, desc: `You've hit ${workouts.length} total sessions. That's an elite level of consistency. Your future self thanks you.`, type: "achievement", color: "#f59e0b" });
  } else if (workouts.length >= 50) {
    insights.push({ emoji: "5️⃣0️⃣", title: "50 Workouts Club", desc: "You've logged over 50 sessions! The research is clear: people who hit 50 workouts are 3x more likely to maintain a lifetime fitness habit.", type: "achievement", color: "#a855f7" });
  }

  // Fitness level tip
  if (fitnessLevel === "beginner") {
    insights.push({ emoji: "🌱", title: "Beginner Advantage", desc: "Good news: beginners gain strength and fitness faster than anyone else. Your first 3 months will show more progress than advanced athletes see in a year. Stay consistent.", type: "tip", color: "#22c55e" });
  } else if (fitnessLevel === "advanced") {
    insights.push({ emoji: "🎯", title: "Advanced Athlete Mode", desc: "At your level, 1–2% monthly improvements are excellent. Focus on periodisation, deload weeks, and sleep quality — the marginal gains that compound over years.", type: "tip", color: "#FF4500" });
  }

  // Random quote
  const quote = MOTIVATION_QUOTES[workouts.length % MOTIVATION_QUOTES.length];
  insights.push({ emoji: "💬", title: "Daily Reminder", desc: `"${quote}"`, type: "quote", color: "#555" });

  return insights;
}

/* ─── Component ─────────────────────────────────────────────────── */
export default function RecommendationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"partners" | "content" | "schedule" | "recovery" | "motivation">("partners");
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MyProfile | null>(null);

  const [partners, setPartners] = useState<Candidate[]>([]);
  const [content, setContent] = useState<RecommendedContent[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSuggestion[]>([]);
  const [recovery, setRecovery] = useState<RecoveryTip[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [motivation, setMotivation] = useState<MotivationInsight[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: myData }, { data: workoutsRaw }, { data: sentMatches }, { data: streakData }] = await Promise.all([
      supabase.from("users").select("id, sports, fitness_level, preferred_times, industry, city, availability").eq("id", user.id).single(),
      supabase.from("workouts").select("logged_at, exercise_type, duration_minutes").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(100),
      supabase.from("matches").select("receiver_id, sender_id, status").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
      supabase.from("users").select("current_streak").eq("id", user.id).single(),
    ]);

    if (!myData) { setLoading(false); return; }
    setMe({ ...myData, id: user.id });

    // Already interacted users
    const interacted = new Set<string>();
    interacted.add(user.id);
    for (const m of sentMatches ?? []) {
      interacted.add(m.receiver_id);
      interacted.add(m.sender_id);
    }
    setSentIds(interacted);

    // Load candidates
    const { data: candidates } = await supabase
      .from("users")
      .select("id, username, full_name, avatar_url, city, fitness_level, sports, preferred_times, industry, availability, is_pro")
      .neq("id", user.id)
      .limit(100);

    // Fetch tier badges
    const candidateIds = (candidates ?? []).map((c: any) => c.id);
    const { data: badgeRows } = await supabase
      .from("user_badges")
      .select("user_id, badge_key")
      .in("user_id", candidateIds);
    const badgeMap: Record<string, number> = {};
    for (const b of badgeRows ?? []) {
      badgeMap[b.user_id] = (badgeMap[b.user_id] ?? 0) + 1;
    }

    const scored: Candidate[] = (candidates ?? [])
      .filter((c: any) => !interacted.has(c.id))
      .map((c: any) => {
        const { score, reasons } = scoreCandidate(myData, c);
        const tier = calcTier((badgeMap[c.id] ?? 0) * 100);
        return { ...c, score, reasons, tierEmoji: tier.emoji };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    setPartners(scored);

    // Content recommendations
    const userSports = (myData.sports ?? []).map((s: string) => s.toLowerCase());
    const [{ data: events }, { data: communities }, { data: challenges }] = await Promise.all([
      supabase.from("events").select("id, title, sport").gte("event_date", new Date().toISOString()).limit(20),
      supabase.from("communities").select("id, name, sport, avatar_emoji").limit(20),
      supabase.from("challenges").select("id, title, goal_type").limit(20),
    ]);

    const rec: RecommendedContent[] = [];

    for (const e of events ?? []) {
      if (userSports.some((s: string) => e.sport?.toLowerCase().includes(s) || s.includes(e.sport?.toLowerCase()))) {
        rec.push({ id: e.id, type: "event", title: e.title, subtitle: `📅 Upcoming · ${e.sport}`, emoji: "📅", href: "/app/events" });
      }
    }
    for (const c of communities ?? []) {
      if (userSports.some((s: string) => c.sport?.toLowerCase().includes(s) || s.includes(c.sport?.toLowerCase()))) {
        rec.push({ id: c.id, type: "community", title: c.name, subtitle: `🌍 Community · ${c.sport}`, emoji: c.avatar_emoji ?? "🌍", href: `/app/communities/${c.id}` });
      }
    }
    for (const ch of challenges ?? []) {
      if (userSports.some((s: string) => ch.goal_type?.toLowerCase().includes(s) || s.includes(ch.goal_type?.toLowerCase()))) {
        rec.push({ id: ch.id, type: "challenge", title: ch.title, subtitle: `🏆 Challenge`, emoji: "🏆", href: "/app/challenges" });
      }
    }
    // Fallback: show first few of each type if nothing matches
    if (rec.length < 3) {
      for (const e of (events ?? []).slice(0, 2)) {
        if (!rec.find(r => r.id === e.id)) rec.push({ id: e.id, type: "event", title: e.title, subtitle: `📅 Upcoming · ${e.sport}`, emoji: "📅", href: "/app/events" });
      }
      for (const c of (communities ?? []).slice(0, 2)) {
        if (!rec.find(r => r.id === c.id)) rec.push({ id: c.id, type: "community", title: c.name, subtitle: `🌍 Community · ${c.sport ?? "Fitness"}`, emoji: c.avatar_emoji ?? "🌍", href: `/app/communities/${c.id}` });
      }
    }
    setContent(rec.slice(0, 10));

    // Schedule
    setSchedule(buildScheduleSuggestions(workoutsRaw ?? [], myData.availability));

    // Recovery
    const streak = streakData?.current_streak ?? 0;
    setCurrentStreak(streak);
    setRecovery(buildRecoveryPlan(workoutsRaw ?? [], myData.fitness_level, myData.sports, streak));
    setMotivation(buildMotivationInsights(workoutsRaw ?? [], myData.fitness_level, streak));

    setLoading(false);
  }

  async function sendRequest(receiverId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSending(receiverId);
    await supabase.from("matches").insert({ sender_id: user.id, receiver_id: receiverId, status: "pending" });
    setSentIds(prev => new Set([...prev, receiverId]));
    setSending(null);
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: "20px 16px", paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer", padding: 0 }}>←</button>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: 0 }}>For You</h1>
          <span style={{ fontSize: 11, color: "#FF4500", background: "#1a0800", border: "1px solid #FF450044", borderRadius: 999, padding: "2px 8px", fontWeight: 700 }}>AI</span>
        </div>
        <p style={{ color: "#555", fontSize: 13, margin: 0, paddingLeft: 30 }}>Personalised picks based on your profile & activity</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 3, background: "#1a1a1a", borderRadius: 12, padding: 3, marginBottom: 20, overflowX: "auto" }}>
        {(["partners", "content", "schedule", "recovery", "motivation"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: "0 0 auto", padding: "9px 10px", borderRadius: 10, border: "none", background: tab === t ? "#FF4500" : "transparent", color: tab === t ? "#fff" : "#555", fontWeight: 700, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" }}>
            {t === "partners" ? "🤝 Partners" : t === "content" ? "📚 Content" : t === "schedule" ? "📅 Schedule" : t === "recovery" ? "🧊 Recovery" : "⚡ Motivation"}
          </button>
        ))}
      </div>

      {/* PARTNERS TAB */}
      {tab === "partners" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {partners.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 52 }}>🤝</div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 18, marginTop: 16 }}>No recommendations yet</p>
              <p style={{ color: "#555", fontSize: 14 }}>Complete your profile with sports, city and availability to get personalised matches.</p>
              <button onClick={() => router.push("/app/profile")}
                style={{ marginTop: 20, padding: "12px 24px", borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Update Profile →
              </button>
            </div>
          ) : partners.map((p, i) => {
            const alreadySent = sentIds.has(p.id);
            return (
              <div key={p.id} style={{ background: "#1a1a1a", borderRadius: 18, padding: 16, border: `1px solid ${i < 3 ? "#FF450033" : "#2a2a2a"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  {/* Rank */}
                  <div style={{ fontSize: i === 0 ? 24 : 16, width: 28, textAlign: "center", flexShrink: 0 }}>
                    {i === 0 ? "⭐" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span style={{ color: "#444", fontWeight: 700 }}>{i + 1}</span>}
                  </div>
                  {/* Avatar */}
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: 24, objectFit: "cover", border: "2px solid #2a2a2a", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 24, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                      {p.username[0]?.toUpperCase()}
                    </div>
                  )}
                  {/* Name + tier */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>{p.full_name ?? `@${p.username}`}</span>
                      {p.is_pro && <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: "#FF4500", borderRadius: 999, padding: "1px 6px" }}>PRO</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                      {p.tierEmoji} {p.city && `📍 ${p.city}`}
                    </div>
                  </div>
                  {/* Score ring */}
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: p.score >= 70 ? "#22c55e" : p.score >= 40 ? "#f59e0b" : "#FF4500" }}>{p.score}%</div>
                    <div style={{ fontSize: 9, color: "#555", fontWeight: 700 }}>MATCH</div>
                  </div>
                </div>

                {/* Reason chips */}
                {p.reasons.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {p.reasons.slice(0, 3).map(r => (
                      <span key={r} style={{ fontSize: 11, color: "#FF4500", background: "#1a0800", border: "1px solid #FF450033", borderRadius: 999, padding: "3px 10px", fontWeight: 600 }}>
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                )}

                {/* Sports */}
                {p.sports && p.sports.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {p.sports.slice(0, 4).map(s => (
                      <span key={s} style={{ fontSize: 11, color: "#888", background: "#111", border: "1px solid #2a2a2a", borderRadius: 999, padding: "3px 10px" }}>{s}</span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => !alreadySent && sendRequest(p.id)}
                  disabled={alreadySent || sending === p.id}
                  style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: alreadySent ? "1px solid #2a2a2a" : "none", background: alreadySent ? "transparent" : "#FF4500", color: alreadySent ? "#555" : "#fff", fontWeight: 700, fontSize: 14, cursor: alreadySent ? "default" : "pointer", opacity: sending === p.id ? 0.6 : 1 }}>
                  {alreadySent ? "Request Sent ✓" : sending === p.id ? "Sending..." : "💪 Connect"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* CONTENT TAB */}
      {tab === "content" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {me?.sports && me.sports.length > 0 && (
            <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>
              Based on: {me.sports.join(", ")}
            </div>
          )}
          {content.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 52 }}>📚</div>
              <p style={{ color: "#fff", fontWeight: 700, marginTop: 16 }}>No recommendations yet</p>
              <p style={{ color: "#555", fontSize: 14 }}>Add your sports to your profile to get tailored content.</p>
            </div>
          ) : content.map(item => (
            <div key={item.id} onClick={() => router.push(item.href)}
              style={{ background: "#1a1a1a", borderRadius: 16, padding: "14px 16px", border: "1px solid #2a2a2a", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, border: "1px solid #2a2a2a" }}>
                {item.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>{item.subtitle}</div>
              </div>
              <span style={{ color: "#444", fontSize: 16, flexShrink: 0 }}>→</span>
            </div>
          ))}
        </div>
      )}

      {/* RECOVERY TAB */}
      {tab === "recovery" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#0d1f1f", borderRadius: 14, padding: "12px 14px", border: "1px solid #22c55e33", fontSize: 13, color: "#888", lineHeight: 1.6 }}>
            🧊 Personalised recovery plan based on your recent workouts, streak, and fitness level.
          </div>

          {recovery.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 52 }}>🧘</div>
              <p style={{ color: "#fff", fontWeight: 700, marginTop: 16 }}>Log workouts to get tips</p>
              <p style={{ color: "#555", fontSize: 14 }}>Your recovery plan is generated from your training history.</p>
              <button onClick={() => router.push("/app/activity")}
                style={{ marginTop: 20, padding: "12px 24px", borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Log Workout →
              </button>
            </div>
          ) : recovery.map((tip, i) => {
            const priorityColor = tip.priority === "high" ? "#ef4444" : tip.priority === "medium" ? "#f59e0b" : "#22c55e";
            return (
              <div key={i} style={{ background: "#111", borderRadius: 16, padding: 16, border: `1px solid ${priorityColor}22` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${priorityColor}11`, border: `1px solid ${priorityColor}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                    {tip.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 14 }}>{tip.title}</span>
                      {tip.priority === "high" && (
                        <span style={{ fontSize: 9, fontWeight: 800, color: priorityColor, background: `${priorityColor}11`, border: `1px solid ${priorityColor}33`, borderRadius: 999, padding: "2px 7px" }}>PRIORITY</span>
                      )}
                    </div>
                    <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{tip.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}

          <div style={{ background: "#1a1a1a", borderRadius: 14, padding: 14, border: "1px solid #2a2a2a", marginTop: 4 }}>
            <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>CURRENT STREAK</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#FF4500" }}>🔥 {currentStreak} days</div>
            <p style={{ color: "#555", fontSize: 12, margin: "6px 0 0" }}>
              {currentStreak === 0 ? "Start your streak by logging a workout today." : currentStreak < 7 ? "Keep going — 7 days unlocks the Week Warrior badge." : "Great consistency. Remember to schedule deload days."}
            </p>
          </div>
        </div>
      )}

      {/* SCHEDULE TAB */}
      {tab === "schedule" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#1a0800", borderRadius: 14, padding: "12px 14px", border: "1px solid #FF450033", fontSize: 13, color: "#888", lineHeight: 1.6 }}>
            🧠 Analysed your last workouts + availability to suggest your best training windows.
          </div>

          {schedule.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 52 }}>📅</div>
              <p style={{ color: "#fff", fontWeight: 700, marginTop: 16 }}>No data yet</p>
              <p style={{ color: "#555", fontSize: 14 }}>Log a few workouts and we'll suggest your optimal schedule.</p>
              <button onClick={() => router.push("/app/activity")}
                style={{ marginTop: 20, padding: "12px 24px", borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Log Workout →
              </button>
            </div>
          ) : schedule.map((s, i) => {
            const confColor = s.confidence === "high" ? "#22c55e" : s.confidence === "medium" ? "#f59e0b" : "#555";
            const confLabel = s.confidence === "high" ? "High confidence" : s.confidence === "medium" ? "Likely good" : "Low activity";
            return (
              <div key={i} style={{ background: "#1a1a1a", borderRadius: 16, padding: 16, border: "1px solid #2a2a2a" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px solid ${confColor}33`, flexShrink: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: confColor }}>{s.day}</span>
                    <span style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>{s.time.split(" ")[0]}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>{s.day} {s.time}</div>
                    <div style={{ fontSize: 11, color: confColor, fontWeight: 700, marginTop: 2 }}>● {confLabel}</div>
                  </div>
                </div>
                <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{s.reason}</p>
              </div>
            );
          })}

          {me?.availability && (
            <div style={{ background: "#1a1a1a", borderRadius: 14, padding: 14, border: "1px solid #2a2a2a" }}>
              <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>YOUR AVAILABILITY</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(me.availability).filter(([, v]) => v).map(([day]) => (
                  <span key={day} style={{ fontSize: 12, color: "#FF4500", background: "#1a0800", border: "1px solid #FF450033", borderRadius: 8, padding: "5px 12px", fontWeight: 700 }}>{day}</span>
                ))}
              </div>
              <button onClick={() => router.push("/app/profile")}
                style={{ marginTop: 10, fontSize: 12, color: "#555", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                Edit availability in profile →
              </button>
            </div>
          )}
        </div>
      )}

      {/* MOTIVATION TAB */}
      {tab === "motivation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#1a0800", borderRadius: 14, padding: "12px 14px", border: "1px solid #FF450033", fontSize: 13, color: "#888", lineHeight: 1.6 }}>
            ⚡ Behavioural insights based on your workout history, streak, and activity patterns.
          </div>

          {motivation.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 52 }}>⚡</div>
              <p style={{ color: "#fff", fontWeight: 700, marginTop: 16 }}>Log workouts to unlock insights</p>
              <p style={{ color: "#555", fontSize: 14 }}>We'll analyse your patterns and give you personalised motivational data.</p>
              <button onClick={() => router.push("/app/activity")}
                style={{ marginTop: 20, padding: "12px 24px", borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Log Workout →
              </button>
            </div>
          ) : motivation.map((m, i) => {
            const typeColors: Record<string, string> = { achievement: "#f59e0b", pattern: "#3b82f6", tip: "#22c55e", quote: "#555" };
            const typeLabels: Record<string, string> = { achievement: "ACHIEVEMENT", pattern: "PATTERN", tip: "TIP", quote: "QUOTE" };
            const borderColor = typeColors[m.type] ?? "#2a2a2a";
            return (
              <div key={i} style={{ background: "#1a1a1a", borderRadius: 16, padding: 16, border: `1px solid ${borderColor}33` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: borderColor + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, border: `1px solid ${borderColor}44` }}>
                    {m.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: borderColor, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>{typeLabels[m.type]}</div>
                    <div style={{ fontWeight: 800, color: "#fff", fontSize: 15, marginBottom: 6 }}>{m.title}</div>
                    <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{m.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Habits shortcut */}
          <div onClick={() => router.push("/app/habits")}
            style={{ background: "#111", borderRadius: 16, padding: 16, border: "1px solid #2a2a2a", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
            <span style={{ fontSize: 32 }}>🎯</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>Habit Tracker</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Build daily routines and track your consistency</div>
            </div>
            <span style={{ color: "#FF4500", fontWeight: 700, fontSize: 13 }}>Open →</span>
          </div>
        </div>
      )}
    </div>
  );
}
