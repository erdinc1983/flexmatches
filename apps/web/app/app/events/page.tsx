"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { awardBadge } from "../../../lib/badges";

const SPORTS = ["Gym", "Running", "Cycling", "Swimming", "Football", "Basketball", "Tennis", "Boxing", "Yoga", "CrossFit", "Pilates", "Hiking", "Other"];

type Event = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  sport: string | null;
  location_name: string | null;
  event_date: string;
  max_participants: number;
  created_at: string;
  creator_username?: string;
  participant_count?: number;
  is_joined?: boolean;
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSport, setFormSport] = useState("Gym");
  const [formLocation, setFormLocation] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formMax, setFormMax] = useState("10");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: eventsRaw } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(50);

    if (!eventsRaw) { setLoading(false); return; }

    // Fetch creators
    const creatorIds = [...new Set(eventsRaw.map((e: any) => e.creator_id))];
    const { data: creators } = await supabase.from("users").select("id, username").in("id", creatorIds);
    const creatorMap = Object.fromEntries((creators ?? []).map((u: any) => [u.id, u.username]));

    // Fetch participant counts + join status
    const eventIds = eventsRaw.map((e: any) => e.id);
    const { data: participants } = await supabase
      .from("event_participants")
      .select("event_id, user_id")
      .in("event_id", eventIds);

    const countMap: Record<string, number> = {};
    const joinedSet = new Set<string>();
    for (const p of participants ?? []) {
      countMap[(p as any).event_id] = (countMap[(p as any).event_id] ?? 0) + 1;
      if ((p as any).user_id === user.id) joinedSet.add((p as any).event_id);
    }

    setEvents(eventsRaw.map((e: any) => ({
      ...e,
      creator_username: creatorMap[e.creator_id] ?? "unknown",
      participant_count: countMap[e.id] ?? 0,
      is_joined: joinedSet.has(e.id),
    })));
    setLoading(false);
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
    }).select().single();

    if (!error && data) {
      // Auto-join as creator
      await supabase.from("event_participants").insert({ event_id: data.id, user_id: userId });
      await awardBadge(userId, "event_organizer");
    }
    setSaving(false);
    setShowForm(false);
    resetForm();
    loadEvents();
  }

  async function toggleJoin(event: Event) {
    if (!userId) return;
    if (event.is_joined) {
      if (event.creator_id === userId) return; // creator can't leave
      await supabase.from("event_participants").delete()
        .eq("event_id", event.id).eq("user_id", userId);
    } else {
      if ((event.participant_count ?? 0) >= event.max_participants) return;
      await supabase.from("event_participants").insert({ event_id: event.id, user_id: userId });
    }
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
  }

  function openForm() { resetForm(); setShowForm(true); }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>Events</h1>
        <button onClick={openForm}
          style={{ background: "#FF4500", border: "none", borderRadius: 12, padding: "9px 16px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          + Create
        </button>
      </div>

      {/* Empty state */}
      {events.length === 0 && (
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <div style={{ fontSize: 56 }}>🎪</div>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 18, marginTop: 16 }}>No upcoming events</p>
          <p style={{ color: "#555", marginTop: 8, marginBottom: 24 }}>Be the first to organize a fitness event!</p>
          <button onClick={openForm}
            style={{ background: "#FF4500", border: "none", borderRadius: 14, padding: "14px 32px", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            Create Event
          </button>
        </div>
      )}

      {/* Events List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {events.map((event) => {
          const full = (event.participant_count ?? 0) >= event.max_participants && !event.is_joined;
          const isOwner = event.creator_id === userId;
          return (
            <div key={event.id} onClick={() => setSelectedEvent(event)}
              style={{ background: "#1a1a1a", borderRadius: 18, padding: 16, border: `1px solid ${event.is_joined ? "#FF450044" : "#2a2a2a"}`, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>{event.title}</div>
                  {event.sport && (
                    <span style={{ fontSize: 11, color: "#FF4500", background: "#1a0800", borderRadius: 999, padding: "2px 8px", border: "1px solid #FF450033", fontWeight: 600, display: "inline-block", marginTop: 4 }}>
                      {event.sport}
                    </span>
                  )}
                </div>
                {isOwner && <span style={{ fontSize: 11, color: "#888", background: "#222", borderRadius: 6, padding: "2px 8px" }}>yours</span>}
              </div>

              <div style={{ fontSize: 13, color: "#FF4500", fontWeight: 600, marginBottom: 6 }}>📅 {formatDate(event.event_date)}</div>
              {event.location_name && <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>📍 {event.location_name}</div>}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#666" }}>
                  👥 {event.participant_count}/{event.max_participants} joined
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleJoin(event); }}
                  disabled={full || (event.is_joined && isOwner)}
                  style={{
                    padding: "6px 14px", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: full ? "default" : "pointer",
                    background: event.is_joined ? "#1a1a1a" : full ? "#222" : "#FF4500",
                    color: event.is_joined ? "#FF4500" : full ? "#555" : "#fff",
                    border: event.is_joined ? "1px solid #FF4500" : "1px solid transparent",
                  } as React.CSSProperties}>
                  {event.is_joined ? "✓ Joined" : full ? "Full" : "Join"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div onClick={() => setSelectedEvent(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, maxHeight: "85dvh", overflowY: "auto", border: "1px solid #1a1a1a" } as React.CSSProperties}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />

            <div style={{ fontWeight: 800, color: "#fff", fontSize: 20, marginBottom: 8 }}>{selectedEvent.title}</div>
            {selectedEvent.sport && (
              <span style={{ fontSize: 12, color: "#FF4500", background: "#1a0800", borderRadius: 999, padding: "3px 12px", border: "1px solid #FF450033", fontWeight: 700, display: "inline-block", marginBottom: 16 }}>
                {selectedEvent.sport}
              </span>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: "#FF4500", fontWeight: 600 }}>📅 {formatDate(selectedEvent.event_date)}</div>
              {selectedEvent.location_name && <div style={{ fontSize: 14, color: "#ccc" }}>📍 {selectedEvent.location_name}</div>}
              <div style={{ fontSize: 14, color: "#888" }}>👥 {selectedEvent.participant_count}/{selectedEvent.max_participants} participants</div>
              <div style={{ fontSize: 13, color: "#666" }}>Organized by @{selectedEvent.creator_username}</div>
            </div>

            {selectedEvent.description && (
              <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 20 }}>{selectedEvent.description}</p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              {selectedEvent.creator_id === userId ? (
                <button onClick={() => deleteEvent(selectedEvent.id)}
                  style={{ flex: 1, padding: 14, borderRadius: 14, border: "1px solid #333", background: "transparent", color: "#ff6b6b", fontWeight: 700, cursor: "pointer" }}>
                  Delete Event
                </button>
              ) : (
                <button onClick={() => { toggleJoin(selectedEvent); setSelectedEvent(null); }}
                  disabled={(selectedEvent.participant_count ?? 0) >= selectedEvent.max_participants && !selectedEvent.is_joined}
                  style={{ flex: 1, padding: 14, borderRadius: 14, border: selectedEvent.is_joined ? "1px solid #FF4500" : "none", background: selectedEvent.is_joined ? "transparent" : "#FF4500", color: selectedEvent.is_joined ? "#FF4500" : "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
                  {selectedEvent.is_joined ? "Leave Event" : "Join Event 💪"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showForm && (
        <div onClick={() => setShowForm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, maxHeight: "90dvh", overflowY: "auto", border: "1px solid #1a1a1a", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>New Event</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>TITLE</label>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Morning Run in Central Park"
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>SPORT</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {SPORTS.map((s) => (
                    <button key={s} onClick={() => setFormSport(s)}
                      style={{ padding: "8px 4px", borderRadius: 10, border: `1px solid ${formSport === s ? "#FF4500" : "#2a2a2a"}`, background: formSport === s ? "#FF450022" : "transparent", color: formSport === s ? "#FF4500" : "#888", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>DATE</label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                    style={{ ...inputStyle, colorScheme: "dark" }} />
                </div>
                <div>
                  <label style={labelStyle}>TIME</label>
                  <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)}
                    style={{ ...inputStyle, colorScheme: "dark" }} />
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
                  min={2} max={100} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>DESCRIPTION (optional)</label>
                <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="What to bring, skill level, etc."
                  style={{ ...inputStyle, height: 80, resize: "none" }} />
              </div>

              <div style={{ display: "flex", gap: 10, paddingBottom: 24 }}>
                <button onClick={() => setShowForm(false)}
                  style={{ flex: 1, padding: 14, borderRadius: 14, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={createEvent} disabled={saving || !formTitle.trim() || !formDate || !formTime}
                  style={{ flex: 2, padding: 14, borderRadius: 14, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", opacity: (saving || !formTitle.trim() || !formDate || !formTime) ? 0.5 : 1 }}>
                  {saving ? "Creating..." : "Create Event 🎪"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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
