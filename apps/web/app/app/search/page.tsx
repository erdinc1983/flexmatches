"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type UserResult = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  sports: string[] | null;
  fitness_level: string | null;
};

type CommunityResult = {
  id: string;
  name: string;
  description: string | null;
  sport: string | null;
  avatar_emoji: string;
};

type EventResult = {
  id: string;
  title: string;
  sport: string;
  event_date: string;
  location: string | null;
};

const LEVEL_COLOR: Record<string, string> = {
  beginner: "#22c55e",
  intermediate: "#f59e0b",
  advanced: "#FF4500",
};

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"people" | "communities" | "events">("people");
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState<UserResult[]>([]);
  const [communities, setCommunities] = useState<CommunityResult[]>([]);
  const [events, setEvents] = useState<EventResult[]>([]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (query.trim().length >= 2) runSearch(query.trim()); else clearResults(); }, 300);
    return () => clearTimeout(t);
  }, [query, tab]);

  function clearResults() { setUsers([]); setCommunities([]); setEvents([]); }

  async function runSearch(q: string) {
    setLoading(true);
    if (tab === "people") {
      const { data } = await supabase
        .from("users")
        .select("id, username, full_name, avatar_url, city, sports, fitness_level, privacy_settings")
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%,city.ilike.%${q}%`)
        .limit(20);
      setUsers((data ?? []).filter((u: any) => !(u.privacy_settings as any)?.hide_profile));
    } else if (tab === "communities") {
      const { data } = await supabase
        .from("communities")
        .select("id, name, description, sport, avatar_emoji")
        .or(`name.ilike.%${q}%,description.ilike.%${q}%,sport.ilike.%${q}%`)
        .limit(20);
      setCommunities(data ?? []);
    } else {
      const { data } = await supabase
        .from("events")
        .select("id, title, sport, event_date, location")
        .or(`title.ilike.%${q}%,sport.ilike.%${q}%,location.ilike.%${q}%`)
        .gte("event_date", new Date().toISOString().slice(0, 10))
        .limit(20);
      setEvents(data ?? []);
    }
    setLoading(false);
  }

  const isEmpty = query.trim().length >= 2 && !loading && users.length === 0 && communities.length === 0 && events.length === 0;

  return (
    <div style={{ padding: "16px 16px", paddingBottom: 90, maxWidth: 480, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, marginTop: 4 }}>
        <button onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
          <span style={{ fontSize: 16, color: "#555" }}>🔎</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, communities, events…"
            style={{ flex: 1, background: "none", border: "none", color: "#fff", fontSize: 15, outline: "none" }}
          />
          {query && (
            <button onClick={() => { setQuery(""); clearResults(); }}
              style={{ background: "none", border: "none", color: "#555", fontSize: 16, cursor: "pointer", padding: 0 }}>✕</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#111", borderRadius: 12, padding: 3, marginBottom: 16 }}>
        {(["people", "communities", "events"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); if (query.trim().length >= 2) runSearch(query.trim()); }}
            style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", background: tab === t ? "#FF4500" : "transparent", color: tab === t ? "#fff" : "#555", fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>
            {t === "people" ? "👤 People" : t === "communities" ? "🌍 Communities" : "📅 Events"}
          </button>
        ))}
      </div>

      {/* Empty prompt */}
      {query.trim().length < 2 && (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔎</div>
          <p style={{ color: "#888", fontSize: 15, fontWeight: 700 }}>Find your fitness people</p>
          <p style={{ color: "#444", fontSize: 13, marginTop: 8 }}>Search by name, sport, city, or community</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
          <div style={{ width: 28, height: 28, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* No results */}
      {isEmpty && (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>😕</div>
          <p style={{ color: "#888", fontWeight: 700 }}>No results for "{query}"</p>
          <p style={{ color: "#444", fontSize: 13, marginTop: 8 }}>Try a different name or sport</p>
        </div>
      )}

      {/* People results */}
      {tab === "people" && !loading && users.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 4 }}>{users.length} PEOPLE FOUND</div>
          {users.map((u) => (
            <div key={u.id} onClick={() => router.push(`/u/${u.username}`)}
              style={{ background: "#111", borderRadius: 14, padding: "14px 16px", border: "1px solid #1a1a1a", cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" style={{ width: 46, height: 46, borderRadius: 23, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 46, height: 46, borderRadius: 23, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {u.username[0].toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>@{u.username}</div>
                {u.full_name && <div style={{ fontSize: 12, color: "#666", marginTop: 1 }}>{u.full_name}</div>}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {u.fitness_level && (
                    <span style={{ fontSize: 10, color: LEVEL_COLOR[u.fitness_level], background: "#0f0f0f", borderRadius: 999, padding: "2px 8px", border: `1px solid ${LEVEL_COLOR[u.fitness_level]}44`, fontWeight: 700 }}>
                      {u.fitness_level}
                    </span>
                  )}
                  {u.city && <span style={{ fontSize: 10, color: "#888", background: "#0f0f0f", borderRadius: 999, padding: "2px 8px", border: "1px solid #2a2a2a" }}>📍 {u.city}</span>}
                  {(u.sports ?? []).slice(0, 2).map((s) => (
                    <span key={s} style={{ fontSize: 10, color: "#FF4500", background: "#1a0800", borderRadius: 999, padding: "2px 8px", border: "1px solid #FF450033" }}>{s}</span>
                  ))}
                </div>
              </div>
              <span style={{ color: "#333", fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* Communities results */}
      {tab === "communities" && !loading && communities.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 4 }}>{communities.length} COMMUNITIES FOUND</div>
          {communities.map((c) => (
            <div key={c.id} onClick={() => router.push(`/app/communities/${c.id}`)}
              style={{ background: "#111", borderRadius: 14, padding: "14px 16px", border: "1px solid #1a1a1a", cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: "#1a1a1a", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                {c.avatar_emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{c.name}</div>
                {c.sport && <span style={{ fontSize: 11, color: "#FF4500", background: "#1a0800", borderRadius: 999, padding: "2px 8px", border: "1px solid #FF450033", marginTop: 4, display: "inline-block" }}>{c.sport}</span>}
                {c.description && <div style={{ fontSize: 12, color: "#555", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description}</div>}
              </div>
              <span style={{ color: "#333", fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* Events results */}
      {tab === "events" && !loading && events.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 4 }}>{events.length} EVENTS FOUND</div>
          {events.map((e) => (
            <div key={e.id} onClick={() => router.push("/app/events")}
              style={{ background: "#111", borderRadius: 14, padding: "14px 16px", border: "1px solid #1a1a1a", cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: "#1a0800", border: "1px solid #FF450033", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                📅
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{e.title}</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                  {e.sport} · {new Date(e.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
                {e.location && <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>📍 {e.location}</div>}
              </div>
              <span style={{ color: "#333", fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
