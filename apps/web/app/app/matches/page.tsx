"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type MatchUser = { id: string; username: string; full_name: string | null; fitness_level: string | null; city: string | null };
type Match = { id: string; status: string; sender_id: string; other_user: MatchUser };

export default function MatchesPage() {
  const router = useRouter();
  const [pending, setPending] = useState<Match[]>([]);
  const [accepted, setAccepted] = useState<Match[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMatches(); }, []);

  async function loadMatches() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
        .select("id, username, full_name, fitness_level, city")
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
        .select("id, username, full_name, fitness_level, city")
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

    setLoading(false);
  }

  async function respond(matchId: string, status: "accepted" | "declined") {
    await supabase.from("matches").update({ status }).eq("id", matchId);
    await loadMatches();
  }

  async function disconnect(matchId: string) {
    await supabase.from("matches").delete().eq("id", matchId);
    await loadMatches();
  }

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5, marginBottom: 24 }}>Matches</h1>

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
            {accepted.map((m) => (
              <div key={m.id} style={{ background: "#1a1a1a", borderRadius: 16, padding: 14, border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ position: "relative" }}>
                    <Avatar name={m.other_user.username} color="#1f2937" />
                    {unreadCounts[m.id] > 0 && (
                      <span style={{ position: "absolute", top: -4, right: -4, background: "#FF4500", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                        {unreadCounts[m.id]}
                      </span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#fff" }}>@{m.other_user.username}</div>
                    {m.other_user.full_name && <div style={{ fontSize: 13, color: "#888" }}>{m.other_user.full_name}</div>}
                    {m.other_user.city && <div style={{ fontSize: 12, color: "#555" }}>📍 {m.other_user.city}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => router.push(`/app/chat/${m.id}`)} style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "#FF4500", padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer" }}>
                    Message
                  </button>
                  <button onClick={() => disconnect(m.id)} style={{ fontSize: 12, fontWeight: 600, color: "#555", background: "transparent", padding: "6px 12px", borderRadius: 8, border: "1px solid #2a2a2a", cursor: "pointer" }}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
