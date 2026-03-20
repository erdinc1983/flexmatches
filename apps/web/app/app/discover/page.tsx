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
  avatar_url: string | null;
  sports: string[] | null;
  gender: string | null;
  weight: number | null;
  target_weight: number | null;
};

const LEVEL_COLOR: Record<string, string> = {
  beginner: "#22c55e",
  intermediate: "#f59e0b",
  advanced: "#FF4500",
};

const SPORTS_LIST = ["Gym", "Running", "Cycling", "Swimming", "Football", "Basketball", "Tennis", "Boxing", "Yoga", "CrossFit", "Pilates", "Hiking"];
const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"];

export default function DiscoverPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>("");
  const [filterCity, setFilterCity] = useState("");
  const [filterSport, setFilterSport] = useState<string>("");

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    let result = users;
    if (filterLevel) result = result.filter((u) => u.fitness_level === filterLevel);
    if (filterCity.trim()) result = result.filter((u) => u.city?.toLowerCase().includes(filterCity.toLowerCase()));
    if (filterSport) result = result.filter((u) => u.sports?.includes(filterSport));
    setFiltered(result);
  }, [users, filterLevel, filterCity, filterSport]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: matches } = await supabase
      .from("matches").select("receiver_id").eq("sender_id", user.id).in("status", ["pending", "accepted"]);
    setSentRequests(new Set((matches ?? []).map((m: any) => m.receiver_id)));

    const { data } = await supabase
      .from("users")
      .select("id, username, full_name, bio, city, gym_name, fitness_level, age, avatar_url, sports, gender, weight, target_weight")
      .neq("id", user.id).limit(100);
    if (data) setUsers(data);
    setLoading(false);
  }

  async function sendRequest(receiverId: string) {
    if (!currentUserId) return;
    const { error } = await supabase
      .from("matches")
      .insert({ sender_id: currentUserId, receiver_id: receiverId, status: "pending" });
    if (!error) {
      setSentRequests((prev) => new Set([...prev, receiverId]));
      setSelectedUser(null);
    }
  }

  const activeFilterCount = [filterLevel, filterCity.trim(), filterSport].filter(Boolean).length;

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>Discover</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: activeFilterCount > 0 ? "#FF4500" : "#1a1a1a", border: `1px solid ${activeFilterCount > 0 ? "#FF4500" : "#2a2a2a"}`, borderRadius: 12, padding: "8px 14px", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          ⚡ Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 16, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* City */}
          <div>
            <label style={{ fontSize: 12, color: "#888", fontWeight: 600, display: "block", marginBottom: 6 }}>CITY</label>
            <input
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              placeholder="e.g. Istanbul"
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "9px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Fitness Level */}
          <div>
            <label style={{ fontSize: 12, color: "#888", fontWeight: 600, display: "block", marginBottom: 6 }}>FITNESS LEVEL</label>
            <div style={{ display: "flex", gap: 8 }}>
              {FITNESS_LEVELS.map((lvl) => (
                <button key={lvl} onClick={() => setFilterLevel(filterLevel === lvl ? "" : lvl)}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1px solid ${filterLevel === lvl ? LEVEL_COLOR[lvl] : "#2a2a2a"}`, background: filterLevel === lvl ? LEVEL_COLOR[lvl] + "22" : "transparent", color: filterLevel === lvl ? LEVEL_COLOR[lvl] : "#888", fontWeight: 600, fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Sport */}
          <div>
            <label style={{ fontSize: 12, color: "#888", fontWeight: 600, display: "block", marginBottom: 6 }}>SPORT</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SPORTS_LIST.map((s) => (
                <button key={s} onClick={() => setFilterSport(filterSport === s ? "" : s)}
                  style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${filterSport === s ? "#FF4500" : "#2a2a2a"}`, background: filterSport === s ? "#FF4500" : "transparent", color: filterSport === s ? "#fff" : "#888", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button onClick={() => { setFilterLevel(""); setFilterCity(""); setFilterSport(""); }}
              style={{ background: "transparent", border: "1px solid #333", borderRadius: 10, padding: "8px 0", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Count */}
      <div style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
        {filtered.length} {filtered.length === 1 ? "person" : "people"} {activeFilterCount > 0 ? "match your filters" : "near you"}
      </div>

      {/* User List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <div style={{ fontSize: 56 }}>🏋️</div>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 18, marginTop: 16 }}>No results</p>
          <p style={{ color: "#555", marginTop: 8 }}>Try adjusting your filters</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((user) => (
            <div key={user.id} style={{ background: "#1a1a1a", borderRadius: 16, padding: 16, border: "1px solid #2a2a2a", cursor: "pointer" }}
              onClick={() => setSelectedUser(user)}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" style={{ width: 46, height: 46, borderRadius: 23, objectFit: "cover", flexShrink: 0, border: "2px solid #2a2a2a" }} />
                ) : (
                  <div style={{ width: 46, height: 46, borderRadius: 23, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {user.username[0].toUpperCase()}
                  </div>
                )}
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
                  {user.sports && user.sports.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {user.sports.slice(0, 3).map((s) => (
                        <span key={s} style={{ fontSize: 10, color: "#FF4500", background: "#1a0800", borderRadius: 999, padding: "2px 8px", border: "1px solid #FF450033" }}>{s}</span>
                      ))}
                      {user.sports.length > 3 && <span style={{ fontSize: 10, color: "#555" }}>+{user.sports.length - 3}</span>}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); sendRequest(user.id); }}
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

      {/* Profile Detail Modal */}
      {selectedUser && (
        <div
          onClick={() => setSelectedUser(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", border: "1px solid #1a1a1a" }}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />

            {/* Avatar + Name */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              {selectedUser.avatar_url ? (
                <img src={selectedUser.avatar_url} alt="" style={{ width: 80, height: 80, borderRadius: 40, objectFit: "cover", border: "3px solid #FF4500", marginBottom: 12 }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: 40, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#fff", margin: "0 auto 12px" }}>
                  {selectedUser.username[0].toUpperCase()}
                </div>
              )}
              <div style={{ fontWeight: 800, color: "#fff", fontSize: 20 }}>@{selectedUser.username}</div>
              {selectedUser.full_name && <div style={{ color: "#888", fontSize: 15, marginTop: 2 }}>{selectedUser.full_name}</div>}
              {selectedUser.fitness_level && (
                <span style={{ fontSize: 12, color: LEVEL_COLOR[selectedUser.fitness_level], fontWeight: 700, background: "#1a1a1a", borderRadius: 999, padding: "4px 14px", border: `1px solid ${LEVEL_COLOR[selectedUser.fitness_level]}`, display: "inline-block", marginTop: 8, textTransform: "capitalize" }}>
                  {selectedUser.fitness_level}
                </span>
              )}
            </div>

            {/* Info chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              {selectedUser.city && <Chip>📍 {selectedUser.city}</Chip>}
              {selectedUser.age && <Chip>🎂 {selectedUser.age} yo</Chip>}
              {selectedUser.gender && <Chip>{selectedUser.gender}</Chip>}
              {selectedUser.gym_name && <Chip>🏋️ {selectedUser.gym_name}</Chip>}
            </div>

            {/* Weight */}
            {(selectedUser.weight || selectedUser.target_weight) && (
              <div style={{ background: "#1a1a1a", borderRadius: 14, padding: 14, border: "1px solid #2a2a2a", display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
                {selectedUser.weight && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#FF4500" }}>{selectedUser.weight}<span style={{ fontSize: 12, color: "#666" }}>kg</span></div>
                    <div style={{ fontSize: 11, color: "#666" }}>Current</div>
                  </div>
                )}
                {selectedUser.target_weight && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#FF4500" }}>{selectedUser.target_weight}<span style={{ fontSize: 12, color: "#666" }}>kg</span></div>
                    <div style={{ fontSize: 11, color: "#666" }}>Target</div>
                  </div>
                )}
              </div>
            )}

            {/* Bio */}
            {selectedUser.bio && (
              <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6, marginBottom: 16, textAlign: "center" }}>{selectedUser.bio}</p>
            )}

            {/* Sports */}
            {selectedUser.sports && selectedUser.sports.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 8 }}>SPORTS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedUser.sports.map((s) => (
                    <span key={s} style={{ fontSize: 13, color: "#FF4500", background: "#1a0800", borderRadius: 999, padding: "5px 12px", border: "1px solid #FF450033", fontWeight: 600 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Connect button */}
            <button
              onClick={() => sendRequest(selectedUser.id)}
              disabled={sentRequests.has(selectedUser.id)}
              style={{
                width: "100%", padding: 16, borderRadius: 14, border: "none",
                background: sentRequests.has(selectedUser.id) ? "#1a1a1a" : "#FF4500",
                color: sentRequests.has(selectedUser.id) ? "#555" : "#fff",
                fontWeight: 800, fontSize: 16, cursor: sentRequests.has(selectedUser.id) ? "default" : "pointer",
              }}
            >
              {sentRequests.has(selectedUser.id) ? "Request Sent ✓" : "Connect 💪"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 13, color: "#ccc", background: "#1a1a1a", borderRadius: 999, padding: "5px 12px", border: "1px solid #2a2a2a" }}>{children}</span>;
}

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
