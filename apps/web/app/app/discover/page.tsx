"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type User = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  city: string | null;
  gym_name: string | null;
  fitness_level: "beginner" | "intermediate" | "advanced" | null;
  age: number | null;
};

const LEVEL_COLOR: Record<string, string> = {
  beginner: "#22c55e",
  intermediate: "#f59e0b",
  advanced: "#FF4500",
};

export default function DiscoverPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: matches } = await supabase
      .from("matches").select("receiver_id").eq("sender_id", user.id).in("status", ["pending", "accepted"]);
    setSentRequests(new Set((matches ?? []).map((m: any) => m.receiver_id)));

    const { data } = await supabase
      .from("users")
      .select("id, username, full_name, bio, city, gym_name, fitness_level, age")
      .neq("id", user.id).limit(50);
    if (data) setUsers(data);
    setLoading(false);
  }

  async function sendRequest(receiverId: string) {
    if (!currentUserId) return;
    const { error } = await supabase
      .from("matches")
      .insert({ sender_id: currentUserId, receiver_id: receiverId, status: "pending" });
    if (!error) setSentRequests((prev) => new Set([...prev, receiverId]));
  }

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>Discover</h1>
        <span style={{ fontSize: 13, color: "#555" }}>{users.length} people</span>
      </div>

      {users.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <div style={{ fontSize: 56 }}>🏋️</div>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 18, marginTop: 16 }}>No one here yet</p>
          <p style={{ color: "#555", marginTop: 8 }}>Be the first to join!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {users.map((user) => (
            <div key={user.id} style={{ background: "#1a1a1a", borderRadius: 16, padding: 16, border: "1px solid #2a2a2a" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 46, height: 46, borderRadius: 23, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {user.username[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>@{user.username}</div>
                  {user.full_name && <div style={{ color: "#888", fontSize: 13 }}>{user.full_name}</div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {user.fitness_level && (
                      <span style={{ fontSize: 11, color: LEVEL_COLOR[user.fitness_level], fontWeight: 600, background: "#0f0f0f", borderRadius: 999, padding: "2px 8px", border: `1px solid ${LEVEL_COLOR[user.fitness_level]}` }}>
                        {user.fitness_level}
                      </span>
                    )}
                    {user.city && <span style={{ fontSize: 11, color: "#888", background: "#0f0f0f", borderRadius: 999, padding: "2px 8px", border: "1px solid #2a2a2a" }}>📍 {user.city}</span>}
                    {user.age && <span style={{ fontSize: 11, color: "#888", background: "#0f0f0f", borderRadius: 999, padding: "2px 8px", border: "1px solid #2a2a2a" }}>{user.age}y</span>}
                  </div>
                  {user.bio && <p style={{ color: "#666", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{user.bio}</p>}
                  {user.gym_name && <p style={{ color: "#555", fontSize: 12, marginTop: 4 }}>🏋️ {user.gym_name}</p>}
                </div>
                <button
                  onClick={() => sendRequest(user.id)}
                  disabled={sentRequests.has(user.id)}
                  style={{
                    background: sentRequests.has(user.id) ? "transparent" : "#FF4500",
                    border: sentRequests.has(user.id) ? "1px solid #333" : "none",
                    color: sentRequests.has(user.id) ? "#555" : "#fff",
                    borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13,
                    cursor: sentRequests.has(user.id) ? "default" : "pointer", flexShrink: 0,
                  }}
                >
                  {sentRequests.has(user.id) ? "Sent ✓" : "Connect"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
