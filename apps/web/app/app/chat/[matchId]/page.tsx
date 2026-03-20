"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";

type Message = { id: string; sender_id: string; content: string; created_at: string; read_at: string | null };

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUsername, setOtherUsername] = useState("");
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { init(); }, [matchId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: match } = await supabase
      .from("matches").select("sender_id, receiver_id").eq("id", matchId).single();

    if (match) {
      const otherId = match.sender_id === user.id ? match.receiver_id : match.sender_id;
      setOtherUserId(otherId);
      const { data: other } = await supabase.from("users").select("username").eq("id", otherId).single();
      if (other) setOtherUsername(other.username);
    }

    // Load messages with read_at
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at, read_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
    setLoading(false);

    // Mark received messages as read
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("match_id", matchId)
      .neq("sender_id", user.id)
      .is("read_at", null);

    // Realtime: new messages
    const channel = supabase
      .channel(`chat-${matchId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        async (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          if (payload.new.sender_id !== user.id) {
            await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", payload.new.id);
          }
        }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMessages((prev) => prev.map((m) => m.id === payload.new.id ? { ...m, read_at: payload.new.read_at } : m));
        }
      )
      // Typing indicator via broadcast
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
      fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: otherUserId,
          title: `💬 @${otherUsername || "Someone"} sent you a message`,
          body: content.length > 60 ? content.slice(0, 60) + "…" : content,
          url: `/app/chat/${matchId}`,
        }),
      }).catch(() => {});
    }
  }

  async function handleTextChange(val: string) {
    setText(val);
    // Broadcast typing
    const channel = supabase.channel(`chat-${matchId}`);
    channel.send({ type: "broadcast", event: "typing", payload: { userId: currentUserId } }).catch(() => {});
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }

  if (loading) return <Loading />;

  // Get last sent message id (for showing read receipt only on last)
  const myMessages = messages.filter((m) => m.sender_id === currentUserId);
  const lastMyMsgId = myMessages[myMessages.length - 1]?.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0f0f0f" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px", borderBottom: "1px solid #1a1a1a", background: "#0f0f0f" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 15 }}>
          {otherUsername[0]?.toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>@{otherUsername}</div>
          {otherIsTyping && <div style={{ fontSize: 11, color: "#FF4500" }}>typing...</div>}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#444", paddingTop: 60, fontSize: 14 }}>
            Say hi to @{otherUsername}!
          </div>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId;
          const isLastMine = m.id === lastMyMsgId;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "72%", padding: "10px 14px",
                borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isMine ? "#FF4500" : "#1a1a1a",
                color: "#fff", fontSize: 15, lineHeight: 1.4,
                border: isMine ? "none" : "1px solid #2a2a2a",
              }}>
                {m.content}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                <span style={{ fontSize: 10, color: "#444" }}>{formatTime(m.created_at)}</span>
                {/* Read receipt — only on last sent message */}
                {isMine && isLastMine && (
                  <span style={{ fontSize: 10, color: m.read_at ? "#FF4500" : "#555", fontWeight: 700 }}>
                    {m.read_at ? "✓✓" : "✓"}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator bubble */}
        {otherIsTyping && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "18px 18px 18px 4px", padding: "10px 16px", display: "flex", gap: 4, alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: "#555", animation: `bounce 1s ease infinite ${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #1a1a1a", background: "#0f0f0f", display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message..."
          rows={1}
          style={{
            flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 20,
            padding: "10px 16px", color: "#fff", fontSize: 15, outline: "none", resize: "none",
            maxHeight: 120, overflowY: "auto", lineHeight: 1.4,
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim()}
          style={{
            width: 44, height: 44, borderRadius: 22, background: text.trim() ? "#FF4500" : "#1a1a1a",
            border: "none", cursor: text.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            transition: "background 0.2s",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100, background: "#0f0f0f", height: "100vh" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
