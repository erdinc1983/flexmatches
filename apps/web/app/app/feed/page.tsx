"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";

const POST_TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  workout:   { emoji: "💪", label: "logged a workout",  color: "#FF4500" },
  goal:      { emoji: "🎯", label: "hit a goal",        color: "#22c55e" },
  badge:     { emoji: "🏅", label: "earned a badge",    color: "#FFD700" },
  match:     { emoji: "🤝", label: "made a match",      color: "#3b82f6" },
  event:     { emoji: "📅", label: "joined an event",   color: "#a855f7" },
  milestone: { emoji: "🔥", label: "reached a milestone", color: "#f97316" },
};

const KUDOS_EMOJIS = ["🔥", "💪", "🎉", "❤️", "⚡"];

type FeedPost = {
  id: string;
  user_id: string;
  post_type: string;
  content: string | null;
  meta: Record<string, any>;
  kudos_count: number;
  created_at: string;
  author: { full_name: string; avatar_url: string | null; current_streak: number };
  myReaction: string | null;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function FeedPage() {
  const [me, setMe] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeType, setComposeType] = useState("workout");
  const [composeContent, setComposeContent] = useState("");
  const [reactingId, setReactingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMe(user.id);

    // Get my matched friends
    const { data: matchData } = await supabase
      .from("matches")
      .select("user1_id,user2_id")
      .eq("status", "matched")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
    const friendIds = (matchData ?? []).map((m: any) =>
      m.user1_id === user.id ? m.user2_id : m.user1_id
    );
    const allIds = [user.id, ...friendIds];

    // Fetch feed posts from me + friends
    const { data: postsData } = await supabase
      .from("feed_posts")
      .select("id,user_id,post_type,content,meta,kudos_count,created_at")
      .in("user_id", allIds)
      .order("created_at", { ascending: false })
      .limit(40);

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // Fetch author profiles
    const authorIds = [...new Set(postsData.map((p: any) => p.user_id))];
    const { data: authorsData } = await supabase
      .from("users")
      .select("id,full_name,avatar_url,current_streak")
      .in("id", authorIds);
    const authorMap = Object.fromEntries((authorsData ?? []).map((a: any) => [a.id, a]));

    // Fetch my reactions
    const postIds = postsData.map((p: any) => p.id);
    const { data: reactionsData } = await supabase
      .from("feed_reactions")
      .select("post_id,emoji")
      .eq("user_id", user.id)
      .in("post_id", postIds);
    const reactionMap = Object.fromEntries((reactionsData ?? []).map((r: any) => [r.post_id, r.emoji]));

    setPosts(postsData.map((p: any) => ({
      ...p,
      author: authorMap[p.user_id] ?? { full_name: "Unknown", avatar_url: null, current_streak: 0 },
      myReaction: reactionMap[p.id] ?? null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function react(post: FeedPost, emoji: string) {
    if (!me || reactingId) return;
    setReactingId(post.id);

    if (post.myReaction === emoji) {
      // Remove reaction
      await supabase.from("feed_reactions").delete()
        .eq("post_id", post.id).eq("user_id", me);
      setPosts((prev) => prev.map((p) =>
        p.id === post.id ? { ...p, kudos_count: Math.max(p.kudos_count - 1, 0), myReaction: null } : p
      ));
    } else {
      if (post.myReaction) {
        // Update emoji
        await supabase.from("feed_reactions").update({ emoji })
          .eq("post_id", post.id).eq("user_id", me);
      } else {
        // New reaction
        await supabase.from("feed_reactions").insert({ post_id: post.id, user_id: me, emoji });
      }
      setPosts((prev) => prev.map((p) =>
        p.id === post.id
          ? { ...p, kudos_count: post.myReaction ? p.kudos_count : p.kudos_count + 1, myReaction: emoji }
          : p
      ));
    }
    setReactingId(null);
  }

  async function publishPost() {
    if (!me || !composeContent.trim()) return;
    setPosting(true);
    await supabase.from("feed_posts").insert({
      user_id: me,
      post_type: composeType,
      content: composeContent.trim(),
      meta: {},
    });
    setComposeContent("");
    setShowCompose(false);
    setPosting(false);
    load();
  }

  return (
    <div style={{ padding: "60px 16px 24px", minHeight: "100vh" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skel {
          background: linear-gradient(90deg, #1e1e1e 25%, #2a2a2a 50%, #1e1e1e 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 12px;
        }
        .emoji-btn:active { transform: scale(1.3); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Activity Feed</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "2px 0 0" }}>Your matches' latest activity</p>
        </div>
        <button onClick={() => setShowCompose(true)} style={{
          padding: "8px 16px", borderRadius: 99, border: "none",
          background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>
          + Post
        </button>
      </div>

      {/* Feed */}
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skel" style={{ height: 100, marginBottom: 12 }} />
        ))
      ) : posts.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 24px",
          background: "var(--bg-card)", borderRadius: 20, border: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
            Your feed is empty
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
            Connect with workout buddies to see their activity here
          </div>
          <button onClick={() => setShowCompose(true)} style={{
            padding: "10px 24px", borderRadius: 12, border: "none",
            background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>
            Share something first
          </button>
        </div>
      ) : (
        posts.map((post) => {
          const meta = POST_TYPE_META[post.post_type] ?? POST_TYPE_META.workout;
          const isMe = post.user_id === me;
          return (
            <div key={post.id} style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 16, padding: 16, marginBottom: 12,
            }}>
              {/* Author row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 20, flexShrink: 0,
                  background: "var(--accent)", overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 800, color: "#fff",
                }}>
                  {post.author.avatar_url
                    ? <img src={post.author.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (post.author.full_name?.[0] ?? "?").toUpperCase()
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                    {isMe ? "You" : post.author.full_name}
                    {" "}
                    <span style={{ color: meta.color, fontWeight: 600 }}>{meta.emoji} {meta.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                    {timeAgo(post.created_at)}
                    {post.author.current_streak > 0 && ` · 🔥 ${post.author.current_streak} day streak`}
                  </div>
                </div>
              </div>

              {/* Content */}
              {post.content && (
                <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, margin: "0 0 12px" }}>
                  {post.content}
                </p>
              )}

              {/* Kudos row */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                {KUDOS_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    className="emoji-btn"
                    onClick={() => react(post, emoji)}
                    disabled={!!reactingId}
                    style={{
                      background: post.myReaction === emoji ? `${meta.color}22` : "transparent",
                      border: `1px solid ${post.myReaction === emoji ? meta.color + "66" : "var(--border)"}`,
                      borderRadius: 99, padding: "4px 8px", fontSize: 14, cursor: "pointer",
                      transition: "all 0.15s", fontWeight: post.myReaction === emoji ? 800 : 400,
                    }}>
                    {emoji}
                  </button>
                ))}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>
                  <span>🔥</span>
                  <span>{post.kudos_count}</span>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Compose modal */}
      {showCompose && (
        <div onClick={() => setShowCompose(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 480 }}>
            <h3 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, marginBottom: 16 }}>Share Activity</h3>

            {/* Type selector */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
              {Object.entries(POST_TYPE_META).map(([key, val]) => (
                <button key={key} onClick={() => setComposeType(key)} style={{
                  flexShrink: 0, padding: "6px 12px", borderRadius: 99, border: "none",
                  background: composeType === key ? val.color : "var(--bg-card-alt)",
                  color: composeType === key ? "#fff" : "var(--text-muted)",
                  fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}>
                  {val.emoji} {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>

            <textarea
              value={composeContent}
              onChange={(e) => setComposeContent(e.target.value)}
              placeholder={`Share your ${composeType} update...`}
              rows={3}
              style={{
                width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)",
                borderRadius: 12, padding: 12, color: "var(--text-primary)", fontSize: 14,
                outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 14,
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowCompose(false)} style={{
                flex: 1, padding: 13, borderRadius: 12, border: "1px solid var(--border-medium)",
                background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer",
              }}>
                Cancel
              </button>
              <button onClick={publishPost} disabled={posting || !composeContent.trim()} style={{
                flex: 2, padding: 13, borderRadius: 12, border: "none",
                background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 15,
                cursor: "pointer", opacity: (posting || !composeContent.trim()) ? 0.5 : 1,
              }}>
                {posting ? "Posting..." : "Post 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
