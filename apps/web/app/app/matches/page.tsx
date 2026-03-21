"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { checkAndAwardMatchBadges, BADGE_MAP } from "../../../lib/badges";
import { sendPush } from "../../../lib/sendPush";

type MatchUser = { id: string; username: string; full_name: string | null; fitness_level: string | null; city: string | null; avatar_url: string | null; current_streak: number };
type Match = { id: string; status: string; sender_id: string; other_user: MatchUser };
type PartnerStats = { workouts7d: number; lastExercise: string | null; lastActive: string | null };
type LeaderEntry = { user_id: string; username: string; badge_count: number; badges: string[] };
type Challenge = {
  id: string; sender_id: string; receiver_id: string; match_id: string;
  title: string; target_type: string; target_value: number; target_exercise: string | null;
  duration_days: number; status: string; sender_progress: number; receiver_progress: number;
  deadline: string | null; created_at: string;
};

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
  // Challenge modal state
  const [challengingMatch, setChallengingMatch] = useState<Match | null>(null);
  const [challengeType, setChallengeType] = useState<"workout_count" | "streak" | "exercise">("workout_count");
  const [challengeTarget, setChallengeTarget] = useState(5);
  const [challengeExercise, setChallengeExercise] = useState("Running");
  const [challengeDays, setChallengeDays] = useState(7);
  const [sendingChallenge, setSendingChallenge] = useState(false);

  useEffect(() => { loadMatches(); }, []);

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyId(user.id);
    loadChallenges(user.id);

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
        .select("id, username, full_name, fitness_level, city, avatar_url, current_streak")
        .in("id", senderIds);
      const userMap = Object.fromEntries((senderUsers ?? []).map((u: any) => [u.id, u]));
      setPending(incomingRaw.map((m: any) => ({ id: m.id, status: m.status, sender_id: m.sender_id, other_user: userMap[m.sender_id] ?? { id: m.sender_id, username: "unknown", full_name: null, fitness_level: null, city: null } })));
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
        .select("id, username, full_name, fitness_level, city, avatar_url, current_streak")
        .in("id", otherIds);
      const userMap = Object.fromEntries((otherUsers ?? []).map((u: any) => [u.id, u]));
      setAccepted(acceptedRaw.map((m: any) => {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        return { id: m.id, status: m.status, sender_id: m.sender_id, other_user: userMap[otherId] ?? { id: otherId, username: "unknown", full_name: null, fitness_level: null, city: null } };
      }));
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
  }

  async function respond(matchId: string, status: "accepted" | "declined") {
    await supabase.from("matches").update({ status }).eq("id", matchId);
    if (status === "accepted") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        checkAndAwardMatchBadges(user.id);
        // Notify the sender that their request was accepted
        const match = pending.find((m) => m.id === matchId);
        if (match) sendPush(match.sender_id, "🤝 Match accepted!", "Your connect request was accepted. Start chatting!", `/app/chat/${matchId}`);
      }
    }
    await loadMatches();
  }

  async function disconnect(matchId: string) {
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

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: "20px 16px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5, marginBottom: 16 }}>Matches</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "#111", borderRadius: 12, padding: 4 }}>
        {(["matches", "leaderboard"] as const).map((t) => (
          <button key={t} onClick={() => switchTab(t)}
            style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: tab === t ? "#FF4500" : "transparent", color: tab === t ? "#fff" : "#666", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {t === "matches" ? "🤝 Matches" : "🏆 Leaderboard"}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {tab === "leaderboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lbLoading && <div style={{ textAlign: "center", color: "#555", paddingTop: 40 }}>Loading...</div>}
          {!lbLoading && leaderboard.length === 0 && (
            <div style={{ textAlign: "center", color: "#555", paddingTop: 40 }}>No badges earned yet. Be the first!</div>
          )}
          {leaderboard.map((entry, i) => (
            <div key={entry.user_id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#1a1a1a", borderRadius: 14, padding: "12px 16px", border: i < 3 ? "1px solid #FF450033" : "1px solid #2a2a2a" }}>
              <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>@{entry.username}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                  {entry.badges.map((key) => {
                    const b = BADGE_MAP[key as keyof typeof BADGE_MAP];
                    return b ? <span key={key} title={b.title} style={{ fontSize: 16 }}>{b.emoji}</span> : null;
                  })}
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#FF4500" }}>{entry.badge_count} {entry.badge_count === 1 ? "badge" : "badges"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Matches */}
      {tab === "matches" && (
        <div>
          {pending.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#888", marginBottom: 12 }}>
                REQUESTS <span style={{ color: "#FF4500" }}>{pending.length}</span>
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pending.map((m) => (
                  <div key={m.id} style={{ background: "#1a1a1a", borderRadius: 16, padding: 14, border: "1px solid #FF450033" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <Avatar name={m.other_user.username} />
                      <div>
                        <div style={{ fontWeight: 700, color: "#fff" }}>@{m.other_user.username}</div>
                        {m.other_user.city && <div style={{ fontSize: 12, color: "#666" }}>📍 {m.other_user.city}</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => respond(m.id, "declined")} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "1px solid #333", background: "transparent", color: "#666", fontWeight: 600, cursor: "pointer" }}>
                        Decline
                      </button>
                      <button onClick={() => respond(m.id, "accepted")} style={{ flex: 2, padding: "8px 0", borderRadius: 10, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                        ✓ Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#888", marginBottom: 12 }}>
              CONNECTIONS <span style={{ color: "#FF4500" }}>{accepted.length}</span>
            </h2>
            {accepted.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 60 }}>
                <div style={{ fontSize: 48 }}>🤝</div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 18, marginTop: 16 }}>No connections yet</p>
                <p style={{ color: "#555", marginTop: 8 }}>Go to Discover and connect!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {accepted.map((m) => {
                  const st = partnerStats[m.other_user.id];
                  const streak = m.other_user.current_streak ?? 0;
                  const daysAgo = st?.lastActive ? Math.floor((Date.now() - new Date(st.lastActive).getTime()) / 86400000) : null;
                  return (
                    <div key={m.id} style={{ background: "#1a1a1a", borderRadius: 16, border: "1px solid #2a2a2a", overflow: "hidden" }}>
                      {/* Top row */}
                      <div style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ position: "relative" }}>
                            {m.other_user.avatar_url
                              ? <img src={m.other_user.avatar_url} style={{ width: 44, height: 44, borderRadius: 22, objectFit: "cover", border: "2px solid #2a2a2a" }} />
                              : <Avatar name={m.other_user.username} color="#1f2937" />}
                            {unreadCounts[m.id] > 0 && (
                              <span style={{ position: "absolute", top: -4, right: -4, background: "#FF4500", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                                {unreadCounts[m.id]}
                              </span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#fff" }}>@{m.other_user.username}</div>
                            {m.other_user.full_name && <div style={{ fontSize: 12, color: "#888" }}>{m.other_user.full_name}</div>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => router.push(`/app/chat/${m.id}`)} style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "#FF4500", padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer" }}>
                            Message
                          </button>
                          <button onClick={() => setChallengingMatch(m)} style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", background: "transparent", padding: "6px 12px", borderRadius: 8, border: "1px solid #f59e0b44", cursor: "pointer" }} title="Send a challenge">
                            ⚡
                          </button>
                          <button onClick={() => disconnect(m.id)} style={{ fontSize: 12, fontWeight: 600, color: "#555", background: "transparent", padding: "6px 12px", borderRadius: 8, border: "1px solid #2a2a2a", cursor: "pointer" }}>
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
                          <div key={c.id} style={{ borderTop: "1px solid #252525", padding: "10px 14px", background: "#0f0f0f", display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 14 }}>⚡</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{c.title}</div>
                              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                                {c.status === "pending" && c.receiver_id === myId ? "Waiting for your response" : c.status === "pending" ? "Waiting for response…" : "In progress"}
                              </div>
                            </div>
                            {c.status === "pending" && c.receiver_id === myId && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => respondToChallenge(c.id, true)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: "#f59e0b", color: "#000", fontWeight: 700, cursor: "pointer" }}>Accept</button>
                                <button onClick={() => respondToChallenge(c.id, false)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid #333", background: "transparent", color: "#555", cursor: "pointer" }}>✕</button>
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                      {/* Activity strip */}
                      <div style={{ borderTop: "1px solid #252525", padding: "10px 14px", display: "flex", gap: 16, alignItems: "center" }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 15, fontWeight: 900, color: (st?.workouts7d ?? 0) >= 3 ? "#22c55e" : "#888" }}>{st?.workouts7d ?? 0}</div>
                          <div style={{ fontSize: 10, color: "#444", fontWeight: 600 }}>THIS WEEK</div>
                        </div>
                        <div style={{ width: 1, height: 28, background: "#2a2a2a" }} />
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 15, fontWeight: 900, color: streak > 0 ? "#FF4500" : "#555" }}>🔥 {streak}</div>
                          <div style={{ fontSize: 10, color: "#444", fontWeight: 600 }}>STREAK</div>
                        </div>
                        <div style={{ width: 1, height: 28, background: "#2a2a2a" }} />
                        <div style={{ flex: 1 }}>
                          {st?.lastExercise
                            ? <div style={{ fontSize: 12, color: "#888" }}>Last: <span style={{ color: "#ccc", fontWeight: 600 }}>{st.lastExercise}</span></div>
                            : <div style={{ fontSize: 12, color: "#444" }}>No workouts yet this week</div>}
                          {daysAgo !== null && <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`}</div>}
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

      {/* Challenge Modal */}
      {challengingMatch && (
        <div onClick={() => setChallengingMatch(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 60, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: 28, width: "100%", maxWidth: 480, border: "1px solid #222" }}>
            <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>⚡ Challenge @{challengingMatch.other_user.username}</h3>
            <p style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>Set a head-to-head fitness goal and see who wins.</p>

            {/* Type selector */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, color: "#888", fontWeight: 700, display: "block", marginBottom: 8 }}>CHALLENGE TYPE</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["workout_count", "streak", "exercise"] as const).map((t) => (
                  <button key={t} onClick={() => setChallengeType(t)}
                    style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: `1px solid ${challengeType === t ? "#f59e0b" : "#2a2a2a"}`, background: challengeType === t ? "#f59e0b22" : "transparent", color: challengeType === t ? "#f59e0b" : "#555", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                    {t === "workout_count" ? "🏋️ Workouts" : t === "streak" ? "🔥 Streak" : "🎯 Exercise"}
                  </button>
                ))}
              </div>
            </div>

            {/* Target */}
            <div style={{ marginBottom: 18, display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: "#888", fontWeight: 700, display: "block", marginBottom: 8 }}>
                  {challengeType === "streak" ? "TARGET DAYS" : "TARGET COUNT"}
                </label>
                <input type="number" min={1} max={100} value={challengeTarget} onChange={(e) => setChallengeTarget(Number(e.target.value))}
                  style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 16, fontWeight: 700 }} />
              </div>
              {challengeType !== "streak" && (
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "#888", fontWeight: 700, display: "block", marginBottom: 8 }}>DURATION (DAYS)</label>
                  <input type="number" min={1} max={30} value={challengeDays} onChange={(e) => setChallengeDays(Number(e.target.value))}
                    style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 16, fontWeight: 700 }} />
                </div>
              )}
            </div>

            {/* Exercise picker */}
            {challengeType === "exercise" && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, color: "#888", fontWeight: 700, display: "block", marginBottom: 8 }}>EXERCISE TYPE</label>
                <select value={challengeExercise} onChange={(e) => setChallengeExercise(e.target.value)}
                  style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 14 }}>
                  {["Running", "Cycling", "Swimming", "CrossFit", "Powerlifting", "Yoga", "HIIT", "Boxing", "Calisthenics"].map((ex) => (
                    <option key={ex}>{ex}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Preview */}
            <div style={{ background: "#0f0f0f", borderRadius: 12, padding: 14, marginBottom: 20, border: "1px solid #f59e0b33" }}>
              <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>
                {challengeType === "workout_count"
                  ? `Log ${challengeTarget} workouts in ${challengeDays} days`
                  : challengeType === "streak"
                  ? `Maintain a ${challengeTarget}-day streak`
                  : `Log ${challengeTarget} ${challengeExercise} sessions in ${challengeDays} days`}
              </div>
            </div>

            <button onClick={sendChallenge} disabled={sendingChallenge}
              style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: sendingChallenge ? "#555" : "#f59e0b", color: "#000", fontWeight: 800, fontSize: 16, cursor: sendingChallenge ? "not-allowed" : "pointer" }}>
              {sendingChallenge ? "Sending…" : "⚡ Send Challenge"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, color = "#FF4500" }: { name: string; color?: string }) {
  return (
    <div style={{ width: 44, height: 44, borderRadius: 22, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
      {name[0].toUpperCase()}
    </div>
  );
}

