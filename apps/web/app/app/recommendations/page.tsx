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

/* ─── Component ─────────────────────────────────────────────────── */
export default function RecommendationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"partners" | "content" | "schedule">("partners");
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MyProfile | null>(null);

  const [partners, setPartners] = useState<Candidate[]>([]);
  const [content, setContent] = useState<RecommendedContent[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSuggestion[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: myData }, { data: workoutsRaw }, { data: sentMatches }] = await Promise.all([
      supabase.from("users").select("id, sports, fitness_level, preferred_times, industry, city, availability").eq("id", user.id).single(),
      supabase.from("workouts").select("logged_at").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(100),
      supabase.from("matches").select("receiver_id, sender_id, status").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
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
      <div style={{ display: "flex", gap: 3, background: "#1a1a1a", borderRadius: 12, padding: 3, marginBottom: 20 }}>
        {(["partners", "content", "schedule"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: tab === t ? "#FF4500" : "transparent", color: tab === t ? "#fff" : "#555", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
            {t === "partners" ? "🤝 Partners" : t === "content" ? "📚 Content" : "📅 Schedule"}
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
    </div>
  );
}
