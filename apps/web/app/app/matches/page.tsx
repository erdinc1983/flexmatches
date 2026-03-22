"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { checkAndAwardMatchBadges, BADGE_MAP } from "../../../lib/badges";
import { sendPush } from "../../../lib/sendPush";

type MatchUser = { id: string; username: string; full_name: string | null; fitness_level: string | null; city: string | null; avatar_url: string | null; current_streak: number; gender: string | null; age: number | null };
type Match = { id: string; status: string; sender_id: string; other_user: MatchUser };
type PartnerStats = { workouts7d: number; lastExercise: string | null; lastActive: string | null };
type LeaderEntry = { user_id: string; username: string; badge_count: number; badges: string[] };
type Challenge = {
  id: string; sender_id: string; receiver_id: string; match_id: string;
  title: string; target_type: string; target_value: number; target_exercise: string | null;
  duration_days: number; status: string; sender_progress: number; receiver_progress: number;
  deadline: string | null; created_at: string;
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

export default function MatchesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"matches" | "leaderboard">("matches");
  const [pending, setPending] = useState<Match[]>([]);
  const [accepted, setAccepted] = useState<Match[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [partnerStats, setPartnerStats] = useState<Record<string, PartnerStats>>({});
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Challenge modal state
  const [challengingMatch, setChallengingMatch] = useState<Match | null>(null);
  const [challengeType, setChallengeType] = useState<"workout_count" | "streak" | "exercise">("workout_count");
  const [challengeTarget, setChallengeTarget] = useState(5);
  const [challengeExercise, setChallengeExercise] = useState("Running");
  const [challengeDays, setChallengeDays] = useState(7);
  const [sendingChallenge, setSendingChallenge] = useState(false);

  // Buddy session scheduling
  type BuddySession = { id: string; proposer_id: string; receiver_id: string; match_id: string; sport: string; location: string | null; session_date: string; session_time: string | null; notes: string | null; status: string };
  const [schedulingMatch, setSchedulingMatch] = useState<Match | null>(null);
  const [sessionSport, setSessionSport] = useState("Gym");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [sessionLocation, setSessionLocation] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [sendingSession, setSendingSession] = useState(false);
  const [buddySessions, setBuddySessions] = useState<BuddySession[]>([]);

  // Safety acknowledgment modal
  const [safetyPendingAccept, setSafetyPendingAccept] = useState<string | null>(null);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const SAFETY_KEY = "fm_safety_ack_v1";

  useEffect(() => { loadMatches(); }, []);

  async function loadBuddySessions(userId: string) {
    const { data } = await supabase
      .from("buddy_sessions")
      .select("*")
      .or(`proposer_id.eq.${userId},receiver_id.eq.${userId}`)
      .in("status", ["pending", "accepted"])
      .order("session_date", { ascending: true });
    setBuddySessions((data as BuddySession[]) ?? []);
  }

  async function proposeBuddySession() {
    if (!schedulingMatch || !myId || !sessionDate) return;
    setSendingSession(true);
    await supabase.from("buddy_sessions").insert({
      proposer_id: myId,
      receiver_id: schedulingMatch.other_user.id,
      match_id: schedulingMatch.id,
      sport: sessionSport,
      location: sessionLocation.trim() || null,
      session_date: sessionDate,
      session_time: sessionTime || null,
      notes: sessionNotes.trim() || null,
      status: "pending",
    });
    sendPush(
      schedulingMatch.other_user.id,
      "📅 Workout session proposed!",
      `Join you for ${sessionSport} on ${sessionDate}`,
      "/app/matches"
    );
    await loadBuddySessions(myId);
    setSendingSession(false);
    setSchedulingMatch(null);
    setSessionSport("Gym"); setSessionDate(""); setSessionTime(""); setSessionLocation(""); setSessionNotes("");
  }

  async function respondToSession(sessionId: string, accept: boolean) {
    await supabase.from("buddy_sessions").update({ status: accept ? "accepted" : "declined" }).eq("id", sessionId);
    if (myId) await loadBuddySessions(myId);
  }

  async function loadLeaderboard() {
    if (leaderboard.length > 0) return;
    setLbLoading(true);
    const { data } = await supabase
      .from("user_badges")
      .select("user_id, badge_key, users(username)");
    if (data) {
      const map: Record<string, LeaderEntry> = {};
      for (const row of data as any[]) {
        const uid = row.user_id;
        if (!map[uid]) map[uid] = { user_id: uid, username: row.users?.username ?? "?", badge_count: 0, badges: [] };
        map[uid].badge_count++;
        map[uid].badges.push(row.badge_key);
      }
      const sorted = Object.values(map).sort((a, b) => b.badge_count - a.badge_count).slice(0, 20);
      setLeaderboard(sorted);
    }
    setLbLoading(false);
  }

  function switchTab(t: "matches" | "leaderboard") {
    setTab(t);
    if (t === "leaderboard") loadLeaderboard();
  }

  async function loadMatches() {
    try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyId(user.id);
    loadChallenges(user.id);
    loadBuddySessions(user.id);

    // Fetch pending (incoming requests)
    const { data: incomingRaw } = await supabase
      .from("matches")
      .select("id, status, sender_id")
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    if (incomingRaw && incomingRaw.length > 0) {
      const senderIds = incomingRaw.map((m: any) => m.sender_id);
      const { data: senderUsers } = await supabase
        .from("users")
        .select("id, username, full_name, fitness_level, city, avatar_url, current_streak, gender, age")
        .in("id", senderIds);
      const userMap = Object.fromEntries((senderUsers ?? []).map((u: any) => [u.id, u]));
      setPending(incomingRaw
        .map((m: any) => ({ id: m.id, status: m.status, sender_id: m.sender_id, other_user: userMap[m.sender_id] ?? null }))
        .filter((m: any) => m.other_user !== null) // skip deleted users
      );
    } else {
      setPending([]);
    }

    // Fetch accepted
    const { data: acceptedRaw } = await supabase
      .from("matches")
      .select("id, status, sender_id, receiver_id")
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (acceptedRaw && acceptedRaw.length > 0) {
      const otherIds = acceptedRaw.map((m: any) => m.sender_id === user.id ? m.receiver_id : m.sender_id);
      const { data: otherUsers } = await supabase
        .from("users")
        .select("id, username, full_name, fitness_level, city, avatar_url, current_streak, gender, age")
        .in("id", otherIds);
      const userMap = Object.fromEntries((otherUsers ?? []).map((u: any) => [u.id, u]));
      const deduped = acceptedRaw.map((m: any) => {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        return { id: m.id, status: m.status, sender_id: m.sender_id, other_user: userMap[otherId] ?? { id: otherId, username: "unknown", full_name: null, fitness_level: null, city: null, avatar_url: null, current_streak: 0, gender: null, age: null } };
      });
      // Deduplicate by other_user.id, skip deleted users (not found in userMap)
      const seen = new Set<string>();
      const unique = deduped.filter((m: Match) => {
        if (m.other_user.username === "unknown") return false; // user was deleted
        if (seen.has(m.other_user.id)) return false;
        seen.add(m.other_user.id);
        return true;
      });
      setAccepted(unique);
    } else {
      setAccepted([]);
    }
    // Fetch unread counts for accepted matches
    if (acceptedRaw && acceptedRaw.length > 0) {
      const counts: Record<string, number> = {};
      await Promise.all(acceptedRaw.map(async (m: any) => {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("match_id", m.id)
          .neq("sender_id", user.id);
        counts[m.id] = count ?? 0;
      }));
      setUnreadCounts(counts);
    }

    // Fetch partner workout stats (last 7 days)
    if (acceptedRaw && acceptedRaw.length > 0) {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const pIds = acceptedRaw.map((m: any) => m.sender_id === user.id ? m.receiver_id : m.sender_id);
      const { data: wRows } = await supabase
        .from("workouts")
        .select("user_id, logged_at, exercise_type")
        .in("user_id", pIds)
        .gte("logged_at", since);
      const stats: Record<string, PartnerStats> = {};
      for (const pid of pIds) {
        const rows = (wRows ?? []).filter((w: any) => w.user_id === pid);
        const sorted = rows.sort((a: any, b: any) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
        stats[pid] = { workouts7d: rows.length, lastExercise: sorted[0]?.exercise_type ?? null, lastActive: sorted[0]?.logged_at ?? null };
      }
      setPartnerStats(stats);
    }

    setLoading(false);
    } catch {
      setLoadError(true);
      setLoading(false);
    }
  }

  async function respond(matchId: string, status: "accepted" | "declined") {
    if (status === "accepted") {
      const alreadyAcknowledged = typeof window !== "undefined" && localStorage.getItem(SAFETY_KEY) === "1";
      if (!alreadyAcknowledged) {
        setSafetyPendingAccept(matchId);
        return;
      }
    }
    await doAccept(matchId, status);
  }

  async function doAccept(matchId: string, status: "accepted" | "declined") {
    await supabase.from("matches").update({ status }).eq("id", matchId);
    if (status === "accepted") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        checkAndAwardMatchBadges(user.id);
        const match = pending.find((m) => m.id === matchId);
        if (match) sendPush(match.sender_id, "🤝 Match accepted!", "Your connect request was accepted. Start chatting!", `/app/chat/${matchId}`);
      }
    }
    await loadMatches();
  }

  async function disconnect(matchId: string) {
    if (!window.confirm("Disconnect from this match? This cannot be undone.")) return;
    await supabase.from("matches").delete().eq("id", matchId);
    await loadMatches();
  }

  async function loadChallenges(userId: string) {
    const { data } = await supabase
      .from("challenges")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .in("status", ["pending", "active"]);
    setChallenges((data as Challenge[]) ?? []);
  }

  async function sendChallenge() {
    if (!challengingMatch || !myId) return;
    setSendingChallenge(true);
    const deadline = new Date(Date.now() + challengeDays * 86400000).toISOString();
    const title =
      challengeType === "workout_count" ? `Log ${challengeTarget} workouts in ${challengeDays} days`
      : challengeType === "streak" ? `Maintain a ${challengeTarget}-day streak`
      : `Log ${challengeTarget} ${challengeExercise} sessions in ${challengeDays} days`;

    await supabase.from("challenges").insert({
      sender_id: myId,
      receiver_id: challengingMatch.other_user.id,
      match_id: challengingMatch.id,
      title,
      target_type: challengeType,
      target_value: challengeTarget,
      target_exercise: challengeType === "exercise" ? challengeExercise : null,
      duration_days: challengeDays,
      deadline,
      status: "pending",
    });
    sendPush(
      challengingMatch.other_user.id,
      "⚡ Challenge incoming!",
      title,
      "/app/matches"
    );
    await loadChallenges(myId);
    setSendingChallenge(false);
    setChallengingMatch(null);
  }

  async function respondToChallenge(challengeId: string, accept: boolean) {
    await supabase.from("challenges").update({ status: accept ? "active" : "declined" }).eq("id", challengeId);
    if (myId) await loadChallenges(myId);
  }

  if (loadError) return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)", marginBottom: 8 }}>Couldn't load</div>
      <div style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>Check your connection and try again.</div>
      <button onClick={() => { setLoadError(false); setLoading(true); loadMatches(); }} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Try Again</button>
    </div>
  );

  if (loading) return (
    <div style={{ padding: "20px 16px" }}>
      <div style={{ height: 32, width: "40%", borderRadius: 8, background: "linear-gradient(90deg, var(--bg-card-alt) 25%, var(--border) 50%, var(--bg-card-alt) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", marginBottom: 20 }} />
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
    <div style={{ padding: "20px 16px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.5, marginBottom: 16 }}>Matches</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "var(--bg-card)", borderRadius: 12, padding: 4 }}>
        {(["matches", "leaderboard"] as const).map((t) => (
          <button key={t} onClick={() => switchTab(t)}
            style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: tab === t ? "var(--accent)" : "transparent", color: tab === t ? "var(--text-primary)" : "var(--text-faint)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {t === "matches" ? "🤝 Matches" : "🏆 Leaderboard"}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {tab === "leaderboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lbLoading && <div style={{ textAlign: "center", color: "var(--text-faint)", paddingTop: 40 }}>Loading...</div>}
          {!lbLoading && leaderboard.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-faint)", paddingTop: 40 }}>No badges earned yet. Be the first!</div>
          )}
          {leaderboard.map((entry, i) => (
            <div key={entry.user_id} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-card-alt)", borderRadius: 14, padding: "12px 16px", border: i < 3 ? "1px solid var(--accent-faint)" : "1px solid var(--border-medium)" }}>
              <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>@{entry.username}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                  {entry.badges.map((key) => {
                    const b = BADGE_MAP[key as keyof typeof BADGE_MAP];
                    return b ? <span key={key} title={b.title} style={{ fontSize: 16 }}>{b.emoji}</span> : null;
                  })}
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{entry.badge_count} {entry.badge_count === 1 ? "badge" : "badges"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Matches */}
      {tab === "matches" && (
        <div>
          {pending.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
                Requests <span style={{ color: "var(--accent)", fontWeight: 900 }}>{pending.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pending.map((m) => (
                  <div key={m.id} style={{ background: "var(--bg-card-alt)", borderRadius: 16, padding: 14, border: "1px solid var(--border-medium)", borderLeft: "3px solid var(--accent)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <img src={m.other_user.avatar_url || getDefaultAvatar(m.other_user.id, m.other_user.gender, m.other_user.age)} alt="" style={{ width: 52, height: 52, borderRadius: 26, objectFit: "cover", border: "2px solid var(--border-medium)", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>{m.other_user.full_name?.split(" ")[0] ?? m.other_user.username}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>@{m.other_user.username}</div>
                        {m.other_user.city && <div style={{ fontSize: 12, color: "var(--text-faint)" }}>📍 {m.other_user.city}</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => respond(m.id, "declined")} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-faint)", fontWeight: 600, cursor: "pointer" }}>
                        Decline
                      </button>
                      <button onClick={() => respond(m.id, "accepted")} style={{ flex: 2, padding: "9px 0", borderRadius: 10, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                        ✓ Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
              Connections <span style={{ color: "var(--accent)", fontWeight: 900 }}>{accepted.length}</span>
            </div>
            {accepted.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🤝</div>
                <div style={{ fontWeight: 800, fontSize: 20, color: "var(--text-primary)", marginBottom: 8 }}>No matches yet</div>
                <div style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>Start swiping on Discover to find your training partners.</div>
                <button onClick={() => router.push("/app/discover")} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Go to Discover →</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {accepted.map((m) => {
                  const st = partnerStats[m.other_user.id];
                  const streak = m.other_user.current_streak ?? 0;
                  const daysAgo = st?.lastActive ? Math.floor((Date.now() - new Date(st.lastActive).getTime()) / 86400000) : null;
                  return (
                    <div key={m.id} style={{ background: "var(--bg-card-alt)", borderRadius: 16, border: "1px solid var(--border-medium)", overflow: "hidden" }}>
                      {/* Top row */}
                      <div style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ position: "relative" }}>
                            <img src={m.other_user.avatar_url || getDefaultAvatar(m.other_user.id, m.other_user.gender, m.other_user.age)} alt="" style={{ width: 52, height: 52, borderRadius: 26, objectFit: "cover", border: "2px solid var(--border-medium)" }} />
                            {unreadCounts[m.id] > 0 && (
                              <span style={{ position: "absolute", top: -4, right: -4, background: "var(--accent)", color: "var(--text-primary)", borderRadius: 999, fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                                {unreadCounts[m.id]}
                              </span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>{m.other_user.full_name?.split(" ")[0] ?? m.other_user.username}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>@{m.other_user.username}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => router.push(`/app/chat/${m.id}`)} style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", background: "var(--accent)", padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer" }}>
                            Message
                          </button>
                          <button onClick={() => setChallengingMatch(m)} style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", background: "transparent", padding: "6px 12px", borderRadius: 8, border: "1px solid #f59e0b44", cursor: "pointer" }} title="Send a challenge">
                            ⚡
                          </button>
                          <button onClick={() => setSchedulingMatch(m)} style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", background: "transparent", padding: "6px 12px", borderRadius: 8, border: "1px solid #22c55e44", cursor: "pointer" }} title="Schedule a workout session">
                            📅
                          </button>
                          <button onClick={() => disconnect(m.id)} style={{ fontSize: 12, fontWeight: 600, color: "var(--text-faint)", background: "transparent", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border-medium)", cursor: "pointer" }}>
                            ✕
                          </button>
                        </div>
                      </div>
                      {/* Active challenges strip */}
                      {(() => {
                        const matchChallenges = challenges.filter(
                          (c) => c.match_id === m.id && (c.status === "active" || c.status === "pending")
                        );
                        if (matchChallenges.length === 0) return null;
                        return matchChallenges.map((c) => (
                          <div key={c.id} style={{ borderTop: "1px solid var(--border-medium)", padding: "10px 14px", background: "var(--bg-page)", display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 14 }}>⚡</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{c.title}</div>
                              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                                {c.status === "pending" && c.receiver_id === myId ? "Waiting for your response" : c.status === "pending" ? "Waiting for response…" : "In progress"}
                              </div>
                            </div>
                            {c.status === "pending" && c.receiver_id === myId && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => respondToChallenge(c.id, true)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: "#f59e0b", color: "#000", fontWeight: 700, cursor: "pointer" }}>Accept</button>
                                <button onClick={() => respondToChallenge(c.id, false)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-faint)", cursor: "pointer" }}>✕</button>
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                      {/* Buddy sessions strip */}
                      {(() => {
                        const matchSessions = buddySessions.filter((s) => s.match_id === m.id);
                        if (matchSessions.length === 0) return null;
                        return matchSessions.map((s) => (
                          <div key={s.id} style={{ borderTop: "1px solid var(--border-medium)", padding: "10px 14px", background: "var(--bg-page)", display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 14 }}>📅</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>{s.sport} session · {s.session_date}{s.session_time ? ` @ ${s.session_time}` : ""}</div>
                              {s.location && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>📍 {s.location}</div>}
                              <div style={{ fontSize: 11, color: "var(--text-ultra-faint)", marginTop: 1 }}>{s.status === "pending" && s.receiver_id === myId ? "Waiting for your response" : s.status === "pending" ? "Waiting for response…" : "✓ Confirmed"}</div>
                            </div>
                            {s.status === "pending" && s.receiver_id === myId && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => respondToSession(s.id, true)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: "#22c55e", color: "#000", fontWeight: 700, cursor: "pointer" }}>Accept</button>
                                <button onClick={() => respondToSession(s.id, false)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-faint)", cursor: "pointer" }}>✕</button>
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                      {/* Activity strip */}
                      <div style={{ borderTop: "1px solid var(--border-medium)", padding: "10px 14px", display: "flex", gap: 16, alignItems: "center" }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 15, fontWeight: 900, color: (st?.workouts7d ?? 0) >= 3 ? "var(--success)" : "var(--text-muted)" }}>{st?.workouts7d ?? 0}</div>
                          <div style={{ fontSize: 10, color: "var(--text-ultra-faint)", fontWeight: 600 }}>THIS WEEK</div>
                        </div>
                        <div style={{ width: 1, height: 28, background: "var(--bg-input)" }} />
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 15, fontWeight: 900, color: streak > 0 ? "var(--accent)" : "var(--text-faint)" }}>🔥 {streak}</div>
                          <div style={{ fontSize: 10, color: "var(--text-ultra-faint)", fontWeight: 600 }}>STREAK</div>
                        </div>
                        <div style={{ width: 1, height: 28, background: "var(--bg-input)" }} />
                        <div style={{ flex: 1 }}>
                          {st?.lastExercise
                            ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Last: <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{st.lastExercise}</span></div>
                            : <div style={{ fontSize: 12, color: "var(--text-ultra-faint)" }}>No workouts yet this week</div>}
                          {daysAgo !== null && <div style={{ fontSize: 11, color: "var(--text-ultra-faint)", marginTop: 2 }}>{daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Session Modal */}
      {schedulingMatch && (
        <div onClick={() => setSchedulingMatch(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto" }}>
            <h3 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>📅 Schedule with @{schedulingMatch.other_user.username}</h3>
            <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 20 }}>Propose a time to train together.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 }}>SPORT / ACTIVITY</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["Gym", "Running", "Cycling", "Swimming", "Boxing", "Yoga", "CrossFit", "HIIT", "Football", "Basketball", "Hiking"].map((s) => (
                    <button key={s} onClick={() => setSessionSport(s)} style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${sessionSport === s ? "#22c55e" : "var(--border-medium)"}`, background: sessionSport === s ? "#22c55e22" : "transparent", color: sessionSport === s ? "#22c55e" : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 }}>DATE</label>
                  <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)}
                    style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 }}>TIME (OPTIONAL)</label>
                  <input type="time" value={sessionTime} onChange={(e) => setSessionTime(e.target.value)}
                    style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 }}>LOCATION (OPTIONAL)</label>
                <input value={sessionLocation} onChange={(e) => setSessionLocation(e.target.value)} placeholder="e.g. City Gym, Central Park…"
                  style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 }}>NOTE (OPTIONAL)</label>
                <input value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} placeholder="Any extra details…"
                  style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, paddingBottom: 16 }}>
              <button onClick={() => setSchedulingMatch(null)} style={{ flex: 1, padding: 13, borderRadius: 12, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={proposeBuddySession} disabled={sendingSession || !sessionDate} style={{ flex: 2, padding: 13, borderRadius: 12, border: "none", background: sendingSession ? "#777" : "#22c55e", color: "#000", fontWeight: 800, fontSize: 15, cursor: "pointer", opacity: !sessionDate ? 0.5 : 1 }}>
                {sendingSession ? "Sending…" : "📅 Propose Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Challenge Modal */}
      {challengingMatch && (
        <div onClick={() => setChallengingMatch(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-card)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <h3 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>⚡ Challenge @{challengingMatch.other_user.username}</h3>
            <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 24 }}>Set a head-to-head fitness goal and see who wins.</p>

            {/* Type selector */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, display: "block", marginBottom: 8 }}>CHALLENGE TYPE</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["workout_count", "streak", "exercise"] as const).map((t) => (
                  <button key={t} onClick={() => setChallengeType(t)}
                    style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: `1px solid ${challengeType === t ? "#f59e0b" : "var(--bg-input)"}`, background: challengeType === t ? "#f59e0b22" : "transparent", color: challengeType === t ? "#f59e0b" : "var(--text-faint)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                    {t === "workout_count" ? "🏋️ Workouts" : t === "streak" ? "🔥 Streak" : "🎯 Exercise"}
                  </button>
                ))}
              </div>
            </div>

            {/* Target */}
            <div style={{ marginBottom: 18, display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, display: "block", marginBottom: 8 }}>
                  {challengeType === "streak" ? "TARGET DAYS" : "TARGET COUNT"}
                </label>
                <input type="number" min={1} max={100} value={challengeTarget} onChange={(e) => setChallengeTarget(Number(e.target.value))}
                  style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "10px 12px", color: "var(--text-primary)", fontSize: 16, fontWeight: 700 }} />
              </div>
              {challengeType !== "streak" && (
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, display: "block", marginBottom: 8 }}>DURATION (DAYS)</label>
                  <input type="number" min={1} max={30} value={challengeDays} onChange={(e) => setChallengeDays(Number(e.target.value))}
                    style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "10px 12px", color: "var(--text-primary)", fontSize: 16, fontWeight: 700 }} />
                </div>
              )}
            </div>

            {/* Exercise picker */}
            {challengeType === "exercise" && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, display: "block", marginBottom: 8 }}>EXERCISE TYPE</label>
                <select value={challengeExercise} onChange={(e) => setChallengeExercise(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14 }}>
                  {["Running", "Cycling", "Swimming", "CrossFit", "Powerlifting", "Yoga", "HIIT", "Boxing", "Calisthenics"].map((ex) => (
                    <option key={ex}>{ex}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Preview */}
            <div style={{ background: "var(--bg-page)", borderRadius: 12, padding: 14, marginBottom: 20, border: "1px solid #f59e0b33" }}>
              <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>
                {challengeType === "workout_count"
                  ? `Log ${challengeTarget} workouts in ${challengeDays} days`
                  : challengeType === "streak"
                  ? `Maintain a ${challengeTarget}-day streak`
                  : `Log ${challengeTarget} ${challengeExercise} sessions in ${challengeDays} days`}
              </div>
            </div>

            <button onClick={sendChallenge} disabled={sendingChallenge}
              style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: sendingChallenge ? "var(--text-faint)" : "#f59e0b", color: "#000", fontWeight: 800, fontSize: 16, cursor: sendingChallenge ? "not-allowed" : "pointer" }}>
              {sendingChallenge ? "Sending…" : "⚡ Send Challenge"}
            </button>
          </div>
        </div>
      )}

      {/* Safety Acknowledgment Modal — shown once before first match accept */}
      {safetyPendingAccept && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 28, maxWidth: 400, width: "100%" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>🛡️</div>
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 19, textAlign: "center", marginBottom: 8 }}>Safety First</h2>
            <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, textAlign: "center", marginBottom: 20 }}>
              Before you connect with other users, please acknowledge the following:
            </p>
            <div style={{ background: "#0f0f0f", border: "1px solid #222", borderRadius: 10, padding: "14px 16px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "FlexMatches does not conduct background checks on users",
                "Always meet for the first time in a public place",
                "Tell a friend or family member where you are going",
                "If you feel unsafe, leave immediately and contact emergency services",
                "You can report or block any user at any time",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "#FF4500", fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ color: "#bbb", fontSize: 13, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
            <p style={{ color: "#666", fontSize: 12, textAlign: "center", marginBottom: 20, lineHeight: 1.6 }}>
              By continuing, you confirm you have read our{" "}
              <a href="/safety" target="_blank" style={{ color: "#FF4500" }}>Safety Guidelines</a>{" "}
              and{" "}
              <a href="/terms" target="_blank" style={{ color: "#FF4500" }}>Terms of Service</a>.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setSafetyPendingAccept(null)}
                style={{ flex: 1, padding: "12px 0", background: "transparent", border: "1px solid #333", borderRadius: 10, color: "#888", fontSize: 14, cursor: "pointer", fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.setItem(SAFETY_KEY, "1");
                  setSafetyAcknowledged(true);
                  const id = safetyPendingAccept;
                  setSafetyPendingAccept(null);
                  doAccept(id, "accepted");
                }}
                style={{ flex: 2, padding: "12px 0", background: "#FF4500", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 800 }}
              >
                I Understand — Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, color = "var(--accent)" }: { name: string; color?: string }) {
  return (
    <div style={{ width: 44, height: 44, borderRadius: 22, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "var(--text-primary)", flexShrink: 0 }}>
      {name[0].toUpperCase()}
    </div>
  );
}

