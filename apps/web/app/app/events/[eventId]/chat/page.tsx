"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_username?: string;
};

export default function GroupChatPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [participantCount, setParticipantCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => { init(); }, [eventId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Load event info
    const { data: event } = await supabase
      .from("events").select("title").eq("id", eventId).single();
    if (event) setEventTitle(event.title);

    // Participant count
    const { count } = await supabase
      .from("event_participants")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);
    setParticipantCount(count ?? 0);

    // Load messages with sender usernames
    const { data: msgs } = await supabase
      .from("group_messages")
      .select("id, sender_id, content, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (msgs && msgs.length > 0) {
      const senderIds = [...new Set(msgs.map((m: any) => m.sender_id))];
      const { data: users } = await supabase
        .from("users").select("id, username").in("id", senderIds);
      const userMap = Object.fromEntries((users ?? []).map((u: any) => [u.id, u.username]));
      setMessages(msgs.map((m: any) => ({ ...m, sender_username: userMap[m.sender_id] ?? "?" })));
    }
    setLoading(false);

    // Realtime: new messages
    const channel = supabase
      .channel(`group-${eventId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `event_id=eq.${eventId}` },
        async (payload) => {
          const msg = payload.new as any;
          const { data: u } = await supabase.from("users").select("username").eq("id", msg.sender_id).single();
          setMessages((prev) => [...prev, { ...msg, sender_username: u?.username ?? "?" }]);
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId: typerId, username } = payload.payload;
        if (typerId === user.id) return;
        setTypingUsers((prev) => prev.includes(username) ? prev : [...prev, username]);
        if (typingTimeouts.current[typerId]) clearTimeout(typingTimeouts.current[typerId]);
        typingTimeouts.current[typerId] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u !== username));
        }, 2000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }

  async function sendMessage() {
    if (!text.trim() || !currentUserId) return;
    const content = text.trim();
    setText("");
    await supabase.from("group_messages").insert({ event_id: eventId, sender_id: currentUserId, content });
  }

  async function handleTextChange(val: string) {
    setText(val);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: u } = await supabase.from("users").select("username").eq("id", user.id).single();
    const channel = supabase.channel(`group-${eventId}`);
    channel.send({ type: "broadcast", event: "typing", payload: { userId: user.id, username: u?.username ?? "?" } }).catch(() => {});
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDateSeparator(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  }

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const date = formatDateSeparator(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.messages.push(msg);
    else grouped.push({ date, messages: [msg] });
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100, background: "#0f0f0f", height: "100vh" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0f0f0f" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid #1a1a1a", background: "#0f0f0f", flexShrink: 0 }}>
        <button onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          🎪
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: "#fff", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{eventTitle}</div>
          <div style={{ fontSize: 11, color: "#555" }}>{participantCount} participants</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 2 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#444", paddingTop: 60, fontSize: 14 }}>
            No messages yet. Say hi to the group! 👋
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div style={{ textAlign: "center", margin: "16px 0 12px", position: "relative" }}>
              <span style={{ fontSize: 11, color: "#444", background: "#0f0f0f", padding: "0 12px", position: "relative", zIndex: 1 }}>
                {group.date}
              </span>
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "#1a1a1a", zIndex: 0 }} />
            </div>

            {group.messages.map((m, i) => {
              const isMine = m.sender_id === currentUserId;
              const prevMsg = group.messages[i - 1];
              const showSender = !isMine && (!prevMsg || prevMsg.sender_id !== m.sender_id);

              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 4 }}>
                  {showSender && (
                    <span style={{ fontSize: 11, color: "#FF4500", fontWeight: 700, marginBottom: 3, marginLeft: 4 }}>
                      @{m.sender_username}
                    </span>
                  )}
                  <div style={{
                    maxWidth: "75%", padding: "9px 13px",
                    borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: isMine ? "#FF4500" : "#1a1a1a",
                    color: "#fff", fontSize: 15, lineHeight: 1.4,
                    border: isMine ? "none" : "1px solid #2a2a2a",
                  }}>
                    {m.content}
                  </div>
                  <span style={{ fontSize: 10, color: "#333", marginTop: 2, marginLeft: 4, marginRight: 4 }}>
                    {formatTime(m.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "18px 18px 18px 4px", padding: "8px 14px", display: "flex", gap: 4, alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: "#555", animation: `bounce 1s ease infinite ${i * 0.2}s` }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: "#555" }}>
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #1a1a1a", background: "#0f0f0f", display: "flex", gap: 10, alignItems: "flex-end", flexShrink: 0 }}>
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message the group..."
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
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
