"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const SPORTS = ["Gym", "Running", "Cycling", "Swimming", "Football", "Basketball", "Tennis", "Boxing", "Yoga", "CrossFit", "Pilates", "Hiking", "Other"];
const EMOJIS = ["🏋️", "🏃", "🚴", "🏊", "⚽", "🏀", "🎾", "🥊", "🧘", "💪", "🎯", "🏔️", "🌍", "🔥", "⚡", "🦁"];

type Community = {
  id: string;
  name: string;
  description: string | null;
  sport: string | null;
  city: string | null;
  avatar_emoji: string;
  creator_id: string;
  member_count: number;
  is_member: boolean;
};

export default function CommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterSport, setFilterSport] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSport, setFormSport] = useState("Gym");
  const [formCity, setFormCity] = useState("");
  const [formEmoji, setFormEmoji] = useState("🏋️");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: comms } = await supabase
      .from("communities")
      .select("id, name, description, sport, city, avatar_emoji, creator_id")
      .order("created_at", { ascending: false });

    const { data: memberships } = await supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", user.id);

    const joinedIds = new Set((memberships ?? []).map((m: any) => m.community_id));

    // Fetch member counts
    const ids = (comms ?? []).map((c: any) => c.id);
    let countMap: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: counts } = await supabase
        .from("community_members")
        .select("community_id")
        .in("community_id", ids);
      for (const row of counts ?? []) {
        countMap[row.community_id] = (countMap[row.community_id] ?? 0) + 1;
      }
    }

    setCommunities((comms ?? []).map((c: any) => ({
      ...c,
      member_count: countMap[c.id] ?? 0,
      is_member: joinedIds.has(c.id),
    })));
    setLoading(false);
  }

  async function joinOrLeave(communityId: string, isMember: boolean) {
    if (!userId) return;
    if (isMember) {
      await supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", userId);
    } else {
      await supabase.from("community_members").insert({ community_id: communityId, user_id: userId });
    }
    setCommunities((prev) => prev.map((c) =>
      c.id === communityId
        ? { ...c, is_member: !isMember, member_count: isMember ? c.member_count - 1 : c.member_count + 1 }
        : c
    ));
  }

  async function createCommunity() {
    if (!userId || !formName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("communities").insert({
      name: formName.trim(),
      description: formDesc.trim() || null,
      sport: formSport,
      city: formCity.trim() || null,
      creator_id: userId,
      avatar_emoji: formEmoji,
    }).select().single();

    if (!error && data) {
      // Auto-join as creator
      await supabase.from("community_members").insert({ community_id: data.id, user_id: userId });
      setShowCreate(false);
      setFormName(""); setFormDesc(""); setFormSport("Gym"); setFormCity(""); setFormEmoji("🏋️");
      setSaving(false);
      router.push(`/app/communities/${data.id}`);
    } else {
      setSaving(false);
    }
  }

  const filtered = communities.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q) || c.sport?.toLowerCase().includes(q);
    const matchSport = !filterSport || c.sport === filterSport;
    return matchSearch && matchSport;
  });

  const myGroups = filtered.filter((c) => c.is_member);
  const discover = filtered.filter((c) => !c.is_member);

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.5, margin: 0 }}>Communities</h1>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Find your tribe</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ background: "var(--accent)", border: "none", color: "var(--text-primary)", fontWeight: 700, fontSize: 13, borderRadius: 12, padding: "10px 16px", cursor: "pointer" }}>
          + Create
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "var(--text-faint)" }}>🔍</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search communities..."
          style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: "10px 12px 10px 34px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
      </div>

      {/* Sport filter */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 20, scrollbarWidth: "none" }}>
        {["", ...SPORTS].map((s) => (
          <button key={s} onClick={() => setFilterSport(s)}
            style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 999, fontWeight: 700, fontSize: 11, border: `1px solid ${filterSport === s ? "var(--accent)" : "var(--bg-input)"}`, background: filterSport === s ? "var(--accent)" : "transparent", color: filterSport === s ? "var(--text-primary)" : "var(--text-faint)", cursor: "pointer", whiteSpace: "nowrap" }}>
            {s || "All Sports"}
          </button>
        ))}
      </div>

      {/* My Groups */}
      {myGroups.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>MY GROUPS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myGroups.map((c) => <CommunityCard key={c.id} community={c} onOpen={() => router.push(`/app/communities/${c.id}`)} onJoinLeave={joinOrLeave} />)}
          </div>
        </div>
      )}

      {/* Discover */}
      <div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>
          {myGroups.length > 0 ? "DISCOVER MORE" : "ALL COMMUNITIES"}
        </div>
        {discover.length === 0 && myGroups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏘️</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)", marginBottom: 8 }}>
              No communities yet
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Be the first to create a fitness group in your area.
              Connect with people who share your training style.
            </div>
            <button onClick={() => setShowCreate(true)} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              + Create First Community
            </button>
          </div>
        ) : discover.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 20 }}>
            <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 12 }}>No new communities to explore yet — or create your own!</p>
            <button onClick={() => setShowCreate(true)}
              style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              + Create Community
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {discover.map((c) => <CommunityCard key={c.id} community={c} onOpen={() => router.push(`/app/communities/${c.id}`)} onJoinLeave={joinOrLeave} />)}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div onClick={() => setShowCreate(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>Create Community</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Emoji picker */}
              <div>
                <label style={labelStyle}>ICON</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => setFormEmoji(e)}
                      style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${formEmoji === e ? "var(--accent)" : "var(--bg-input)"}`, background: formEmoji === e ? "#FF450022" : "var(--bg-card-alt)", fontSize: 20, cursor: "pointer" }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>NAME *</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Istanbul Runners"
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>DESCRIPTION</label>
                <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="What's this community about?"
                  rows={3} style={{ ...inputStyle, resize: "none" } as React.CSSProperties} />
              </div>

              <div>
                <label style={labelStyle}>SPORT</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SPORTS.map((s) => (
                    <button key={s} onClick={() => setFormSport(s)}
                      style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${formSport === s ? "var(--accent)" : "var(--bg-input)"}`, background: formSport === s ? "var(--accent)" : "transparent", color: formSport === s ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>CITY (OPTIONAL)</label>
                <input value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="e.g. Istanbul"
                  style={inputStyle} />
              </div>

              <div style={{ display: "flex", gap: 10, paddingBottom: 16 }}>
                <button onClick={() => setShowCreate(false)}
                  style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={createCommunity} disabled={saving || !formName.trim()}
                  style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: formName.trim() ? "var(--accent)" : "var(--bg-card-alt)", color: formName.trim() ? "var(--text-primary)" : "var(--text-faint)", fontWeight: 700, fontSize: 15, cursor: formName.trim() ? "pointer" : "default", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Creating..." : "Create Community 🌍"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommunityCard({ community, onOpen, onJoinLeave }: {
  community: Community;
  onOpen: () => void;
  onJoinLeave: (id: string, isMember: boolean) => void;
}) {
  return (
    <div style={{ background: "var(--bg-card-alt)", borderRadius: 16, padding: 16, border: `1px solid ${community.is_member ? "#FF450033" : "var(--bg-input)"}`, cursor: "pointer" }}
      onClick={onOpen}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0, border: "1px solid var(--border-medium)" }}>
          {community.avatar_emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15, marginBottom: 2 }}>{community.name}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {community.sport && <span style={{ fontSize: 11, color: "var(--accent)", background: "#1a0800", borderRadius: 999, padding: "2px 8px", border: "1px solid var(--accent-faint)" }}>{community.sport}</span>}
            {community.city && <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-page)", borderRadius: 999, padding: "2px 8px", border: "1px solid var(--border-medium)" }}>📍 {community.city}</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>👥 {community.member_count} {community.member_count === 1 ? "member" : "members"}</div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onJoinLeave(community.id, community.is_member); }}
          style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: "pointer",
            background: community.is_member ? "transparent" : "var(--accent)",
            border: community.is_member ? "1px solid var(--border-strong)" : "none",
            color: community.is_member ? "var(--text-faint)" : "var(--text-primary)",
          }}>
          {community.is_member ? "Joined ✓" : "Join"}
        </button>
      </div>
      {community.description && (
        <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 10, lineHeight: 1.5, margin: "10px 0 0" }}>{community.description}</p>
      )}
    </div>
  );
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
