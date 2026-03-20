"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Privacy = { hide_age: boolean; hide_city: boolean; hide_weight: boolean };

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
  privacy_settings: Privacy | null;
  preferred_times: string[] | null;
  occupation: string | null;
  company: string | null;
  industry: string | null;
  distance_km?: number;
  matchScore?: number;
};

type MyProfile = {
  sports: string[] | null;
  fitness_level: string | null;
  preferred_times: string[] | null;
  industry: string | null;
};

const LEVEL_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

function calcMatchScore(me: MyProfile, other: User, distanceKm?: number): number {
  let score = 0;

  // Sports overlap: up to 30pts
  const mySports = me.sports ?? [];
  const otherSports = other.sports ?? [];
  if (mySports.length > 0 && otherSports.length > 0) {
    const overlap = mySports.filter((s) => otherSports.includes(s)).length;
    const maxPossible = Math.max(mySports.length, otherSports.length);
    score += Math.round((overlap / maxPossible) * 30);
  }

  // Fitness level: 20pts same, 10pts adjacent
  if (me.fitness_level && other.fitness_level) {
    const diff = Math.abs(LEVEL_ORDER[me.fitness_level] - LEVEL_ORDER[other.fitness_level]);
    if (diff === 0) score += 20;
    else if (diff === 1) score += 10;
  }

  // Preferred time overlap: up to 15pts
  const myTimes = me.preferred_times ?? [];
  const otherTimes = other.preferred_times ?? [];
  if (myTimes.length > 0 && otherTimes.length > 0) {
    const timeOverlap = myTimes.filter((t) => otherTimes.includes(t)).length;
    const maxTimes = Math.max(myTimes.length, otherTimes.length);
    score += Math.round((timeOverlap / maxTimes) * 15);
  }

  // Location: up to 20pts (only when distance is available)
  if (distanceKm != null) {
    if (distanceKm <= 2) score += 20;
    else if (distanceKm <= 5) score += 15;
    else if (distanceKm <= 10) score += 10;
    else if (distanceKm <= 20) score += 5;
  }

  // Industry match: 15pts
  if (me.industry && other.industry && me.industry === other.industry) score += 15;

  return Math.min(score, 100);
}

const RADIUS_OPTIONS = [3, 6, 15, 30]; // miles → converted to km for query

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
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  const [sortByScore, setSortByScore] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>("");
  const [filterCity, setFilterCity] = useState("");
  const [filterSport, setFilterSport] = useState<string>("");
  const [filterTime, setFilterTime] = useState<string>("");

  // Location
  const [nearMe, setNearMe] = useState(false);
  const [radius, setRadius] = useState(6); // miles
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    let result = users;
    if (filterLevel) result = result.filter((u) => u.fitness_level === filterLevel);
    if (filterCity.trim()) result = result.filter((u) => u.city?.toLowerCase().includes(filterCity.toLowerCase()));
    if (filterSport) result = result.filter((u) => u.sports?.includes(filterSport));
    if (filterTime) result = result.filter((u) => u.preferred_times?.includes(filterTime));
    if (sortByScore) result = [...result].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    setFiltered(result);
  }, [users, filterLevel, filterCity, filterSport, filterTime, sortByScore]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const [{ data: matches }, { data: me }, { data }] = await Promise.all([
      supabase.from("matches").select("receiver_id").eq("sender_id", user.id).in("status", ["pending", "accepted"]),
      supabase.from("users").select("sports, fitness_level, preferred_times, industry").eq("id", user.id).single(),
      supabase.from("users")
        .select("id, username, full_name, bio, city, gym_name, fitness_level, age, avatar_url, sports, gender, weight, target_weight, privacy_settings, preferred_times, occupation, company, industry")
        .neq("id", user.id).limit(100),
    ]);

    setSentRequests(new Set((matches ?? []).map((m: any) => m.receiver_id)));

    const profile: MyProfile = me ?? { sports: null, fitness_level: null, preferred_times: null, industry: null };
    setMyProfile(profile);

    if (data) {
      const withScores = data.map((u: User) => ({ ...u, matchScore: calcMatchScore(profile, u, u.distance_km) }));
      setUsers(withScores);
    }
    setLoading(false);
  }

  async function toggleNearMe() {
    if (nearMe) { setNearMe(false); return; }
    if (userLat && userLng) { setNearMe(true); loadNearby(userLat, userLng, radius); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLat(lat); setUserLng(lng);
        setNearMe(true);
        setLocating(false);
        loadNearby(lat, lng, radius);
      },
      () => { setLocating(false); alert("Could not get location. Please allow location access."); }
    );
  }

  async function loadNearby(lat: number, lng: number, miles: number) {
    if (!currentUserId) return;
    setLoading(true);
    const { data } = await supabase.rpc("nearby_users", {
      user_lat: lat, user_lng: lng, radius_km: miles * 1.60934, current_user_id: currentUserId,
    });
    // Convert distance_km → distance_mi for display
    const converted = ((data as any[]) ?? []).map((u) => ({ ...u, distance_km: u.distance_km / 1.60934 }));
    const profile = myProfile ?? { sports: null, fitness_level: null, preferred_times: null, industry: null };
    const withScores = converted.map((u: User) => ({ ...u, matchScore: calcMatchScore(profile, u, u.distance_km) }));
    setUsers(withScores as User[]);
    setLoading(false);
  }

  async function changeRadius(miles: number) {
    setRadius(miles);
    if (nearMe && userLat && userLng) loadNearby(userLat, userLng, miles);
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

  const activeFilterCount = [filterLevel, filterCity.trim(), filterSport, filterTime].filter(Boolean).length;

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>Discover</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setSortByScore(!sortByScore)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: sortByScore ? "#FF450022" : "#1a1a1a", border: `1px solid ${sortByScore ? "#FF4500" : "#2a2a2a"}`, borderRadius: 12, padding: "8px 12px", color: sortByScore ? "#FF4500" : "#888", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            🎯 Match
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: activeFilterCount > 0 ? "#FF4500" : "#1a1a1a", border: `1px solid ${activeFilterCount > 0 ? "#FF4500" : "#2a2a2a"}`, borderRadius: 12, padding: "8px 14px", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            ⚡ Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>
      </div>

      {/* Near Me bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={toggleNearMe} disabled={locating}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 12, border: `1px solid ${nearMe ? "#FF4500" : "#2a2a2a"}`, background: nearMe ? "#FF450022" : "#1a1a1a", color: nearMe ? "#FF4500" : "#888", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: locating ? 0.6 : 1 }}>
          📍 {locating ? "Locating..." : nearMe ? "Near Me ✓" : "Near Me"}
        </button>
        {nearMe && RADIUS_OPTIONS.map((mi) => (
          <button key={mi} onClick={() => changeRadius(mi)}
            style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${radius === mi ? "#FF4500" : "#2a2a2a"}`, background: radius === mi ? "#FF4500" : "transparent", color: radius === mi ? "#fff" : "#666", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {mi}mi
          </button>
        ))}
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

          {/* Training Time */}
          <div>
            <label style={{ fontSize: 12, color: "#888", fontWeight: 600, display: "block", marginBottom: 6 }}>TRAINING TIME</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ value: "morning", label: "🌅 Morning" }, { value: "afternoon", label: "☀️ Afternoon" }, { value: "evening", label: "🌙 Evening" }].map((t) => (
                <button key={t.value} onClick={() => setFilterTime(filterTime === t.value ? "" : t.value)}
                  style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: `1px solid ${filterTime === t.value ? "#FF4500" : "#2a2a2a"}`, background: filterTime === t.value ? "#FF450022" : "transparent", color: filterTime === t.value ? "#FF4500" : "#888", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button onClick={() => { setFilterLevel(""); setFilterCity(""); setFilterSport(""); setFilterTime(""); }}
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
        <EmptyState
          nearMe={nearMe}
          hasFilters={activeFilterCount > 0}
          hasUsers={users.length > 0}
          radius={radius}
          onClearFilters={() => { setFilterLevel(""); setFilterCity(""); setFilterSport(""); setFilterTime(""); }}
          onIncreaseRadius={() => { const bigger = RADIUS_OPTIONS.find(r => r > radius); if (bigger) changeRadius(bigger); }}
          maxRadius={radius >= Math.max(...RADIUS_OPTIONS)}
        />
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>@{user.username}</div>
                    {user.matchScore != null && user.matchScore > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: user.matchScore >= 70 ? "#22c55e" : user.matchScore >= 40 ? "#f59e0b" : "#888", background: "#0f0f0f", borderRadius: 999, padding: "2px 8px", border: `1px solid ${user.matchScore >= 70 ? "#22c55e44" : user.matchScore >= 40 ? "#f59e0b44" : "#333"}` }}>
                        {user.matchScore}% match
                      </span>
                    )}
                  </div>
                  {user.full_name && <div style={{ color: "#888", fontSize: 13 }}>{user.full_name}</div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {user.fitness_level && (
                      <span style={{ fontSize: 11, color: LEVEL_COLOR[user.fitness_level], fontWeight: 600, background: "#0f0f0f", borderRadius: 999, padding: "2px 8px", border: `1px solid ${LEVEL_COLOR[user.fitness_level]}` }}>
                        {user.fitness_level}
                      </span>
                    )}
                    {user.city && !user.privacy_settings?.hide_city && <span style={{ fontSize: 11, color: "#888", background: "#0f0f0f", borderRadius: 999, padding: "2px 8px", border: "1px solid #2a2a2a" }}>📍 {user.city}</span>}
                    {user.age && !user.privacy_settings?.hide_age && <span style={{ fontSize: 11, color: "#888", background: "#0f0f0f", borderRadius: 999, padding: "2px 8px", border: "1px solid #2a2a2a" }}>{user.age}y</span>}
                    {user.distance_km != null && <span style={{ fontSize: 11, color: "#FF4500", background: "#1a0800", borderRadius: 999, padding: "2px 8px", border: "1px solid #FF450033", fontWeight: 700 }}>{user.distance_km.toFixed(1)} mi</span>}
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
              {selectedUser.matchScore != null && selectedUser.matchScore > 0 && (
                <div style={{ marginTop: 10 }}>
                  <span style={{
                    fontSize: 15, fontWeight: 800,
                    color: selectedUser.matchScore >= 70 ? "#22c55e" : selectedUser.matchScore >= 40 ? "#f59e0b" : "#888",
                    background: "#1a1a1a", borderRadius: 999, padding: "6px 16px",
                    border: `1px solid ${selectedUser.matchScore >= 70 ? "#22c55e44" : selectedUser.matchScore >= 40 ? "#f59e0b44" : "#333"}`,
                    display: "inline-block",
                  }}>
                    🎯 {selectedUser.matchScore}% match
                  </span>
                </div>
              )}
              {selectedUser.fitness_level && (
                <span style={{ fontSize: 12, color: LEVEL_COLOR[selectedUser.fitness_level], fontWeight: 700, background: "#1a1a1a", borderRadius: 999, padding: "4px 14px", border: `1px solid ${LEVEL_COLOR[selectedUser.fitness_level]}`, display: "inline-block", marginTop: 8, textTransform: "capitalize" }}>
                  {selectedUser.fitness_level}
                </span>
              )}
            </div>

            {/* Info chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              {selectedUser.distance_km != null && <Chip>📍 {selectedUser.distance_km.toFixed(1)} mi away</Chip>}
              {selectedUser.city && !selectedUser.privacy_settings?.hide_city && <Chip>📍 {selectedUser.city}</Chip>}
              {selectedUser.age && !selectedUser.privacy_settings?.hide_age && <Chip>🎂 {selectedUser.age} yo</Chip>}
              {selectedUser.gender && <Chip>{selectedUser.gender}</Chip>}
              {selectedUser.gym_name && <Chip>🏋️ {selectedUser.gym_name}</Chip>}
            </div>

            {/* Weight */}
            {(selectedUser.weight || selectedUser.target_weight) && !selectedUser.privacy_settings?.hide_weight && (
              <div style={{ background: "#1a1a1a", borderRadius: 14, padding: 14, border: "1px solid #2a2a2a", display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
                {selectedUser.weight && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#FF4500" }}>{selectedUser.weight}<span style={{ fontSize: 12, color: "#666" }}>lbs</span></div>
                    <div style={{ fontSize: 11, color: "#666" }}>Current</div>
                  </div>
                )}
                {selectedUser.target_weight && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#FF4500" }}>{selectedUser.target_weight}<span style={{ fontSize: 12, color: "#666" }}>lbs</span></div>
                    <div style={{ fontSize: 11, color: "#666" }}>Target</div>
                  </div>
                )}
              </div>
            )}

            {/* Career */}
            {(selectedUser.occupation || selectedUser.company || selectedUser.industry) && (
              <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 12, border: "1px solid #2a2a2a", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selectedUser.occupation && <span style={{ fontSize: 13, color: "#ccc" }}>💼 {selectedUser.occupation}</span>}
                {selectedUser.company && <span style={{ fontSize: 13, color: "#888" }}>@ {selectedUser.company}</span>}
                {selectedUser.industry && <span style={{ fontSize: 12, color: "#555", background: "#111", borderRadius: 999, padding: "2px 10px", border: "1px solid #2a2a2a" }}>{selectedUser.industry}</span>}
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

            {/* Preferred Times */}
            {selectedUser.preferred_times && selectedUser.preferred_times.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 8 }}>TRAINS</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selectedUser.preferred_times.map((t) => {
                    const labels: Record<string, string> = { morning: "🌅 Morning", afternoon: "☀️ Afternoon", evening: "🌙 Evening" };
                    return <span key={t} style={{ fontSize: 13, color: "#FF4500", background: "#1a0800", borderRadius: 10, padding: "5px 12px", border: "1px solid #FF450033", fontWeight: 600 }}>{labels[t] ?? t}</span>;
                  })}
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

function EmptyState({ nearMe, hasFilters, hasUsers, radius, onClearFilters, onIncreaseRadius, maxRadius }: {
  nearMe: boolean; hasFilters: boolean; hasUsers: boolean; radius: number;
  onClearFilters: () => void; onIncreaseRadius: () => void; maxRadius: boolean;
}) {
  if (nearMe && !hasUsers) {
    return (
      <div style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: 52 }}>📍</div>
        <p style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginTop: 16 }}>No one nearby</p>
        <p style={{ color: "#555", fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
          No fitness buddies within {radius} miles yet.{!maxRadius ? " Try a bigger radius." : ""}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24, maxWidth: 280, margin: "24px auto 0" }}>
          {!maxRadius && (
            <button onClick={onIncreaseRadius}
              style={{ padding: "12px 0", borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Expand Radius
            </button>
          )}
          <a href="/app/profile" style={{ padding: "12px 0", borderRadius: 12, border: "1px solid #2a2a2a", background: "transparent", color: "#888", fontWeight: 600, fontSize: 14, cursor: "pointer", textDecoration: "none", display: "block" }}>
            Invite Friends →
          </a>
        </div>
      </div>
    );
  }

  if (hasFilters && !hasUsers) {
    return (
      <div style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: 52 }}>🔍</div>
        <p style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginTop: 16 }}>No one matches</p>
        <p style={{ color: "#555", fontSize: 14, marginTop: 8 }}>Try adjusting your filters.</p>
        <button onClick={onClearFilters}
          style={{ marginTop: 20, padding: "12px 28px", borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Clear Filters
        </button>
      </div>
    );
  }

  if (hasFilters) {
    return (
      <div style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: 52 }}>🔍</div>
        <p style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginTop: 16 }}>No matches for these filters</p>
        <p style={{ color: "#555", fontSize: 14, marginTop: 8 }}>Try broadening your search.</p>
        <button onClick={onClearFilters}
          style={{ marginTop: 20, padding: "12px 28px", borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Clear Filters
        </button>
      </div>
    );
  }

  // No users at all
  return (
    <div style={{ textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 52 }}>🚀</div>
      <p style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginTop: 16 }}>You're one of the first!</p>
      <p style={{ color: "#555", fontSize: 14, marginTop: 8, lineHeight: 1.6, maxWidth: 280, margin: "8px auto 0" }}>
        FlexMatches is just getting started. Invite friends to find your fitness buddy.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24, maxWidth: 280, margin: "24px auto 0" }}>
        <a href="/app/profile"
          style={{ padding: "13px 0", borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", textDecoration: "none", display: "block" }}>
          🔗 Share Your Profile
        </a>
        <p style={{ color: "#444", fontSize: 12, marginTop: 4 }}>Share your profile link and invite training partners</p>
      </div>
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
