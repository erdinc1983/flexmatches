"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";

// Deterministic avatar helpers
const MALE_AVATARS: Record<"young" | "middle" | "senior", string[]> = {
  young:  ["/avatars/male/m1.jpeg","/avatars/male/m2.jpeg","/avatars/male/m3.jpeg","/avatars/male/m4.jpeg","/avatars/male/m5.jpeg","/avatars/male/m6.jpeg"],
  middle: ["/avatars/male/m7.jpeg","/avatars/male/m8.jpeg","/avatars/male/m9.jpeg","/avatars/male/m10.jpeg"],
  senior: ["/avatars/male/m11.jpeg","/avatars/male/m12.jpeg"],
};
const FEMALE_AVATARS: Record<"young" | "middle" | "senior", string[]> = {
  young:  ["/avatars/female/f1.jpeg","/avatars/female/f2.jpeg","/avatars/female/f3.jpeg","/avatars/female/f4.jpeg","/avatars/female/f5.jpeg","/avatars/female/f6.jpeg"],
  middle: ["/avatars/female/f7.jpeg","/avatars/female/f8.jpeg","/avatars/female/f9.jpeg","/avatars/female/f10.jpeg"],
  senior: ["/avatars/female/f11.jpeg","/avatars/female/f12.jpeg"],
};
function getAgeGroup(age: number | null): "young" | "middle" | "senior" {
  if (!age || age < 38) return "young";
  if (age < 55) return "middle";
  return "senior";
}
function getDefaultAvatar(userId: string, gender: string | null, age: number | null): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  const group = getAgeGroup(age);
  if (gender === "female") return FEMALE_AVATARS[group][hash % FEMALE_AVATARS[group].length];
  return MALE_AVATARS[group][hash % MALE_AVATARS[group].length];
}

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
  const [otherFullName, setOtherFullName] = useState("");
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherAvatarUrl, setOtherAvatarUrl] = useState<string | null>(null);
  const [otherGender, setOtherGender] = useState<string | null>(null);
  const [otherAge, setOtherAge] = useState<number | null>(null);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [otherLastActive, setOtherLastActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerWorkouts7d, setPartnerWorkouts7d] = useState<number | null>(null);
  const [partnerStreak, setPartnerStreak] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMsgTimestampRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevMsgCountRef = useRef(0);

  // Joint check-in
  const [jointLogged, setJointLogged] = useState(false);
  const [jointLogging, setJointLogging] = useState(false);
  const [jointToast, setJointToast] = useState(false);

  // Header menu
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Workout invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSport, setInviteSport] = useState("Gym");
  const [inviteDate, setInviteDate] = useState("");
  const [inviteLocation, setInviteLocation] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => { init(); }, [matchId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, invites]);

  // Keep track of latest message timestamp for polling
  useEffect(() => {
    if (messages.length > 0) {
      const latest = messages.filter((m) => !m.id.startsWith("temp-")).at(-1);
      if (latest) lastMsgTimestampRef.current = latest.created_at;
    }
  }, [messages]);

  // Polling fallback — in case realtime doesn't deliver to receiver
  useEffect(() => {
    if (!currentUserId) return;
    const interval = setInterval(async () => {
      const since = lastMsgTimestampRef.current;
      const q = supabase
        .from("messages")
        .select("id, sender_id, content, created_at, read_at")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });
      const { data } = await (since ? q.gt("created_at", since) : q);
      if (!data || data.length === 0) return;
      const existingIds = new Set<string>();
      setMessages((prev) => { prev.forEach((m) => existingIds.add(m.id)); return prev; });
      const newMsgs = data.filter((m: any) => !existingIds.has(m.id));
      if (newMsgs.length === 0) return;
      const incoming = newMsgs.filter((m: any) => m.sender_id !== currentUserId);
      if (incoming.length > 0) {
        supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", incoming.map((m: any) => m.id)).then(() => {});
        playMessageSound();
      }
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const toAdd = newMsgs.filter((m: any) => !ids.has(m.id));
        if (toAdd.length === 0) return prev;
        return [...prev, ...toAdd.map((m: any) => ({ ...m, type: "message" as const }))];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [currentUserId, matchId]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: match } = await supabase.from("matches").select("sender_id, receiver_id").eq("id", matchId).single();
    if (match) {
      const otherId = match.sender_id === user.id ? match.receiver_id : match.sender_id;
      setOtherUserId(otherId);
      const { data: other } = await supabase.from("users").select("username, full_name, last_active, current_streak, privacy_settings, avatar_url, gender, age").eq("id", otherId).single();
      if (other) {
        setOtherUsername(other.username);
        setOtherFullName((other as any).full_name ?? "");
        setOtherLastActive((other as any).last_active ?? null);
        setOtherAvatarUrl((other as any).avatar_url ?? null);
        setOtherGender((other as any).gender ?? null);
        setOtherAge((other as any).age ?? null);
        const partnerPrivacy = other.privacy_settings as any ?? {};
        if (!partnerPrivacy.hide_activity) {
          setPartnerStreak(other.current_streak ?? 0);
          const since = new Date(Date.now() - 7 * 86400000).toISOString();
          const { count } = await supabase.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", otherId).gte("logged_at", since);
          setPartnerWorkouts7d(count ?? 0);
        }
      }
    }

    const [{ data: msgs }, { data: invs }] = await Promise.all([
      supabase.from("messages").select("id, sender_id, content, created_at, read_at").eq("match_id", matchId).order("created_at", { ascending: true }),
      supabase.from("workout_invites").select("*").eq("match_id", matchId).order("created_at", { ascending: true }),
    ]);
    if (msgs) setMessages(msgs.map((m: any) => ({ ...m, type: "message" })));
    if (invs) setInvites(invs.map((i: any) => ({ ...i, type: "invite" })));
    setLoading(false);

    await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("match_id", matchId).neq("sender_id", user.id).is("read_at", null);

    // Check if already logged a partner_session today
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { count: partnerCount } = await supabase.from("workouts").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("exercise_type", "partner_session").gte("logged_at", todayStart.toISOString());
    if ((partnerCount ?? 0) > 0) setJointLogged(true);

    const channel = supabase.channel(`chat-${matchId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        async (payload) => {
          setMessages((prev) => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, { ...payload.new as any, type: "message" }]);
          if (payload.new.sender_id !== user.id) {
            await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", payload.new.id);
            playMessageSound();
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

    // Optimistic update — show message immediately
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = { id: tempId, sender_id: currentUserId, content, created_at: new Date().toISOString(), read_at: null, type: "message" };
    setMessages((prev) => [...prev, tempMsg]);

    const { data } = await supabase.from("messages").insert({ match_id: matchId, sender_id: currentUserId, content }).select().single();
    // Replace temp with real message from DB
    if (data) setMessages((prev) => prev.map((m) => m.id === tempId ? { ...data, type: "message" } : m));

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

  function archiveChat() {
    if (!currentUserId) return;
    const key = `fm_archived_${currentUserId}`;
    const existing: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!existing.includes(matchId)) { existing.push(matchId); localStorage.setItem(key, JSON.stringify(existing)); }
    router.replace("/app/matches");
  }

  async function deleteAndUnmatch() {
    if (!currentUserId) return;
    setDeleting(true);
    await supabase.from("messages").delete().eq("match_id", matchId);
    await supabase.from("workout_invites").delete().eq("match_id", matchId);
    await supabase.from("matches").delete().eq("id", matchId);
    router.replace("/app/matches");
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

  // Init AudioContext on first user gesture so browser allows audio
  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      } else if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  async function playMessageSound() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  function formatLastActive(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return "Active now";
    if (mins < 60) return `Active ${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Active ${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `Active ${days}d ago`;
  }

  async function logJointSession() {
    if (!currentUserId || jointLogged || jointLogging) return;
    setJointLogging(true);
    await supabase.from("messages").insert({ match_id: matchId, sender_id: currentUserId, content: "💪 We trained together today! 🔥" });
    await supabase.from("workouts").insert({ user_id: currentUserId, exercise_type: "partner_session", duration_minutes: 60, calories: 0, notes: "Joint session with partner", logged_at: new Date().toISOString() });
    setJointLogged(true);
    setJointLogging(false);
    setJointToast(true);
    setTimeout(() => setJointToast(false), 3000);
  }

  function formatTime(iso: string) { return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); }
  function formatDayLabel(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Merge and sort feed items
  const feed: FeedItem[] = [...messages, ...invites].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (loading) return <Loading />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-page)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-page)" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}>←</button>
        <img
          src={otherAvatarUrl || (otherUserId ? getDefaultAvatar(otherUserId, otherGender, otherAge) : "")}
          alt=""
          style={{ width: 36, height: 36, borderRadius: 18, objectFit: "cover", border: "2px solid var(--accent-faint)", flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 16, fontFamily: "var(--font-display)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {otherFullName || `@${otherUsername}`}
          </div>
          {otherIsTyping ? (
            <div style={{ fontSize: 11, color: "var(--accent)" }}>typing...</div>
          ) : otherLastActive ? (
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{formatLastActive(otherLastActive)}</div>
          ) : (
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>@{otherUsername}</div>
          )}
        </div>
        <button onClick={() => setShowInviteModal(true)}
          style={{ background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "8px 12px", color: "var(--text-secondary)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          📅 Invite
        </button>
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowMenu((m) => !m)}
            style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", padding: "4px 6px", lineHeight: 1 }}>
            ⋯
          </button>
          {showMenu && (
            <div onClick={() => setShowMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          )}
          {showMenu && (
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "var(--bg-card)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: 6, zIndex: 100, minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
              <button onClick={() => { setShowMenu(false); archiveChat(); }}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "none", background: "none", color: "var(--text-primary)", fontWeight: 600, fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                📦 Archive Chat
              </button>
              <div style={{ height: 1, background: "var(--border)", margin: "2px 0" }} />
              <button onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "none", background: "none", color: "#ef4444", fontWeight: 600, fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                🗑️ Delete & Unmatch
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div onClick={() => setShowDeleteConfirm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 340 }}>
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", textAlign: "center", marginBottom: 8 }}>Delete & Unmatch?</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.6, marginBottom: 20 }}>
              All messages will be permanently deleted and you will be unmatched with @{otherUsername}. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={deleteAndUnmatch} disabled={deleting}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: deleting ? 0.6 : 1 }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partner activity bar */}
      {(partnerWorkouts7d !== null || partnerStreak !== null) && (
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", background: "var(--bg-page)" }}>
          <div style={{ flex: 1, padding: "8px 16px", textAlign: "center", borderRight: "1px solid var(--border)" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: (partnerWorkouts7d ?? 0) >= 3 ? "var(--success)" : "var(--text-muted)" }}>{partnerWorkouts7d ?? 0}</div>
            <div style={{ fontSize: 9, color: "var(--text-ultra-faint)", fontWeight: 700 }}>WORKOUTS THIS WEEK</div>
          </div>
          <div style={{ flex: 1, padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: (partnerStreak ?? 0) > 0 ? "var(--accent)" : "var(--text-faint)" }}>🔥 {partnerStreak ?? 0}</div>
            <div style={{ fontSize: 9, color: "var(--text-ultra-faint)", fontWeight: 700 }}>DAY STREAK</div>
          </div>
        </div>
      )}

      {/* Feed */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 16px", display: "flex", flexDirection: "column" }}>
        {feed.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-ultra-faint)", paddingTop: 60, fontSize: 14 }}>Say hi to @{otherUsername}!</div>
        )}

        {feed.map((item, idx) => {
          const prevItem = idx > 0 ? feed[idx - 1] : null;
          const nextItem = idx < feed.length - 1 ? feed[idx + 1] : null;
          const itemDay = new Date(item.created_at).toDateString();
          const prevDay = prevItem ? new Date(prevItem.created_at).toDateString() : null;
          const showDivider = itemDay !== prevDay;
          const prevSenderId = prevItem && prevItem.type === "message" ? (prevItem as Message).sender_id : null;
          const nextSenderId = nextItem && nextItem.type === "message" ? (nextItem as Message).sender_id : null;
          const curSenderId = item.type === "message" ? (item as Message).sender_id : null;
          const isFirstInGroup = !prevItem || prevItem.type === "invite" || prevSenderId !== curSenderId || showDivider;
          const isLastInGroup = !nextItem || nextItem.type === "invite" || nextSenderId !== curSenderId || new Date(nextItem.created_at).toDateString() !== itemDay;

          if (item.type === "invite") {
            const inv = item as Invite;
            const isMine = inv.sender_id === currentUserId;
            return (
              <div key={inv.id}>
                {showDivider && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0" }}>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    <span style={{ fontSize: 11, color: "var(--text-ultra-faint)", fontWeight: 700, whiteSpace: "nowrap" }}>{formatDayLabel(inv.created_at)}</span>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "85%", background: "var(--bg-card-alt)", borderRadius: 20, padding: "14px 16px", border: `1px solid ${inv.status === "accepted" ? "#22c55e44" : inv.status === "declined" ? "#ff444444" : "#FF450033"}` }}>
                    <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, marginBottom: 8 }}>📅 WORKOUT INVITE</div>
                    <div style={{ fontSize: 18, marginBottom: 6 }}>{SPORT_EMOJI[inv.sport] ?? "🎯"} <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>{inv.sport}</span></div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>🗓 {new Date(inv.proposed_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                    {inv.location && <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>📍 {inv.location}</div>}
                    {inv.note && <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 6, fontStyle: "italic" }}>"{inv.note}"</div>}
                    <div style={{ marginTop: 10 }}>
                      {inv.status === "accepted" && <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 700 }}>✅ Meetup Confirmed!</span>}
                      {inv.status === "declined" && <span style={{ fontSize: 12, color: "#ff4444", fontWeight: 700 }}>❌ Declined</span>}
                      {inv.status === "pending" && !isMine && (
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button onClick={() => respondInvite(inv.id, "declined")}
                            style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-faint)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                            Decline
                          </button>
                          <button onClick={() => respondInvite(inv.id, "accepted")}
                            style={{ flex: 2, padding: "8px 0", borderRadius: 10, border: "none", background: "var(--success)", color: "var(--text-primary)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                            ✅ Accept
                          </button>
                        </div>
                      )}
                      {inv.status === "pending" && isMine && (
                        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Waiting for response...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          const m = item as Message;
          const isMine = m.sender_id === currentUserId;
          const isJointMsg = m.content === "💪 We trained together today! 🔥";
          // Grouping border radii — tail appears only on last bubble in group
          const borderRadius = isMine
            ? (isLastInGroup ? "20px 20px 6px 20px" : "20px 20px 20px 20px")
            : (isLastInGroup ? "20px 20px 20px 6px" : "20px 20px 20px 20px");
          return (
            <div key={m.id} style={{ marginTop: isFirstInGroup ? 8 : 2 }}>
              {showDivider && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <span style={{ fontSize: 11, color: "var(--text-ultra-faint)", fontWeight: 700, whiteSpace: "nowrap" }}>{formatDayLabel(m.created_at)}</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "75%", padding: "10px 16px", borderRadius: isJointMsg ? "20px" : borderRadius, background: isJointMsg ? "#14532d" : isMine ? "var(--accent)" : "var(--bg-card-alt)", color: "var(--text-primary)", fontSize: 15, lineHeight: 1.5, border: isJointMsg ? "1px solid #22c55e44" : isMine ? "none" : "1px solid var(--border-medium)" }}>
                  {m.content}
                </div>
                {isLastInGroup && (
                  <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 3 }}>
                    <span style={{ fontSize: 10, color: "var(--text-ultra-faint)" }}>{formatTime(m.created_at)}</span>
                    {isMine && (
                      <span style={{ fontSize: 10, color: m.read_at ? "var(--accent)" : "var(--text-faint)", fontWeight: 700 }}>
                        {m.id.startsWith("temp-") ? "⏱" : m.read_at ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {otherIsTyping && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: "18px 18px 18px 4px", padding: "10px 16px", display: "flex", gap: 4, alignItems: "center" }}>
              {[0, 1, 2].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: "var(--text-faint)", animation: `bounce 1s ease infinite ${i * 0.2}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Joint check-in button */}
      <div style={{ padding: "8px 16px 0", background: "var(--bg-page)" }}>
        <button
          onClick={logJointSession}
          disabled={jointLogged || jointLogging}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 14,
            background: jointLogged ? "transparent" : "linear-gradient(135deg, #166534, #15803d)",
            border: jointLogged ? "1px solid #22c55e33" : "none",
            color: jointLogged ? "#86efac" : "#fff",
            fontWeight: 700, fontSize: 13, cursor: jointLogged ? "default" : "pointer",
            opacity: jointLogging ? 0.6 : 1,
            letterSpacing: 0.2,
            boxShadow: jointLogged ? "none" : "0 2px 8px #22c55e22",
          }}>
          {jointLogging ? "Logging..." : jointLogged ? "✅ Session logged today" : "💪 We trained today"}
        </button>
      </div>

      {/* Toast */}
      {jointToast && (
        <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: "#14532d", border: "1px solid #22c55e44", borderRadius: 99, padding: "10px 20px", color: "#22c55e", fontWeight: 700, fontSize: 13, zIndex: 200, whiteSpace: "nowrap" }}>
          Great work! Session logged 🔥
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-page)", display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea value={text} onChange={(e) => handleTextChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Message..." rows={1}
          style={{ flex: 1, background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 20, padding: "10px 16px", color: "var(--text-primary)", fontSize: 15, outline: "none", resize: "none", maxHeight: 120, overflowY: "auto", lineHeight: 1.4 }} />
        <button onClick={sendMessage} disabled={!text.trim()}
          style={{ width: 44, height: 44, borderRadius: 22, background: text.trim() ? "var(--accent)" : "var(--bg-card-alt)", border: "none", cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Workout Invite Modal */}
      {showInviteModal && (
        <div onClick={() => setShowInviteModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>📅 Invite to Workout</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>SPORT</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SPORTS.map((s) => (
                    <button key={s} onClick={() => setInviteSport(s)}
                      style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${inviteSport === s ? "var(--accent)" : "var(--bg-input)"}`, background: inviteSport === s ? "var(--accent)" : "transparent", color: inviteSport === s ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
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
                  style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={sendInvite} disabled={sendingInvite || !inviteDate}
                  style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: inviteDate ? "var(--accent)" : "var(--bg-card-alt)", color: inviteDate ? "var(--text-primary)" : "var(--text-faint)", fontWeight: 700, fontSize: 15, cursor: inviteDate ? "pointer" : "default", opacity: sendingInvite ? 0.6 : 1 }}>
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

const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-faint)", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "11px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" };

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100, background: "var(--bg-page)", height: "100vh" }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
