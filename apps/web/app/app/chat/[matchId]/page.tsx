"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";

const SPORTS = ["Gym", "Running", "Cycling", "Swimming", "Football", "Basketball", "Tennis", "Boxing", "Yoga", "CrossFit", "Pilates", "Hiking", "Other"];
const SPORT_EMOJI: Record<string, string> = { Gym: "🏋️", Running: "🏃", Cycling: "🚴", Swimming: "🏊", Football: "⚽", Basketball: "🏀", Tennis: "🎾", Boxing: "🥊", Yoga: "🧘", CrossFit: "💪", Pilates: "🧘", Hiking: "🏔️", Other: "🎯" };

type Message = { id: string; sender_id: string; content: string; created_at: string; read_at: string | null; type: "message" };
type Invite = { id: string; sender_id: string; receiver_id: string; sport: string; proposed_date: string; location: string | null; note: string | null; status: string; created_at: string; type: "invite" };
type FeedItem = Message | Invite;

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [text, setText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUsername, setOtherUsername] = useState("");
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Workout invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSport, setInviteSport] = useState("Gym");
  const [inviteDate, setInviteDate] = useState("");
  const [inviteLocation, setInviteLocation] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => { init(); }, [matchId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, invites]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: match } = await supabase.from("matches").select("sender_id, receiver_id").eq("id", matchId).single();
    if (match) {
      const otherId = match.sender_id === user.id ? match.receiver_id : match.sender_id;
      setOtherUserId(otherId);
      const { data: other } = await supabase.from("users").select("username").eq("id", otherId).single();
      if (other) setOtherUsername(other.username);
    }

    const [{ data: msgs }, { data: invs }] = await Promise.all([
      supabase.from("messages").select("id, sender_id, content, created_at, read_at").eq("match_id", matchId).order("created_at", { ascending: true }),
      supabase.from("workout_invites").select("*").eq("match_id", matchId).order("created_at", { ascending: true }),
    ]);
    if (msgs) setMessages(msgs.map((m: any) => ({ ...m, type: "message" })));
    if (invs) setInvites(invs.map((i: any) => ({ ...i, type: "invite" })));
    setLoading(false);

    await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("match_id", matchId).neq("sender_id", user.id).is("read_at", null);

    const channel = supabase.channel(`chat-${matchId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        async (payload) => {
          setMessages((prev) => [...prev, { ...payload.new as any, type: "message" }]);
          if (payload.new.sender_id !== user.id) {
            await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", payload.new.id);
          }
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => { setMessages((prev) => prev.map((m) => m.id === payload.new.id ? { ...m, read_at: payload.new.read_at } : m)); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "workout_invites", filter: `match_id=eq.${matchId}` },
        (payload) => { setInvites((prev) => [...prev, { ...payload.new as any, type: "invite" }]); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "workout_invites", filter: `match_id=eq.${matchId}` },
        (payload) => { setInvites((prev) => prev.map((i) => i.id === payload.new.id ? { ...i, status: payload.new.status } : i)); })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.userId !== user.id) {
          setOtherIsTyping(true);
          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setOtherIsTyping(false), 2000);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }

  async function sendMessage() {
    if (!text.trim() || !currentUserId) return;
    const content = text.trim();
    setText("");
    await supabase.from("messages").insert({ match_id: matchId, sender_id: currentUserId, content });
    if (otherUserId) {
      fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: otherUserId, title: `💬 @${otherUsername || "Someone"} sent you a message`, body: content.length > 60 ? content.slice(0, 60) + "…" : content, url: `/app/chat/${matchId}` }) }).catch(() => {});
    }
  }

  async function sendInvite() {
    if (!currentUserId || !otherUserId || !inviteDate) return;
    setSendingInvite(true);
    await supabase.from("workout_invites").insert({
      match_id: matchId, sender_id: currentUserId, receiver_id: otherUserId,
      sport: inviteSport, proposed_date: inviteDate,
      location: inviteLocation.trim() || null, note: inviteNote.trim() || null,
    });
    fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: otherUserId, title: "📅 Workout Invite!", body: `Someone invited you to ${inviteSport} on ${inviteDate}`, url: `/app/chat/${matchId}` }) }).catch(() => {});
    setSendingInvite(false);
    setShowInviteModal(false);
    setInviteDate(""); setInviteLocation(""); setInviteNote("");
  }

  async function respondInvite(inviteId: string, status: "accepted" | "declined") {
    await supabase.from("workout_invites").update({ status }).eq("id", inviteId);
    if (status === "accepted" && otherUserId) {
      fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: otherUserId, title: "✅ Meetup Confirmed!", body: "Your workout invite was accepted. See you there!", url: `/app/chat/${matchId}` }) }).catch(() => {});
    }
  }

  async function handleTextChange(val: string) {
    setText(val);
    const channel = supabase.channel(`chat-${matchId}`);
    channel.send({ type: "broadcast", event: "typing", payload: { userId: currentUserId } }).catch(() => {});
  }

  function formatTime(iso: string) { return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); }

  // Merge and sort feed items
  const feed: FeedItem[] = [...messages, ...invites].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const myMessages = messages.filter((m) => m.sender_id === currentUserId);
  const lastMyMsgId = myMessages[myMessages.length - 1]?.id;

  if (loading) return <Loading />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0f0f0f" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid #1a1a1a", background: "#0f0f0f" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 15 }}>
          {otherUsername[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>@{otherUsername}</div>
          {otherIsTyping && <div style={{ fontSize: 11, color: "#FF4500" }}>typing...</div>}
        </div>
        <button onClick={() => setShowInviteModal(true)}
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "8px 12px", color: "#ccc", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          📅 Invite
        </button>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {feed.length === 0 && (
          <div style={{ textAlign: "center", color: "#444", paddingTop: 60, fontSize: 14 }}>Say hi to @{otherUsername}!</div>
        )}

        {feed.map((item) => {
          if (item.type === "invite") {
            const inv = item as Invite;
            const isMine = inv.sender_id === currentUserId;
            return (
              <div key={inv.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "85%", background: "#1a1a1a", borderRadius: 16, padding: 14, border: `1px solid ${inv.status === "accepted" ? "#22c55e44" : inv.status === "declined" ? "#ff444444" : "#FF450033"}` }}>
                  <div style={{ fontSize: 11, color: "#FF4500", fontWeight: 700, marginBottom: 8 }}>📅 WORKOUT INVITE</div>
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{SPORT_EMOJI[inv.sport] ?? "🎯"} <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{inv.sport}</span></div>
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>🗓 {new Date(inv.proposed_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                  {inv.location && <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>📍 {inv.location}</div>}
                  {inv.note && <div style={{ fontSize: 13, color: "#666", marginTop: 6, fontStyle: "italic" }}>"{inv.note}"</div>}
                  <div style={{ marginTop: 10 }}>
                    {inv.status === "accepted" && <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 700 }}>✅ Meetup Confirmed!</span>}
                    {inv.status === "declined" && <span style={{ fontSize: 12, color: "#ff4444", fontWeight: 700 }}>❌ Declined</span>}
                    {inv.status === "pending" && !isMine && (
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button onClick={() => respondInvite(inv.id, "declined")}
                          style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#555", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                          Decline
                        </button>
                        <button onClick={() => respondInvite(inv.id, "accepted")}
                          style={{ flex: 2, padding: "8px 0", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                          ✅ Accept
                        </button>
                      </div>
                    )}
                    {inv.status === "pending" && isMine && (
                      <span style={{ fontSize: 11, color: "#555" }}>Waiting for response...</span>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          const m = item as Message;
          const isMine = m.sender_id === currentUserId;
          const isLastMine = m.id === lastMyMsgId;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "72%", padding: "10px 14px", borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: isMine ? "#FF4500" : "#1a1a1a", color: "#fff", fontSize: 15, lineHeight: 1.4, border: isMine ? "none" : "1px solid #2a2a2a" }}>
                {m.content}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                <span style={{ fontSize: 10, color: "#444" }}>{formatTime(m.created_at)}</span>
                {isMine && isLastMine && (
                  <span style={{ fontSize: 10, color: m.read_at ? "#FF4500" : "#555", fontWeight: 700 }}>{m.read_at ? "✓✓" : "✓"}</span>
                )}
              </div>
            </div>
          );
        })}

        {otherIsTyping && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "18px 18px 18px 4px", padding: "10px 16px", display: "flex", gap: 4, alignItems: "center" }}>
              {[0, 1, 2].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: "#555", animation: `bounce 1s ease infinite ${i * 0.2}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #1a1a1a", background: "#0f0f0f", display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea value={text} onChange={(e) => handleTextChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Message..." rows={1}
          style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 20, padding: "10px 16px", color: "#fff", fontSize: 15, outline: "none", resize: "none", maxHeight: 120, overflowY: "auto", lineHeight: 1.4 }} />
        <button onClick={sendMessage} disabled={!text.trim()}
          style={{ width: 44, height: 44, borderRadius: 22, background: text.trim() ? "#FF4500" : "#1a1a1a", border: "none", cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Workout Invite Modal */}
      {showInviteModal && (
        <div onClick={() => setShowInviteModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, border: "1px solid #1a1a1a", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>📅 Invite to Workout</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>SPORT</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SPORTS.map((s) => (
                    <button key={s} onClick={() => setInviteSport(s)}
                      style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${inviteSport === s ? "#FF4500" : "#2a2a2a"}`, background: inviteSport === s ? "#FF4500" : "transparent", color: inviteSport === s ? "#fff" : "#888", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                      {SPORT_EMOJI[s]} {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>DATE & TIME *</label>
                <input type="datetime-local" value={inviteDate} onChange={(e) => setInviteDate(e.target.value)}
                  style={{ ...inputStyle, colorScheme: "dark" }} />
              </div>

              <div>
                <label style={labelStyle}>LOCATION</label>
                <input value={inviteLocation} onChange={(e) => setInviteLocation(e.target.value)} placeholder="e.g. Gold's Gym, Central Park..."
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>NOTE (OPTIONAL)</label>
                <input value={inviteNote} onChange={(e) => setInviteNote(e.target.value)} placeholder="e.g. Leg day, bring water!"
                  style={inputStyle} />
              </div>

              <div style={{ display: "flex", gap: 10, paddingBottom: 16 }}>
                <button onClick={() => setShowInviteModal(false)}
                  style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={sendInvite} disabled={sendingInvite || !inviteDate}
                  style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: inviteDate ? "#FF4500" : "#1a1a1a", color: inviteDate ? "#fff" : "#555", fontWeight: 700, fontSize: 15, cursor: inviteDate ? "pointer" : "default", opacity: sendingInvite ? 0.6 : 1 }}>
                  {sendingInvite ? "Sending..." : "Send Invite 📅"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: "#555", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "11px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" };

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100, background: "#0f0f0f", height: "100vh" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
