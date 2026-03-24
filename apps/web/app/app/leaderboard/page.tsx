"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

const TIERS = [
  { key: "diamond",  label: "Diamond",  min: 500,  color: "#B9F2FF", glow: "#B9F2FF40", medal: "💎" },
  { key: "platinum", label: "Platinum", min: 200,  color: "#E5E4E2", glow: "#E5E4E240", medal: "🥇" },
  { key: "gold",     label: "Gold",     min: 100,  color: "#FFD700", glow: "#FFD70040", medal: "🥇" },
  { key: "silver",   label: "Silver",   min: 50,   color: "#C0C0C0", glow: "#C0C0C040", medal: "🥈" },
  { key: "bronze",   label: "Bronze",   min: 0,    color: "#CD7F32", glow: "#CD7F3240", medal: "🥉" },
];

function getTier(streak: number) {
  if (streak >= 500) return TIERS[0];
  if (streak >= 200) return TIERS[1];
  if (streak >= 100) return TIERS[2];
  if (streak >= 50)  return TIERS[3];
  return TIERS[4];
}

function nextTier(streak: number) {
  if (streak >= 200) return TIERS[0];
  if (streak >= 100) return TIERS[1];
  if (streak >= 50)  return TIERS[2];
  if (streak >= 0)   return TIERS[3];
  return TIERS[3];
}

type Leader = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  current_streak: number;
  total_kudos: number;
  city: string | null;
  sports: string[];
};

export default function LeaderboardPage() {
  const [me, setMe] = useState<Leader | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [tab, setTab] = useState<"global" | "friends">("global");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [tab]);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // My own stats
    const { data: myData } = await supabase
      .from("users")
      .select("id,full_name,avatar_url,current_streak,total_kudos,city,sports")
      .eq("id", user.id)
      .single();
    setMe(myData as Leader);

    if (tab === "global") {
      const { data } = await supabase
        .from("users")
        .select("id,full_name,avatar_url,current_streak,total_kudos,city,sports")
        .order("current_streak", { ascending: false })
        .limit(50);
      const list = (data as Leader[]) ?? [];
      setLeaders(list);
      const rank = list.findIndex((u) => u.id === user.id);
      setMyRank(rank >= 0 ? rank + 1 : null);
    } else {
      // Friends (matched users)
      const { data: matchData } = await supabase
        .from("matches")
        .select("sender_id,receiver_id")
        .eq("status", "accepted")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      const friendIds = (matchData ?? []).map((m: any) =>
        m.sender_id === user.id ? m.receiver_id : m.sender_id
      );
      friendIds.push(user.id);
      const { data } = await supabase
        .from("users")
        .select("id,full_name,avatar_url,current_streak,total_kudos,city,sports")
        .in("id", friendIds)
        .order("current_streak", { ascending: false });
      const list = (data as Leader[]) ?? [];
      setLeaders(list);
      const rank = list.findIndex((u) => u.id === user.id);
      setMyRank(rank >= 0 ? rank + 1 : null);
    }
    setLoading(false);
  }

  const myTier = me ? getTier(me.current_streak ?? 0) : TIERS[4];
  const next = me ? nextTier(me.current_streak ?? 0) : TIERS[3];
  const progress = me
    ? Math.min(((me.current_streak ?? 0) / next.min) * 100, 100)
    : 0;

  return (
    <div style={{ padding: "60px 16px 24px", minHeight: "100vh" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0px 0px transparent; }
          50% { box-shadow: 0 0 18px 4px ${myTier.glow}; }
        }
        .skel {
          background: linear-gradient(90deg, #1e1e1e 25%, #2a2a2a 50%, #1e1e1e 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 8px;
        }
      `}</style>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>Leaderboard</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>Top streaks in the community</p>

      {/* My tier card */}
      {me && (
        <div style={{
          background: "var(--bg-card)", border: `1px solid ${myTier.color}44`,
          borderRadius: 16, padding: 16, marginBottom: 20,
          animation: "pulse-glow 3s ease-in-out infinite",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 26,
              background: `linear-gradient(135deg, ${myTier.color}33, ${myTier.color}11)`,
              border: `2px solid ${myTier.color}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            }}>
              {myTier.medal}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: myTier.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                {myTier.label} Tier
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
                {me.current_streak ?? 0} day streak
              </div>
              {myRank && (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  #{myRank} {tab === "global" ? "globally" : "among friends"}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 2 }}>Kudos received</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: myTier.color }}>🔥 {me.total_kudos ?? 0}</div>
            </div>
          </div>

          {/* Progress to next tier */}
          {myTier.key !== "diamond" && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>
                <span>{myTier.label}</span>
                <span>{me.current_streak ?? 0} / {next.min} days → {next.label}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "#2a2a2a", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  background: `linear-gradient(90deg, ${myTier.color}, ${next.color})`,
                  width: `${progress}%`, transition: "width 0.6s ease",
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tier legend */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {TIERS.slice().reverse().map((t) => (
          <div key={t.key} style={{
            flex: "0 0 auto",
            display: "flex", alignItems: "center", gap: 4,
            background: "var(--bg-card)", border: `1px solid ${t.color}44`,
            borderRadius: 20, padding: "4px 10px", fontSize: 11, color: t.color, fontWeight: 600,
          }}>
            {t.medal} {t.label}
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["global", "friends"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "9px 0", borderRadius: 10, border: "none",
            background: tab === t ? "var(--accent)" : "var(--bg-card)",
            color: tab === t ? "#fff" : "var(--text-muted)",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
            {t === "global" ? "🌍 Global" : "🤝 Friends"}
          </button>
        ))}
      </div>

      {/* Leaderboard list */}
      {loading ? (
        Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skel" style={{ height: 64, marginBottom: 8 }} />
        ))
      ) : leaders.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 14 }}>
          {tab === "friends" ? "Connect with people to see their streaks!" : "No users yet."}
        </div>
      ) : (
        leaders.map((user, i) => {
          const tier = getTier(user.current_streak ?? 0);
          const isMe = me?.id === user.id;
          return (
            <div key={user.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: isMe ? `${tier.color}11` : "var(--bg-card)",
              border: `1px solid ${isMe ? tier.color + "44" : "var(--border)"}`,
              borderRadius: 12, padding: "10px 14px", marginBottom: 8,
            }}>
              {/* Rank */}
              <div style={{
                width: 28, textAlign: "center", fontWeight: 800, fontSize: 14,
                color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "var(--text-faint)",
              }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </div>

              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: 20,
                background: `linear-gradient(135deg, ${tier.color}44, ${tier.color}11)`,
                border: `2px solid ${tier.color}66`,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0,
              }}>
                {user.avatar_url
                  ? <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 18 }}>{tier.medal}</span>
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 4 }}>
                  {user.full_name || "User"}
                  {isMe && <span style={{ fontSize: 10, color: tier.color, fontWeight: 600 }}>(you)</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                  {tier.medal} {tier.label}
                  {user.city ? ` · ${user.city}` : ""}
                </div>
              </div>

              {/* Streak */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: tier.color }}>
                  🔥 {user.current_streak ?? 0}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-faint)" }}>day streak</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
