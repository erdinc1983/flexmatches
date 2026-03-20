"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Community = {
  id: string;
  name: string;
  description: string | null;
  sport: string | null;
  city: string | null;
  avatar_emoji: string;
  creator_id: string;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
};

type Member = {
  user_id: string;
  username: string;
  avatar_url: string | null;
};

export default function CommunityDetailPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [tab, setTab] = useState<"feed" | "members">("feed");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, [communityId]);

  useEffect(() => {
    if (!communityId) return;
    const channel = supabase
      .channel(`community-${communityId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts", filter: `community_id=eq.${communityId}` },
        async (payload) => {
          const newPost = payload.new as any;
          const { data: u } = await supabase.from("users").select("username").eq("id", newPost.user_id).single();
          setPosts((prev) => [...prev, { ...newPost, username: u?.username ?? "?" }]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [communityId]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: comm }, { data: postsRaw }, { data: membersRaw }] = await Promise.all([
      supabase.from("communities").select("*").eq("id", communityId).single(),
      supabase.from("community_posts").select("id, content, created_at, user_id").eq("community_id", communityId).order("created_at", { ascending: true }),
      supabase.from("community_members").select("user_id").eq("community_id", communityId),
    ]);

    if (!comm) { router.replace("/app/communities"); return; }
    setCommunity(comm);

    const memberIds = (membersRaw ?? []).map((m: any) => m.user_id);
    setMemberCount(memberIds.length);
    setIsMember(memberIds.includes(user.id));

    // Fetch usernames for posts
    if (postsRaw && postsRaw.length > 0) {
      const uids = [...new Set(postsRaw.map((p: any) => p.user_id))];
      const { data: users } = await supabase.from("users").select("id, username").in("id", uids);
      const umap = Object.fromEntries((users ?? []).map((u: any) => [u.id, u.username]));
      setPosts(postsRaw.map((p: any) => ({ ...p, username: umap[p.user_id] ?? "?" })));
    }

    // Fetch member details
    if (memberIds.length > 0) {
      const { data: memberUsers } = await supabase.from("users").select("id, username, avatar_url").in("id", memberIds);
      setMembers((memberUsers ?? []).map((u: any) => ({ user_id: u.id, username: u.username, avatar_url: u.avatar_url })));
    }

    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }), 100);
  }

  async function joinOrLeave() {
    if (!userId || !communityId) return;
    if (isMember) {
      await supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", userId);
      setIsMember(false);
      setMemberCount((n) => n - 1);
    } else {
      await supabase.from("community_members").insert({ community_id: communityId, user_id: userId });
      setIsMember(true);
      setMemberCount((n) => n + 1);
    }
  }

  async function sendPost() {
    if (!postText.trim() || !userId || !isMember) return;
    setPosting(true);
    await supabase.from("community_posts").insert({ community_id: communityId, user_id: userId, content: postText.trim() });
    setPostText("");
    setPosting(false);
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!community) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0F0F0F" }}>

      {/* Header */}
      <div style={{ background: "#111", borderBottom: "1px solid #1a1a1a", padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <button onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}>←</button>
          <div style={{ fontSize: 28 }}>{community.avatar_emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "#fff", fontSize: 17 }}>{community.name}</div>
            <div style={{ fontSize: 12, color: "#555" }}>
              {community.sport && `${community.sport} · `}
              {community.city && `📍 ${community.city} · `}
              👥 {memberCount}
            </div>
          </div>
          <button onClick={joinOrLeave}
            style={{ padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: "pointer", background: isMember ? "transparent" : "#FF4500", border: isMember ? "1px solid #333" : "none", color: isMember ? "#555" : "#fff" }}>
            {isMember ? "Joined ✓" : "Join"}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#0f0f0f", borderRadius: 10, padding: 3 }}>
          {(["feed", "members"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: tab === t ? "#FF4500" : "transparent", color: tab === t ? "#fff" : "#555", fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>
              {t === "feed" ? "💬 Feed" : `👥 Members (${memberCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {tab === "feed" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {posts.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 60, color: "#555" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                <p style={{ fontWeight: 700, color: "#888" }}>No posts yet</p>
                <p style={{ fontSize: 13 }}>{isMember ? "Be the first to post!" : "Join to start posting."}</p>
              </div>
            )}
            {posts.map((p) => (
              <div key={p.id} style={{ background: "#1a1a1a", borderRadius: 14, padding: 14, border: "1px solid #2a2a2a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: "#FF4500", fontSize: 13 }}>@{p.username}</span>
                  <span style={{ fontSize: 11, color: "#555" }}>{timeAgo(p.created_at)}</span>
                </div>
                <p style={{ color: "#ccc", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{p.content}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Post input */}
          <div style={{ borderTop: "1px solid #1a1a1a", padding: "12px 16px", background: "#111", flexShrink: 0, paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
            {isMember ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input value={postText} onChange={(e) => setPostText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPost(); } }}
                  placeholder="Write something..."
                  style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none" }} />
                <button onClick={sendPost} disabled={!postText.trim() || posting}
                  style={{ padding: "11px 16px", borderRadius: 12, border: "none", background: postText.trim() ? "#FF4500" : "#1a1a1a", color: postText.trim() ? "#fff" : "#555", fontWeight: 700, fontSize: 13, cursor: postText.trim() ? "pointer" : "default" }}>
                  Post
                </button>
              </div>
            ) : (
              <button onClick={joinOrLeave}
                style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Join to post in this community
              </button>
            )}
          </div>
        </>
      )}

      {/* Members tab */}
      {tab === "members" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {members.map((m) => (
            <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#1a1a1a", borderRadius: 14, padding: "12px 14px", border: "1px solid #2a2a2a" }}>
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: 20, objectFit: "cover", border: "2px solid #2a2a2a" }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 20, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>
                  {m.username[0]?.toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>@{m.username}</div>
                {m.user_id === community.creator_id && (
                  <span style={{ fontSize: 10, color: "#FF4500", fontWeight: 700 }}>👑 Creator</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
