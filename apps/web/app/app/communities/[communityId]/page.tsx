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
  const [tab, setTab] = useState<"feed" | "polls" | "members">("feed");
  const bottomRef = useRef<HTMLDivElement>(null);

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

  async function loadPolls() {
    if (!userId) return;
    const { data: pollRows } = await supabase
      .from("community_polls")
      .select("*")
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });
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
          {(["feed", "polls", "members"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); if (t === "polls") loadPolls(); }}
              style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: tab === t ? "#FF4500" : "transparent", color: tab === t ? "#fff" : "#555", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
              {t === "feed" ? "💬 Feed" : t === "polls" ? "📊 Polls" : `👥 ${memberCount}`}
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

      {/* Polls tab */}
      {tab === "polls" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {isMember && (
            <button onClick={() => setShowPollForm(true)}
              style={{ width: "100%", padding: 14, borderRadius: 12, border: "1px solid #FF450044", background: "#1a0800", color: "#FF4500", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              📊 Create a Poll
            </button>
          )}

          {polls.length === 0 && !showPollForm && (
            <div style={{ textAlign: "center", paddingTop: 40, color: "#555" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <p style={{ fontWeight: 700, color: "#888" }}>No polls yet</p>
              <p style={{ fontSize: 13 }}>{isMember ? "Create the first poll!" : "Join to create polls."}</p>
            </div>
          )}

          {polls.map((poll) => {
            const totalVotes = poll.votes.reduce((s, v) => s + v.count, 0);
            const expired = poll.ends_at ? new Date(poll.ends_at) < new Date() : false;
            const canVote = isMember && poll.myVote === null && !expired;
            return (
              <div key={poll.id} style={{ background: "#1a1a1a", borderRadius: 16, padding: 16, border: "1px solid #2a2a2a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#FF4500", fontWeight: 700 }}>@{poll.username}</span>
                  <span style={{ fontSize: 11, color: "#444" }}>
                    {expired ? "Closed" : poll.ends_at ? `Ends ${new Date(poll.ends_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Open"}
                  </span>
                </div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: "8px 0 12px" }}>{poll.question}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {poll.options.map((opt, i) => {
                    const count = poll.votes.find(v => v.option_index === i)?.count ?? 0;
                    const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                    const isMyVote = poll.myVote === i;
                    return (
                      <button key={i} onClick={() => canVote && votePoll(poll.id, i)} disabled={!canVote}
                        style={{ position: "relative", width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${isMyVote ? "#FF4500" : "#2a2a2a"}`, background: "transparent", cursor: canVote ? "pointer" : "default", textAlign: "left", overflow: "hidden" }}>
                        {/* progress fill */}
                        {!canVote && (
                          <div style={{ position: "absolute", inset: 0, background: isMyVote ? "#FF450022" : "#ffffff08", width: `${pct}%`, borderRadius: 10, transition: "width 0.4s" }} />
                        )}
                        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: isMyVote ? "#FF4500" : "#ccc", fontWeight: isMyVote ? 700 : 500, fontSize: 14 }}>
                            {isMyVote ? "✓ " : ""}{opt}
                          </span>
                          {!canVote && <span style={{ fontSize: 12, color: "#555", fontWeight: 600 }}>{pct}%</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 8 }}>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</div>
              </div>
            );
          })}

          {/* Create poll modal */}
          {showPollForm && (
            <div onClick={() => setShowPollForm(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <div onClick={(e) => e.stopPropagation()}
                style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, border: "1px solid #1a1a1a", paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
                <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />
                <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginBottom: 16 }}>Create Poll</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>QUESTION</label>
                    <input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder="e.g. Best workout day?" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>OPTIONS</label>
                    {pollOptions.map((opt, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input value={opt} onChange={(e) => { const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o); }}
                          placeholder={`Option ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
                        {i >= 2 && (
                          <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                            style={{ background: "none", border: "1px solid #333", borderRadius: 8, color: "#555", fontSize: 16, cursor: "pointer", padding: "0 10px" }}>✕</button>
                        )}
                      </div>
                    ))}
                    {pollOptions.length < 4 && (
                      <button onClick={() => setPollOptions([...pollOptions, ""])}
                        style={{ fontSize: 13, color: "#FF4500", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>+ Add option</button>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>DURATION (DAYS)</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["1", "3", "7"].map(d => (
                        <button key={d} onClick={() => setPollDays(d)}
                          style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1px solid ${pollDays === d ? "#FF4500" : "#2a2a2a"}`, background: pollDays === d ? "#FF450022" : "transparent", color: pollDays === d ? "#FF4500" : "#555", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <button onClick={() => setShowPollForm(false)}
                      style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button onClick={createPoll} disabled={creatingPoll || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                      style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: creatingPoll ? 0.6 : 1 }}>
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

const labelStyle: React.CSSProperties = { fontSize: 11, color: "#555", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "11px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" };
