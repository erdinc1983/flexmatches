"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

// Activity post stored as: ACTIVITY::{activity}::{when}::{where}::{note}
const ACTIVITY_PREFIX = "ACTIVITY::";

function isActivityPost(content: string) { return content.startsWith(ACTIVITY_PREFIX); }

function parseActivityPost(content: string) {
  const parts = content.slice(ACTIVITY_PREFIX.length).split("::");
  return { activity: parts[0] ?? "", when: parts[1] ?? "", where: parts[2] ?? "", note: parts[3] ?? "" };
}

function formatActivityPost(activity: string, when: string, where: string, note: string) {
  return `${ACTIVITY_PREFIX}${activity}::${when}::${where}::${note}`;
}

const ACTIVITY_EMOJI: Record<string, string> = {
  Gym: "🏋️", CrossFit: "💪", Pilates: "🧘", Yoga: "🧘",
  Running: "🏃", Cycling: "🚴", Swimming: "🏊", Football: "⚽",
  Basketball: "🏀", Tennis: "🎾", Boxing: "🥊",
  Chess: "♟️", Backgammon: "🎲", "Board Games": "🎯",
  Hiking: "🏔️", Climbing: "🧗", Kayaking: "🛶",
};

const ALL_ACTIVITIES = ["Gym", "CrossFit", "Pilates", "Yoga", "Running", "Cycling", "Swimming", "Football", "Basketball", "Tennis", "Boxing", "Chess", "Backgammon", "Board Games", "Hiking", "Climbing", "Kayaking"];

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
  is_pinned: boolean;
};

type Member = {
  user_id: string;
  username: string;
  avatar_url: string | null;
};

type Poll = {
  id: string;
  question: string;
  options: string[];
  ends_at: string | null;
  created_at: string;
  user_id: string;
  username?: string;
  votes: { option_index: number; count: number }[];
  myVote: number | null;
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
  const [tab, setTab] = useState<"board" | "polls" | "members">("board");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Post compose mode
  const [composeMode, setComposeMode] = useState<"chat" | "activity">("chat");
  const [activityType, setActivityType] = useState("Gym");
  const [activityWhen, setActivityWhen] = useState("");
  const [activityWhere, setActivityWhere] = useState("");
  const [activityNote, setActivityNote] = useState("");

  // Pin
  const [pinningId, setPinningId] = useState<string | null>(null);

  // Reactions: postId → emoji → count
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [myReactions, setMyReactions] = useState<Record<string, string>>({});

  // Polls
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDays, setPollDays] = useState("3");
  const [creatingPoll, setCreatingPoll] = useState(false);

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
      supabase.from("community_posts").select("id, content, created_at, user_id, is_pinned").eq("community_id", communityId).order("created_at", { ascending: true }),
      supabase.from("community_members").select("user_id").eq("community_id", communityId),
    ]);

    if (!comm) { router.replace("/app/communities"); return; }
    setCommunity(comm);

    // Set default activity type to community's sport
    if (comm.sport && ALL_ACTIVITIES.includes(comm.sport)) {
      setActivityType(comm.sport);
    }

    const memberIds = (membersRaw ?? []).map((m: any) => m.user_id);
    setMemberCount(memberIds.length);
    setIsMember(memberIds.includes(user.id));

    if (postsRaw && postsRaw.length > 0) {
      const uids = [...new Set(postsRaw.map((p: any) => p.user_id))];
      const { data: users } = await supabase.from("users").select("id, username").in("id", uids);
      const umap = Object.fromEntries((users ?? []).map((u: any) => [u.id, u.username]));
      setPosts(postsRaw.map((p: any) => ({ ...p, username: umap[p.user_id] ?? "?", is_pinned: p.is_pinned ?? false })));
    }

    if (memberIds.length > 0) {
      const { data: memberUsers } = await supabase.from("users").select("id, username, avatar_url").in("id", memberIds);
      setMembers((memberUsers ?? []).map((u: any) => ({ user_id: u.id, username: u.username, avatar_url: u.avatar_url })));
    }

    if (postsRaw && postsRaw.length > 0) {
      const postIds = postsRaw.map((p: any) => p.id);
      const { data: reactRows } = await supabase.from("post_reactions").select("post_id, emoji, user_id").in("post_id", postIds);
      const rMap: Record<string, Record<string, number>> = {};
      const myMap: Record<string, string> = {};
      for (const r of reactRows ?? []) {
        if (!rMap[r.post_id]) rMap[r.post_id] = {};
        rMap[r.post_id][r.emoji] = (rMap[r.post_id][r.emoji] ?? 0) + 1;
        if (r.user_id === user.id) myMap[r.post_id] = r.emoji;
      }
      setReactions(rMap);
      setMyReactions(myMap);
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
    if (!userId || !isMember) return;
    let content = "";
    if (composeMode === "activity") {
      if (!activityWhen.trim()) return;
      content = formatActivityPost(activityType, activityWhen.trim(), activityWhere.trim(), activityNote.trim());
    } else {
      if (!postText.trim()) return;
      content = postText.trim();
    }
    setPosting(true);
    await supabase.from("community_posts").insert({ community_id: communityId, user_id: userId, content });
    setPostText("");
    setActivityWhen(""); setActivityWhere(""); setActivityNote("");
    setPosting(false);
  }

  async function pinPost(postId: string, currentlyPinned: boolean) {
    if (!userId || community?.creator_id !== userId) return;
    setPinningId(postId);
    if (!currentlyPinned) {
      await supabase.from("community_posts").update({ is_pinned: false }).eq("community_id", communityId);
      await supabase.from("community_posts").update({ is_pinned: true }).eq("id", postId);
      setPosts((prev) => prev.map((p) => ({ ...p, is_pinned: p.id === postId })));
    } else {
      await supabase.from("community_posts").update({ is_pinned: false }).eq("id", postId);
      setPosts((prev) => prev.map((p) => ({ ...p, is_pinned: false })));
    }
    setPinningId(null);
  }

  async function toggleReaction(postId: string, emoji: string) {
    if (!userId || !isMember) return;
    const current = myReactions[postId];
    if (current === emoji) {
      await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", userId);
      setMyReactions((prev) => { const n = { ...prev }; delete n[postId]; return n; });
      setReactions((prev) => {
        const n = { ...prev };
        if (n[postId]?.[emoji]) { n[postId] = { ...n[postId], [emoji]: Math.max(0, n[postId][emoji] - 1) }; }
        return n;
      });
    } else {
      await supabase.from("post_reactions").upsert({ post_id: postId, user_id: userId, emoji }, { onConflict: "post_id,user_id" });
      setMyReactions((prev) => ({ ...prev, [postId]: emoji }));
      setReactions((prev) => {
        const n = { ...prev, [postId]: { ...(prev[postId] ?? {}) } };
        if (current) n[postId][current] = Math.max(0, (n[postId][current] ?? 1) - 1);
        n[postId][emoji] = (n[postId][emoji] ?? 0) + 1;
        return n;
      });
    }
  }

  async function loadPolls() {
    if (!userId) return;
    const { data: pollRows } = await supabase
      .from("community_polls").select("*")
      .eq("community_id", communityId).order("created_at", { ascending: false });
    if (!pollRows || pollRows.length === 0) { setPolls([]); return; }

    const pollIds = pollRows.map((p: any) => p.id);
    const creatorIds = [...new Set(pollRows.map((p: any) => p.user_id))];
    const [{ data: votesRaw }, { data: creatorUsers }] = await Promise.all([
      supabase.from("community_poll_votes").select("poll_id, option_index, user_id").in("poll_id", pollIds),
      supabase.from("users").select("id, username").in("id", creatorIds),
    ]);
    const umap = Object.fromEntries((creatorUsers ?? []).map((u: any) => [u.id, u.username]));
    const votes = votesRaw ?? [];

    setPolls(pollRows.map((p: any) => {
      const pVotes = votes.filter((v: any) => v.poll_id === p.id);
      const counts = (p.options as string[]).map((_: string, i: number) => ({
        option_index: i,
        count: pVotes.filter((v: any) => v.option_index === i).length,
      }));
      const myVote = pVotes.find((v: any) => v.user_id === userId)?.option_index ?? null;
      return { ...p, username: umap[p.user_id] ?? "?", votes: counts, myVote };
    }));
  }

  async function createPoll() {
    if (!userId || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
    setCreatingPoll(true);
    const validOptions = pollOptions.filter(o => o.trim());
    const endsAt = pollDays ? new Date(Date.now() + parseInt(pollDays) * 86400000).toISOString() : null;
    await supabase.from("community_polls").insert({
      community_id: communityId, user_id: userId,
      question: pollQuestion.trim(), options: validOptions, ends_at: endsAt,
    });
    setPollQuestion(""); setPollOptions(["", ""]); setPollDays("3");
    setShowPollForm(false);
    setCreatingPoll(false);
    loadPolls();
  }

  async function votePoll(pollId: string, optionIndex: number) {
    if (!userId) return;
    await supabase.from("community_poll_votes").insert({ poll_id: pollId, user_id: userId, option_index: optionIndex });
    loadPolls();
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
      <div style={{ width: 32, height: 32, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!community) return null;

  // Sort posts: pinned first, then chronological
  const sortedPosts = [...posts].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

  const canPost = composeMode === "activity" ? !!activityWhen.trim() : !!postText.trim();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-page)" }}>

      {/* Header */}
      <div style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)", padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <button onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}>←</button>
          <div style={{ fontSize: 28 }}>{community.avatar_emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 17 }}>{community.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
              {community.sport && `${community.sport} · `}
              {community.city && `📍 ${community.city} · `}
              👥 {memberCount}
            </div>
          </div>
          <button onClick={joinOrLeave}
            style={{ padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: "pointer", background: isMember ? "transparent" : "var(--accent)", border: isMember ? "1px solid var(--border-strong)" : "none", color: isMember ? "var(--text-faint)" : "#fff" }}>
            {isMember ? "Joined ✓" : "Join"}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--bg-page)", borderRadius: 10, padding: 3 }}>
          {(["board", "polls", "members"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); if (t === "polls") loadPolls(); }}
              style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: tab === t ? "var(--accent)" : "transparent", color: tab === t ? "#fff" : "var(--text-faint)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
              {t === "board" ? "📋 Board" : t === "polls" ? "📊 Polls" : `👥 ${memberCount}`}
            </button>
          ))}
        </div>
      </div>

      {/* Board Tab */}
      {tab === "board" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {posts.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 60, color: "var(--text-faint)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <p style={{ fontWeight: 700, color: "var(--text-muted)" }}>No posts yet</p>
                <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                  {isMember
                    ? "Post an activity invite — anyone up for something?"
                    : "Join to post activity invites and chat."}
                </p>
              </div>
            )}

            {sortedPosts.map((p) => {
              if (isActivityPost(p.content)) {
                const { activity, when, where, note } = parseActivityPost(p.content);
                const rsvpCount = reactions[p.id]?.["✅"] ?? 0;
                const iAmIn = myReactions[p.id] === "✅";
                return (
                  <div key={p.id} style={{ background: p.is_pinned ? "#0d1a0d" : "var(--bg-card-alt)", borderRadius: 16, padding: 16, border: `1.5px solid ${p.is_pinned ? "#22c55e44" : "var(--accent)"}` }}>
                    {p.is_pinned && (
                      <div style={{ fontSize: 11, color: "var(--success)", fontWeight: 700, marginBottom: 8 }}>📌 Pinned</div>
                    )}
                    {/* Activity header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "#FF450018", border: "1px solid #FF450033", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                        {ACTIVITY_EMOJI[activity] ?? "🎯"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 15 }}>{activity}</div>
                        <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>@{p.username} · {timeAgo(p.created_at)}</div>
                      </div>
                      {community.creator_id === userId && (
                        <button onClick={() => pinPost(p.id, p.is_pinned)} disabled={pinningId === p.id}
                          style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 16, cursor: "pointer", opacity: pinningId === p.id ? 0.4 : 0.6, color: p.is_pinned ? "var(--success)" : "var(--text-faint)", padding: 0 }}>
                          📌
                        </button>
                      )}
                    </div>

                    {/* Details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 14 }}>
                        <span style={{ fontSize: 16 }}>🗓</span>
                        <span><span style={{ fontWeight: 600 }}>When:</span> {when}</span>
                      </div>
                      {where && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 14 }}>
                          <span style={{ fontSize: 16 }}>📍</span>
                          <span><span style={{ fontWeight: 600 }}>Where:</span> {where}</span>
                        </div>
                      )}
                      {note && (
                        <div style={{ color: "var(--text-faint)", fontSize: 13, fontStyle: "italic", lineHeight: 1.5, marginTop: 4 }}>
                          "{note}"
                        </div>
                      )}
                    </div>

                    {/* RSVP */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => toggleReaction(p.id, "✅")}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 999, border: `1.5px solid ${iAmIn ? "#22c55e" : "var(--border-medium)"}`, background: iAmIn ? "#0d1a0d" : "transparent", cursor: isMember ? "pointer" : "default", fontWeight: 700, fontSize: 13, color: iAmIn ? "#22c55e" : "var(--text-muted)", transition: "all 0.15s" }}>
                        ✅ {iAmIn ? "I'm in!" : "I'm in"}
                      </button>
                      {rsvpCount > 0 && (
                        <span style={{ fontSize: 13, color: "var(--text-faint)", fontWeight: 600 }}>
                          {rsvpCount} {rsvpCount === 1 ? "person" : "people"} going
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              // Regular post
              return (
                <div key={p.id} style={{ background: p.is_pinned ? "#0d1a0d" : "var(--bg-card-alt)", borderRadius: 14, padding: 14, border: `1px solid ${p.is_pinned ? "#22c55e33" : "var(--bg-input)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {p.is_pinned && <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 700 }}>📌 Pinned</span>}
                      <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 13 }}>@{p.username}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{timeAgo(p.created_at)}</span>
                      {community.creator_id === userId && (
                        <button onClick={() => pinPost(p.id, p.is_pinned)} disabled={pinningId === p.id}
                          style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", opacity: pinningId === p.id ? 0.4 : 1, color: p.is_pinned ? "var(--success)" : "#333", padding: 0, lineHeight: 1 }}
                          title={p.is_pinned ? "Unpin" : "Pin to top"}>
                          📌
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, margin: "0 0 10px" }}>{p.content}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["❤️", "💪", "🔥", "👏"].map((emoji) => {
                      const count = reactions[p.id]?.[emoji] ?? 0;
                      const mine = myReactions[p.id] === emoji;
                      return (
                        <button key={emoji} onClick={() => toggleReaction(p.id, emoji)}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999, border: `1px solid ${mine ? "#FF450066" : "var(--bg-input)"}`, background: mine ? "#FF450018" : "transparent", cursor: isMember ? "pointer" : "default", fontSize: 13, color: mine ? "var(--accent)" : "var(--text-faint)", fontWeight: mine ? 700 : 400 }}>
                          {emoji}{count > 0 && <span style={{ fontSize: 11 }}>{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Compose area */}
          <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)", flexShrink: 0, paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}>
            {isMember ? (
              <div>
                {/* Mode toggle */}
                <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
                  {(["chat", "activity"] as const).map((mode) => (
                    <button key={mode} onClick={() => setComposeMode(mode)}
                      style={{ flex: 1, padding: "10px 0", border: "none", borderBottom: `2px solid ${composeMode === mode ? "var(--accent)" : "transparent"}`, background: "transparent", color: composeMode === mode ? "var(--accent)" : "var(--text-faint)", fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}>
                      {mode === "chat" ? "💬 Chat" : "🗓 Activity invite"}
                    </button>
                  ))}
                </div>

                {composeMode === "chat" ? (
                  <div style={{ display: "flex", gap: 8, padding: "10px 16px" }}>
                    <input value={postText} onChange={(e) => setPostText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPost(); } }}
                      placeholder="Write something..."
                      style={{ flex: 1, background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: "11px 14px", color: "var(--text-primary)", fontSize: 14, outline: "none" }} />
                    <button onClick={sendPost} disabled={!postText.trim() || posting}
                      style={{ padding: "11px 16px", borderRadius: 12, border: "none", background: postText.trim() ? "var(--accent)" : "var(--bg-card-alt)", color: postText.trim() ? "#fff" : "var(--text-faint)", fontWeight: 700, fontSize: 13, cursor: postText.trim() ? "pointer" : "default" }}>
                      Post
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Activity type picker (compact) */}
                    <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
                      {ALL_ACTIVITIES.map((a) => (
                        <button key={a} onClick={() => setActivityType(a)}
                          style={{ flexShrink: 0, padding: "5px 10px", borderRadius: 999, border: `1px solid ${activityType === a ? "var(--accent)" : "var(--bg-input)"}`, background: activityType === a ? "var(--accent)" : "transparent", color: activityType === a ? "#fff" : "var(--text-faint)", fontWeight: 700, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                          {ACTIVITY_EMOJI[a]} {a}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={activityWhen} onChange={(e) => setActivityWhen(e.target.value)}
                        placeholder="🗓 When? (e.g. Sun 3pm)"
                        style={{ flex: 1, background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                      <input value={activityWhere} onChange={(e) => setActivityWhere(e.target.value)}
                        placeholder="📍 Where? (optional)"
                        style={{ flex: 1, background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={activityNote} onChange={(e) => setActivityNote(e.target.value)}
                        placeholder="Note (optional)"
                        style={{ flex: 1, background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                      <button onClick={sendPost} disabled={!activityWhen.trim() || posting}
                        style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: activityWhen.trim() ? "var(--accent)" : "var(--bg-card-alt)", color: activityWhen.trim() ? "#fff" : "var(--text-faint)", fontWeight: 700, fontSize: 13, cursor: activityWhen.trim() ? "pointer" : "default", flexShrink: 0 }}>
                        Post
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: "12px 16px" }}>
                <button onClick={joinOrLeave}
                  style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  Join to post in this circle
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Polls tab */}
      {tab === "polls" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {isMember && (
            <button onClick={() => setShowPollForm(true)}
              style={{ width: "100%", padding: 14, borderRadius: 12, border: "1px solid var(--accent-faint)", background: "#1a0800", color: "var(--accent)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              📊 Create a Poll
            </button>
          )}

          {polls.length === 0 && !showPollForm && (
            <div style={{ textAlign: "center", paddingTop: 40, color: "var(--text-faint)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <p style={{ fontWeight: 700, color: "var(--text-muted)" }}>No polls yet</p>
              <p style={{ fontSize: 13 }}>{isMember ? "Create the first poll!" : "Join to create polls."}</p>
            </div>
          )}

          {polls.map((poll) => {
            const totalVotes = poll.votes.reduce((s, v) => s + v.count, 0);
            const expired = poll.ends_at ? new Date(poll.ends_at) < new Date() : false;
            const canVote = isMember && poll.myVote === null && !expired;
            return (
              <div key={poll.id} style={{ background: "var(--bg-card-alt)", borderRadius: 16, padding: 16, border: "1px solid var(--border-medium)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>@{poll.username}</span>
                  <span style={{ fontSize: 11, color: "var(--text-ultra-faint)" }}>
                    {expired ? "Closed" : poll.ends_at ? `Ends ${new Date(poll.ends_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Open"}
                  </span>
                </div>
                <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15, margin: "8px 0 12px" }}>{poll.question}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {poll.options.map((opt, i) => {
                    const count = poll.votes.find(v => v.option_index === i)?.count ?? 0;
                    const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                    const isMyVote = poll.myVote === i;
                    return (
                      <button key={i} onClick={() => canVote && votePoll(poll.id, i)} disabled={!canVote}
                        style={{ position: "relative", width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${isMyVote ? "var(--accent)" : "var(--bg-input)"}`, background: "transparent", cursor: canVote ? "pointer" : "default", textAlign: "left", overflow: "hidden" }}>
                        {!canVote && (
                          <div style={{ position: "absolute", inset: 0, background: isMyVote ? "#FF450022" : "#ffffff08", width: `${pct}%`, borderRadius: 10, transition: "width 0.4s" }} />
                        )}
                        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: isMyVote ? "var(--accent)" : "var(--text-secondary)", fontWeight: isMyVote ? 700 : 500, fontSize: 14 }}>
                            {isMyVote ? "✓ " : ""}{opt}
                          </span>
                          {!canVote && <span style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600 }}>{pct}%</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-ultra-faint)", marginTop: 8 }}>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</div>
              </div>
            );
          })}

          {/* Create poll modal */}
          {showPollForm && (
            <div onClick={() => setShowPollForm(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div onClick={(e) => e.stopPropagation()}
                style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", border: "1px solid var(--border)", paddingBottom: 24 }}>
                <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, marginBottom: 16 }}>Create Poll</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>QUESTION</label>
                    <input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder="e.g. Best day to meet?" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>OPTIONS</label>
                    {pollOptions.map((opt, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input value={opt} onChange={(e) => { const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o); }}
                          placeholder={`Option ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
                        {i >= 2 && (
                          <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                            style={{ background: "none", border: "1px solid var(--border-strong)", borderRadius: 8, color: "var(--text-faint)", fontSize: 16, cursor: "pointer", padding: "0 10px" }}>✕</button>
                        )}
                      </div>
                    ))}
                    {pollOptions.length < 4 && (
                      <button onClick={() => setPollOptions([...pollOptions, ""])}
                        style={{ fontSize: 13, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>+ Add option</button>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>DURATION (DAYS)</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["1", "3", "7"].map(d => (
                        <button key={d} onClick={() => setPollDays(d)}
                          style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1px solid ${pollDays === d ? "var(--accent)" : "var(--bg-input)"}`, background: pollDays === d ? "#FF450022" : "transparent", color: pollDays === d ? "var(--accent)" : "var(--text-faint)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <button onClick={() => setShowPollForm(false)}
                      style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button onClick={createPoll} disabled={creatingPoll || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                      style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: creatingPoll ? 0.6 : 1 }}>
                      {creatingPoll ? "Creating..." : "Create Poll 📊"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Members tab */}
      {tab === "members" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {members.map((m) => (
            <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-card-alt)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border-medium)" }}>
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: 20, objectFit: "cover", border: "2px solid var(--border-medium)" }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 20, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>
                  {m.username[0]?.toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>@{m.username}</div>
                {m.user_id === community.creator_id && (
                  <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>👑 Creator</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-faint)", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "11px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" };
