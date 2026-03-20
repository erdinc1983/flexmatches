"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { awardBadge } from "../../../lib/badges";

const SPORTS = ["All", "Gym", "Running", "Cycling", "Swimming", "Football", "Basketball", "Tennis", "Boxing", "Yoga", "CrossFit", "Pilates", "Hiking", "Other"];
const SPORT_EMOJI: Record<string, string> = { All: "🏆", Gym: "🏋️", Running: "🏃", Cycling: "🚴", Swimming: "🏊", Football: "⚽", Basketball: "🏀", Tennis: "🎾", Boxing: "🥊", Yoga: "🧘", CrossFit: "💪", Pilates: "🎯", Hiking: "🏔️", Other: "⚡" };

type Event = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  sport: string | null;
  location_name: string | null;
  event_date: string;
  max_participants: number;
  visibility: "public" | "friends" | "invite";
  created_at: string;
  creator_username?: string;
  participant_count?: number;
  waitlist_count?: number;
  is_joined?: boolean;
  is_waitlisted?: boolean;
};

type Participant = { user_id: string; username: string; avatar_url: string | null };

function EventsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Tabs + filters
  const [tab, setTab] = useState<"all" | "popular" | "mine">("all");
  const [sportFilter, setSportFilter] = useState("All");

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  // Create / Edit form
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSport, setFormSport] = useState("Gym");
  const [formLocation, setFormLocation] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formMax, setFormMax] = useState("10");
  const [formVisibility, setFormVisibility] = useState<"public" | "friends" | "invite">("public");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEvents();
    if (searchParams.get("create") === "1") setShowForm(true);
  }, [searchParams]);

  async function loadEvents() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: eventsRaw } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(100);

    if (!eventsRaw) { setLoading(false); return; }

    const creatorIds = [...new Set(eventsRaw.map((e: any) => e.creator_id))];
    const { data: creators } = await supabase.from("users").select("id, username").in("id", creatorIds);
    const creatorMap = Object.fromEntries((creators ?? []).map((u: any) => [u.id, u.username]));

    const eventIds = eventsRaw.map((e: any) => e.id);
    const [{ data: participants }, { data: waitlist }] = await Promise.all([
      supabase.from("event_participants").select("event_id, user_id").in("event_id", eventIds),
      supabase.from("event_waitlist").select("event_id, user_id").in("event_id", eventIds),
    ]);

    const countMap: Record<string, number> = {};
    const waitMap: Record<string, number> = {};
    const joinedSet = new Set<string>();
    const waitedSet = new Set<string>();

    for (const p of participants ?? []) {
      countMap[(p as any).event_id] = (countMap[(p as any).event_id] ?? 0) + 1;
      if ((p as any).user_id === user.id) joinedSet.add((p as any).event_id);
    }
    for (const w of waitlist ?? []) {
      waitMap[(w as any).event_id] = (waitMap[(w as any).event_id] ?? 0) + 1;
      if ((w as any).user_id === user.id) waitedSet.add((w as any).event_id);
    }

    setEvents(eventsRaw.map((e: any) => ({
      ...e,
      creator_username: creatorMap[e.creator_id] ?? "unknown",
      participant_count: countMap[e.id] ?? 0,
      waitlist_count: waitMap[e.id] ?? 0,
      is_joined: joinedSet.has(e.id),
      is_waitlisted: waitedSet.has(e.id),
    })));
    setLoading(false);
  }

  async function openDetail(event: Event) {
    setSelectedEvent(event);
    setShowParticipants(false);
  }

  async function loadParticipants(eventId: string) {
    setLoadingParticipants(true);
    const { data: rows } = await supabase
      .from("event_participants")
      .select("user_id")
      .eq("event_id", eventId);
    if (rows && rows.length > 0) {
      const ids = rows.map((r: any) => r.user_id);
      const { data: users } = await supabase.from("users").select("id, username, avatar_url").in("id", ids);
      setParticipants((users ?? []).map((u: any) => ({ user_id: u.id, username: u.username, avatar_url: u.avatar_url })));
    } else {
      setParticipants([]);
    }
    setLoadingParticipants(false);
    setShowParticipants(true);
  }

  async function toggleJoin(event: Event) {
    if (!userId) return;
    if (event.is_joined) {
      if (event.creator_id === userId) return;
      await supabase.from("event_participants").delete().eq("event_id", event.id).eq("user_id", userId);
    } else if ((event.participant_count ?? 0) < event.max_participants) {
      await supabase.from("event_participants").insert({ event_id: event.id, user_id: userId });
    }
    loadEvents();
  }

  async function toggleWaitlist(event: Event) {
    if (!userId) return;
    if (event.is_waitlisted) {
      await supabase.from("event_waitlist").delete().eq("event_id", event.id).eq("user_id", userId);
    } else {
      await supabase.from("event_waitlist").insert({ event_id: event.id, user_id: userId });
    }
    loadEvents();
  }

  async function createEvent() {
    if (!userId || !formTitle.trim() || !formDate || !formTime) return;
    setSaving(true);
    const event_date = new Date(`${formDate}T${formTime}`).toISOString();
    const { data, error } = await supabase.from("events").insert({
      creator_id: userId,
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      sport: formSport,
      location_name: formLocation.trim() || null,
      event_date,
      max_participants: parseInt(formMax) || 10,
      visibility: formVisibility,
    }).select().single();

    if (!error && data) {
      await supabase.from("event_participants").insert({ event_id: data.id, user_id: userId });
      await awardBadge(userId, "event_organizer");
    }
    setSaving(false);
    setShowForm(false);
    resetForm();
    loadEvents();
  }

  async function saveEdit() {
    if (!editingEvent || !formTitle.trim() || !formDate || !formTime) return;
    setSaving(true);
    const event_date = new Date(`${formDate}T${formTime}`).toISOString();
    await supabase.from("events").update({
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      sport: formSport,
      location_name: formLocation.trim() || null,
      event_date,
      max_participants: parseInt(formMax) || 10,
      visibility: formVisibility,
    }).eq("id", editingEvent.id);
    setSaving(false);
    setEditingEvent(null);
    setSelectedEvent(null);
    resetForm();
    loadEvents();
  }

  async function deleteEvent(eventId: string) {
    await supabase.from("events").delete().eq("id", eventId);
    setSelectedEvent(null);
    loadEvents();
  }

  function resetForm() {
    setFormTitle(""); setFormDesc(""); setFormSport("Gym");
    setFormLocation(""); setFormDate(""); setFormTime(""); setFormMax("10");
    setFormVisibility("public");
  }

  function openEdit(event: Event) {
    const d = new Date(event.event_date);
    setFormTitle(event.title);
    setFormDesc(event.description ?? "");
    setFormSport(event.sport ?? "Gym");
    setFormLocation(event.location_name ?? "");
    setFormDate(d.toISOString().split("T")[0]);
    setFormTime(d.toTimeString().slice(0, 5));
    setFormMax(String(event.max_participants));
    setFormVisibility(event.visibility ?? "public");
    setEditingEvent(event);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function formatDateShort(iso: string) {
    const d = new Date(iso);
    const diff = d.getTime() - Date.now();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days < 7) return `In ${days} days`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Filtered events
  const filtered = events.filter((e) => {
    if (sportFilter !== "All" && e.sport !== sportFilter) return false;
    if (tab === "mine") return e.creator_id === userId || e.is_joined;
    if (tab === "popular") return (e.participant_count ?? 0) >= 3;
    return true;
  });

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5, margin: 0 }}>Events</h1>
          <p style={{ color: "#555", fontSize: 12, marginTop: 3 }}>{events.length} upcoming near you</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          style={{ background: "#FF4500", border: "none", borderRadius: 12, padding: "10px 18px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          + Create
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 3, background: "#1a1a1a", borderRadius: 12, padding: 3, marginBottom: 14 }}>
        {(["all", "popular", "mine"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: tab === t ? "#FF4500" : "transparent", color: tab === t ? "#fff" : "#555", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {t === "all" ? "📅 All" : t === "popular" ? "⭐ Popular" : "🏅 Mine"}
          </button>
        ))}
      </div>

      {/* Sport filter pills */}
      <div style={{ overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        <div style={{ display: "flex", gap: 6, minWidth: "max-content" }}>
          {SPORTS.map((s) => (
            <button key={s} onClick={() => setSportFilter(s)}
              style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${sportFilter === s ? "#FF4500" : "#2a2a2a"}`, background: sportFilter === s ? "#FF450022" : "#1a1a1a", color: sportFilter === s ? "#FF4500" : "#555", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
              {SPORT_EMOJI[s]} {s}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 56 }}>{tab === "mine" ? "🏅" : "🎪"}</div>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 18, marginTop: 16 }}>
            {tab === "mine" ? "No events yet" : "No events found"}
          </p>
          <p style={{ color: "#555", fontSize: 13, marginTop: 6 }}>
            {tab === "mine" ? "Create your first event or join one!" : "Try a different sport filter or create one!"}
          </p>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            style={{ marginTop: 20, padding: "12px 28px", borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Create Event
          </button>
        </div>
      )}

      {/* Events List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((event) => {
          const full = (event.participant_count ?? 0) >= event.max_participants;
          const isOwner = event.creator_id === userId;
          const pct = Math.round(((event.participant_count ?? 0) / event.max_participants) * 100);
          const visIcon = event.visibility === "friends" ? "👥" : event.visibility === "invite" ? "🔒" : "🌍";

          return (
            <div key={event.id} onClick={() => openDetail(event)}
              style={{ background: "#1a1a1a", borderRadius: 18, border: `1px solid ${event.is_joined ? "#FF450044" : "#2a2a2a"}`, cursor: "pointer", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#fff", fontSize: 15, marginBottom: 4 }}>{event.title}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {event.sport && (
                        <span style={{ fontSize: 11, color: "#FF4500", background: "#1a0800", borderRadius: 999, padding: "2px 8px", border: "1px solid #FF450033", fontWeight: 600 }}>
                          {SPORT_EMOJI[event.sport] ?? "⚡"} {event.sport}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "#555", background: "#111", borderRadius: 999, padding: "2px 8px", border: "1px solid #2a2a2a" }}>
                        {visIcon} {event.visibility ?? "public"}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#FF4500" }}>{formatDateShort(event.event_date)}</div>
                    {isOwner && <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>yours</div>}
                  </div>
                </div>

                {event.location_name && <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>📍 {event.location_name}</div>}

                {/* Capacity bar */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "#555" }}>👥 {event.participant_count}/{event.max_participants}</span>
                    {(event.waitlist_count ?? 0) > 0 && full && (
                      <span style={{ fontSize: 11, color: "#f59e0b" }}>+{event.waitlist_count} waitlisted</span>
                    )}
                  </div>
                  <div style={{ height: 4, background: "#2a2a2a", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct >= 90 ? "#ff6b6b" : pct >= 70 ? "#f59e0b" : "#22c55e", borderRadius: 2 }} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); full && !event.is_joined ? toggleWaitlist(event) : toggleJoin(event); }}
                    disabled={event.is_joined && isOwner}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: (event.is_joined && isOwner) ? "default" : "pointer", border: event.is_joined ? "1px solid #FF4500" : event.is_waitlisted ? "1px solid #f59e0b" : "none", background: event.is_joined ? "transparent" : event.is_waitlisted ? "transparent" : full ? "#1a1a1a" : "#FF4500", color: event.is_joined ? "#FF4500" : event.is_waitlisted ? "#f59e0b" : full ? "#888" : "#fff" }}>
                    {event.is_joined ? "✓ Going" : event.is_waitlisted ? "⏳ Waitlisted" : full ? "Join Waitlist" : "Join"}
                  </button>
                  {event.is_joined && (
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/app/events/${event.id}/chat`); }}
                      style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "#ccc", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      💬
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div onClick={() => { setSelectedEvent(null); setShowParticipants(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, maxHeight: "88dvh", overflowY: "auto", border: "1px solid #1a1a1a", paddingBottom: "calc(24px + env(safe-area-inset-bottom))" } as React.CSSProperties}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />

            <div style={{ fontWeight: 800, color: "#fff", fontSize: 20, marginBottom: 6 }}>{selectedEvent.title}</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {selectedEvent.sport && (
                <span style={{ fontSize: 12, color: "#FF4500", background: "#1a0800", borderRadius: 999, padding: "3px 12px", border: "1px solid #FF450033", fontWeight: 700 }}>
                  {SPORT_EMOJI[selectedEvent.sport] ?? "⚡"} {selectedEvent.sport}
                </span>
              )}
              <span style={{ fontSize: 12, color: "#555", background: "#1a1a1a", borderRadius: 999, padding: "3px 12px", border: "1px solid #2a2a2a" }}>
                {selectedEvent.visibility === "friends" ? "👥 Friends only" : selectedEvent.visibility === "invite" ? "🔒 Invite only" : "🌍 Public"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, background: "#1a1a1a", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 14, color: "#FF4500", fontWeight: 600 }}>📅 {formatDate(selectedEvent.event_date)}</div>
              {selectedEvent.location_name && <div style={{ fontSize: 14, color: "#ccc" }}>📍 {selectedEvent.location_name}</div>}
              <div style={{ fontSize: 13, color: "#888" }}>👥 {selectedEvent.participant_count}/{selectedEvent.max_participants} going
                {(selectedEvent.waitlist_count ?? 0) > 0 && <span style={{ color: "#f59e0b" }}> · {selectedEvent.waitlist_count} waiting</span>}
              </div>
              <div style={{ fontSize: 12, color: "#555" }}>Organized by @{selectedEvent.creator_username}</div>
            </div>

            {selectedEvent.description && (
              <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: 16 }}>{selectedEvent.description}</p>
            )}

            {/* Participants list */}
            {!showParticipants ? (
              <button onClick={() => loadParticipants(selectedEvent.id)}
                style={{ width: "100%", padding: "10px 0", borderRadius: 12, border: "1px solid #2a2a2a", background: "transparent", color: "#888", fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>
                👀 View participants ({selectedEvent.participant_count})
              </button>
            ) : loadingParticipants ? (
              <div style={{ textAlign: "center", padding: 12, color: "#555", fontSize: 13 }}>Loading...</div>
            ) : (
              <div style={{ background: "#1a1a1a", borderRadius: 14, padding: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#555", fontWeight: 700, marginBottom: 10 }}>GOING ({participants.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {participants.map((p) => (
                    <div key={p.user_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 16, background: "#FF450033", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, overflow: "hidden", flexShrink: 0 }}>
                        {p.avatar_url ? <img src={p.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : p.username[0]?.toUpperCase()}
                      </div>
                      <span style={{ color: "#ccc", fontSize: 14, fontWeight: 600 }}>@{p.username}</span>
                      {p.user_id === selectedEvent.creator_id && <span style={{ fontSize: 10, color: "#FF4500", fontWeight: 700 }}>ORGANIZER</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
              {selectedEvent.is_joined && (
                <button onClick={() => router.push(`/app/events/${selectedEvent.id}/chat`)}
                  style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid #2a2a2a", background: "#1a1a1a", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                  💬 Group Chat
                </button>
              )}
              {selectedEvent.creator_id === userId ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { openEdit(selectedEvent); setSelectedEvent(null); }}
                    style={{ flex: 1, padding: 14, borderRadius: 14, border: "1px solid #2a2a2a", background: "transparent", color: "#ccc", fontWeight: 700, cursor: "pointer" }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => deleteEvent(selectedEvent.id)}
                    style={{ flex: 1, padding: 14, borderRadius: 14, border: "1px solid #333", background: "transparent", color: "#ff6b6b", fontWeight: 700, cursor: "pointer" }}>
                    🗑️ Delete
                  </button>
                </div>
              ) : (
                <button onClick={() => { (selectedEvent.participant_count ?? 0) >= selectedEvent.max_participants && !selectedEvent.is_joined ? toggleWaitlist(selectedEvent) : toggleJoin(selectedEvent); setSelectedEvent(null); }}
                  disabled={selectedEvent.is_joined && selectedEvent.creator_id === userId}
                  style={{ width: "100%", padding: 14, borderRadius: 14, border: selectedEvent.is_joined ? "1px solid #FF4500" : selectedEvent.is_waitlisted ? "1px solid #f59e0b" : "none", background: selectedEvent.is_joined ? "transparent" : selectedEvent.is_waitlisted ? "transparent" : "#FF4500", color: selectedEvent.is_joined ? "#FF4500" : selectedEvent.is_waitlisted ? "#f59e0b" : "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                  {selectedEvent.is_joined ? "Leave Event" : selectedEvent.is_waitlisted ? "⏳ Leave Waitlist" : (selectedEvent.participant_count ?? 0) >= selectedEvent.max_participants ? "Join Waitlist" : "Join Event 💪"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {(showForm || editingEvent) && (
        <div onClick={() => { setShowForm(false); setEditingEvent(null); resetForm(); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, maxHeight: "92dvh", overflowY: "auto", border: "1px solid #1a1a1a", paddingBottom: "calc(24px + env(safe-area-inset-bottom))" } as React.CSSProperties}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>
              {editingEvent ? "Edit Event" : "New Event"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <div>
                <label style={labelStyle}>TITLE *</label>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Morning Run in Central Park"
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>SPORT / CATEGORY</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {SPORTS.filter(s => s !== "All").map((s) => (
                    <button key={s} onClick={() => setFormSport(s)}
                      style={{ padding: "8px 4px", borderRadius: 10, border: `1px solid ${formSport === s ? "#FF4500" : "#2a2a2a"}`, background: formSport === s ? "#FF450022" : "transparent", color: formSport === s ? "#FF4500" : "#888", fontWeight: 600, fontSize: 10, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 18, marginBottom: 2 }}>{SPORT_EMOJI[s]}</div>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>DATE *</label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                    style={{ ...inputStyle, colorScheme: "dark" } as React.CSSProperties} />
                </div>
                <div>
                  <label style={labelStyle}>TIME *</label>
                  <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)}
                    style={{ ...inputStyle, colorScheme: "dark" } as React.CSSProperties} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>LOCATION</label>
                <input value={formLocation} onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Central Park, NYC"
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>MAX PARTICIPANTS</label>
                <input type="number" value={formMax} onChange={(e) => setFormMax(e.target.value)}
                  min={2} max={500} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>VISIBILITY</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {([
                    { val: "public", label: "🌍 Public", desc: "Anyone" },
                    { val: "friends", label: "👥 Friends", desc: "Matches only" },
                    { val: "invite", label: "🔒 Invite", desc: "Invite only" },
                  ] as { val: "public" | "friends" | "invite"; label: string; desc: string }[]).map(({ val, label, desc }) => (
                    <button key={val} onClick={() => setFormVisibility(val)}
                      style={{ flex: 1, padding: "10px 4px", borderRadius: 12, border: `1px solid ${formVisibility === val ? "#FF4500" : "#2a2a2a"}`, background: formVisibility === val ? "#FF450022" : "transparent", cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: formVisibility === val ? "#FF4500" : "#888" }}>{label}</div>
                      <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>DESCRIPTION (optional)</label>
                <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="What to bring, skill level, meeting point..."
                  rows={3}
                  style={{ ...inputStyle, resize: "none", fontFamily: "inherit" } as React.CSSProperties} />
              </div>

              <div style={{ display: "flex", gap: 10, paddingBottom: 8 }}>
                <button onClick={() => { setShowForm(false); setEditingEvent(null); resetForm(); }}
                  style={{ flex: 1, padding: 14, borderRadius: 14, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={editingEvent ? saveEdit : createEvent}
                  disabled={saving || !formTitle.trim() || !formDate || !formTime}
                  style={{ flex: 2, padding: 14, borderRadius: 14, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", opacity: (saving || !formTitle.trim() || !formDate || !formTime) ? 0.5 : 1 }}>
                  {saving ? "Saving..." : editingEvent ? "Save Changes" : "Create Event 🎪"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EventsInner />
    </Suspense>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: "#555", fontWeight: 700, display: "block", marginBottom: 6, letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" };

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
