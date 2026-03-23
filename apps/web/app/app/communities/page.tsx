"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ACTIVITY_CATEGORIES: Record<string, { label: string; emoji: string; activities: string[] }> = {
  fitness: { label: "Fitness", emoji: "💪", activities: ["Gym", "CrossFit", "Pilates", "Yoga"] },
  sports:  { label: "Sports",  emoji: "⚽", activities: ["Running", "Cycling", "Swimming", "Soccer", "Football", "Basketball", "Tennis", "Boxing"] },
  mind:    { label: "Mind Games", emoji: "♟️", activities: ["Chess", "Backgammon", "Board Games"] },
  outdoor: { label: "Outdoor", emoji: "🌿", activities: ["Hiking", "Climbing", "Kayaking"] },
};

const ALL_ACTIVITIES = Object.values(ACTIVITY_CATEGORIES).flatMap((c) => c.activities);

const ACTIVITY_EMOJI: Record<string, string> = {
  Gym: "🏋️", CrossFit: "💪", Pilates: "🧘", Yoga: "🧘",
  Running: "🏃", Cycling: "🚴", Swimming: "🏊", Football: "⚽",
  Basketball: "🏀", Tennis: "🎾", Boxing: "🥊",
  Chess: "♟️", Backgammon: "🎲", "Board Games": "🎯",
  Hiking: "🏔️", Climbing: "🧗", Kayaking: "🛶",
};

const EMOJIS = ["🏋️", "🏃", "🚴", "🏊", "⚽", "🏀", "🎾", "🥊", "🧘", "💪", "♟️", "🎲", "🎯", "🏔️", "🧗", "🛶", "🔥", "⚡"];

type Community = {
  id: string;
  name: string;
  description: string | null;
  sport: string | null;
  city: string | null;
  avatar_emoji: string;
  creator_id: string;
  member_count: number;
  is_member: boolean;
};

export default function CommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formActivity, setFormActivity] = useState("Gym");
  const [formCity, setFormCity] = useState("");
  const [formEmoji, setFormEmoji] = useState("🏋️");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [loadError, setLoadError] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  // Venue map picker (optional helper)
  type VenueResult = { display_name: string; lat: string; lon: string };
  type MapVenue = { name: string; lat: number; lon: number; address: string; category: string; emoji: string };
  const [selectedVenue, setSelectedVenue] = useState<VenueResult | null>(null);
  const [showVenueMap, setShowVenueMap] = useState(false);
  const [venueMapLoading, setVenueMapLoading] = useState(false);
  const [mapVenues, setMapVenues] = useState<MapVenue[]>([]);
  const [venueCatFilter, setVenueCatFilter] = useState("All");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const venueMapDivRef = useRef<HTMLDivElement>(null);
  const venueLeafletRef = useRef<any>(null);
  const venueLayerRef = useRef<any>(null);

  function getVenueCategory(tags: any): { category: string; emoji: string } {
    const sport = (tags?.sport ?? "").toLowerCase();
    const leisure = (tags?.leisure ?? "").toLowerCase();
    if (sport.includes("swimming") || leisure === "swimming_pool") return { category: "Swimming", emoji: "🏊" };
    if (sport.includes("soccer") || sport.includes("football") || (leisure === "pitch" && !sport)) return { category: "Football", emoji: "⚽" };
    if (sport.includes("basketball")) return { category: "Basketball", emoji: "🏀" };
    if (sport.includes("tennis")) return { category: "Tennis", emoji: "🎾" };
    if (sport.includes("boxing") || sport.includes("martial")) return { category: "Boxing", emoji: "🥊" };
    if (sport.includes("cycling") || sport.includes("bicycle")) return { category: "Cycling", emoji: "🚴" };
    if (sport.includes("running") || sport.includes("athletics") || leisure === "track") return { category: "Running", emoji: "🏃" };
    if (leisure === "fitness_centre" || sport.includes("fitness") || sport.includes("gym") || sport.includes("crossfit")) return { category: "Gym", emoji: "🏋️" };
    if (leisure === "sports_centre") return { category: "Sports Centre", emoji: "🏟️" };
    return { category: "Other", emoji: "📍" };
  }

  const SPORT_TO_CAT: Record<string, string> = {
    Gym: "Gym", CrossFit: "Gym", Pilates: "Gym", Yoga: "Gym",
    Swimming: "Swimming", Football: "Football", Basketball: "Basketball",
    Tennis: "Tennis", Boxing: "Boxing", Cycling: "Cycling",
    Running: "Running", Hiking: "Running",
  };

  async function openVenueMap() {
    setShowVenueMap(true);
    setVenueMapLoading(true);
    let lat = userLat, lng = userLng;
    if (!lat || !lng) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 }));
        lat = pos.coords.latitude; lng = pos.coords.longitude;
        setUserLat(lat); setUserLng(lng);
      } catch { setVenueMapLoading(false); return; }
    }
    try {
      const q = `[out:json][timeout:30];(node["leisure"~"fitness_centre|pitch|sports_centre|swimming_pool"](around:5000,${lat},${lng});way["leisure"~"fitness_centre|pitch|sports_centre|swimming_pool"](around:5000,${lat},${lng});node["sport"~"fitness|soccer|football|basketball|tennis|swimming|running|cycling|gym"](around:5000,${lat},${lng});way["sport"~"fitness|soccer|football|basketball|tennis|swimming|running|cycling|gym"](around:5000,${lat},${lng}););out center;`;
      const r = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
      const d = await r.json();
      const venues: MapVenue[] = (d.elements ?? []).slice(0, 100).map((el: any) => {
        const { category, emoji } = getVenueCategory(el.tags);
        return {
          name: el.tags?.name ?? el.tags?.sport ?? "Sports Facility",
          lat: el.lat ?? el.center?.lat,
          lon: el.lon ?? el.center?.lon,
          address: [el.tags?.["addr:street"], el.tags?.["addr:city"]].filter(Boolean).join(", "),
          category, emoji,
        };
      }).filter((v: MapVenue) => v.lat && v.lon);
      setMapVenues(venues);
      const sportCat = SPORT_TO_CAT[formActivity];
      const hasMatchingCat = venues.some((v) => v.category === sportCat);
      setVenueCatFilter(hasMatchingCat && sportCat ? sportCat : "All");
    } catch {}
    setVenueMapLoading(false);
  }

  function closeVenueMap() {
    if (venueLeafletRef.current) { venueLeafletRef.current.remove(); venueLeafletRef.current = null; }
    venueLayerRef.current = null;
    setShowVenueMap(false);
    setMapVenues([]);
  }

  function pickVenue(v: MapVenue) {
    setSelectedVenue({ display_name: v.name + (v.address ? ", " + v.address : ""), lat: String(v.lat), lon: String(v.lon) });
    closeVenueMap();
  }

  useEffect(() => {
    if (!showVenueMap || !userLat || !userLng) return;
    function initMap() {
      if (!venueMapDivRef.current || venueLeafletRef.current) return;
      const L = (window as any).L;
      if (!L) return;
      const map = L.map(venueMapDivRef.current).setView([userLat!, userLng!], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors", maxZoom: 19,
      }).addTo(map);
      L.circleMarker([userLat!, userLng!], {
        radius: 10, fillColor: "#FF4500", color: "#fff", weight: 2, fillOpacity: 1,
      }).addTo(map).bindPopup("<b>You are here</b>");
      venueLayerRef.current = L.layerGroup().addTo(map);
      venueLeafletRef.current = map;
      window.dispatchEvent(new Event("venue-map-ready"));
    }
    if ((window as any).L) { setTimeout(initMap, 50); return; }
    if (!document.querySelector('link[href*="leaflet@"]')) {
      const link = document.createElement("link"); link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(link);
    }
    if (!document.querySelector('script[src*="leaflet@"]')) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setTimeout(initMap, 50); document.head.appendChild(script);
    }
  }, [showVenueMap, userLat, userLng]);

  useEffect(() => {
    function updateMarkers() {
      if (!venueLayerRef.current || !venueLeafletRef.current) return;
      const L = (window as any).L;
      if (!L) return;
      venueLayerRef.current.clearLayers();
      mapVenues.forEach((v) => {
        const markerIcon = L.divIcon({
          html: `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">${v.emoji}</div>`,
          className: "", iconSize: [28, 28], iconAnchor: [14, 14],
        });
        L.marker([v.lat, v.lon], { icon: markerIcon })
          .addTo(venueLayerRef.current)
          .bindPopup(`<b>${v.emoji} ${v.name}</b><br/><span style="color:#888;font-size:12px">${v.category}</span>${v.address ? `<br/><span style="color:#666">${v.address}</span>` : ""}`)
          .on("click", () => pickVenue(v));
      });
    }
    updateMarkers();
    window.addEventListener("venue-map-ready", updateMarkers);
    return () => window.removeEventListener("venue-map-ready", updateMarkers);
  }, [mapVenues]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: comms } = await supabase
        .from("communities")
        .select("id, name, description, sport, city, avatar_emoji, creator_id")
        .order("created_at", { ascending: false });

      const { data: memberships } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", user.id);

      const joinedIds = new Set((memberships ?? []).map((m: any) => m.community_id));

      const ids = (comms ?? []).map((c: any) => c.id);
      let countMap: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: counts } = await supabase
          .from("community_members")
          .select("community_id")
          .in("community_id", ids);
        for (const row of counts ?? []) {
          countMap[row.community_id] = (countMap[row.community_id] ?? 0) + 1;
        }
      }

      setCommunities((comms ?? []).map((c: any) => ({
        ...c,
        member_count: countMap[c.id] ?? 0,
        is_member: joinedIds.has(c.id),
      })));
      setLoading(false);
    } catch {
      setLoadError(true);
      setLoading(false);
    }
  }

  async function joinOrLeave(communityId: string, isMember: boolean) {
    if (!userId) return;
    if (isMember) {
      await supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", userId);
      showToast("Left circle");
    } else {
      await supabase.from("community_members").insert({ community_id: communityId, user_id: userId });
      showToast("Joined! 🎉");
    }
    setCommunities((prev) => prev.map((c) =>
      c.id === communityId
        ? { ...c, is_member: !isMember, member_count: isMember ? c.member_count - 1 : c.member_count + 1 }
        : c
    ));
  }

  async function createCommunity() {
    if (!userId || !formName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("communities").insert({
      name: formName.trim(),
      description: formDesc.trim() || null,
      sport: formActivity,
      city: formCity.trim() || null,
      creator_id: userId,
      avatar_emoji: formEmoji,
      venue_name: selectedVenue ? selectedVenue.display_name.split(",")[0].trim() : null,
      venue_lat: selectedVenue ? parseFloat(selectedVenue.lat) : null,
      venue_lon: selectedVenue ? parseFloat(selectedVenue.lon) : null,
    }).select().single();

    if (!error && data) {
      await supabase.from("community_members").insert({ community_id: data.id, user_id: userId });
      setShowCreate(false);
      setFormName(""); setFormDesc(""); setFormActivity("Gym"); setFormCity(""); setFormEmoji("🏋️");
      setSelectedVenue(null);
      setSaving(false);
      router.push(`/app/communities/${data.id}`);
    } else {
      setSaving(false);
    }
  }

  // Filter communities
  const filtered = communities.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q) || c.sport?.toLowerCase().includes(q);
    const catActivities = filterCat ? ACTIVITY_CATEGORIES[filterCat]?.activities ?? [] : [];
    const matchCat = !filterCat || (c.sport != null && catActivities.includes(c.sport));
    return matchSearch && matchCat;
  });

  const myCircles = filtered.filter((c) => c.is_member);
  const discover = filtered.filter((c) => !c.is_member);

  if (loadError) return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)", marginBottom: 8 }}>Couldn't load</div>
      <div style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>Check your connection and try again.</div>
      <button onClick={() => { setLoadError(false); setLoading(true); loadData(); }} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Try Again</button>
    </div>
  );

  if (loading) return (
    <div style={{ padding: "20px 16px", paddingBottom: 80 }}>
      <div style={{ height: 32, width: "50%", borderRadius: 8, background: "linear-gradient(90deg, var(--bg-card-alt) 25%, var(--border) 50%, var(--bg-card-alt) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", marginBottom: 20 }} />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ borderRadius: 16, padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", marginBottom: 10 }}>
          <div style={{ height: 16, width: "60%", borderRadius: 8, background: "linear-gradient(90deg, var(--bg-card-alt) 25%, var(--border) 50%, var(--bg-card-alt) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
          <div style={{ height: 12, width: "80%", borderRadius: 8, background: "linear-gradient(90deg, var(--bg-card-alt) 25%, var(--border) 50%, var(--bg-card-alt) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", marginTop: 10 }} />
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ padding: "20px 16px", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.5, margin: 0, fontFamily: "var(--font-display)" }}>Circles</h1>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Your local activity circles</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ background: "var(--accent)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, borderRadius: 12, padding: "10px 16px", cursor: "pointer" }}>
          + New Circle
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "var(--text-faint)" }}>🔍</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search circles..."
          style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: "10px 12px 10px 34px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 20, scrollbarWidth: "none" }}>
        <button onClick={() => setFilterCat("")}
          style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 999, fontWeight: 700, fontSize: 12, border: `1.5px solid ${!filterCat ? "var(--accent)" : "var(--bg-input)"}`, background: !filterCat ? "var(--accent)" : "transparent", color: !filterCat ? "#fff" : "var(--text-faint)", cursor: "pointer" }}>
          All
        </button>
        {Object.entries(ACTIVITY_CATEGORIES).map(([key, cat]) => (
          <button key={key} onClick={() => setFilterCat(filterCat === key ? "" : key)}
            style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 999, fontWeight: 700, fontSize: 12, border: `1.5px solid ${filterCat === key ? "var(--accent)" : "var(--bg-input)"}`, background: filterCat === key ? "var(--accent)" : "transparent", color: filterCat === key ? "#fff" : "var(--text-faint)", cursor: "pointer", whiteSpace: "nowrap" }}>
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* My Circles */}
      {myCircles.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>MY CIRCLES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myCircles.map((c) => <CircleCard key={c.id} community={c} onOpen={() => router.push(`/app/communities/${c.id}`)} onJoinLeave={joinOrLeave} />)}
          </div>
        </div>
      )}

      {/* Discover */}
      <div>
        {(myCircles.length > 0 || discover.length > 0) && (
          <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>
            {myCircles.length > 0 ? "DISCOVER CIRCLES" : "ALL CIRCLES"}
          </div>
        )}
        {discover.length === 0 && myCircles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌀</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)", marginBottom: 8 }}>No circles yet</div>
            <div style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Be the first to start a local activity circle.<br />Chess in the park? Gym squad? You name it.
            </div>
            <button onClick={() => setShowCreate(true)} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              + Create First Circle
            </button>
          </div>
        ) : discover.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 20 }}>
            <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 12 }}>You're in all the circles around here. Or start a new one!</p>
            <button onClick={() => setShowCreate(true)}
              style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              + New Circle
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {discover.map((c) => <CircleCard key={c.id} community={c} onOpen={() => router.push(`/app/communities/${c.id}`)} onJoinLeave={joinOrLeave} />)}
          </div>
        )}
      </div>

      {/* Venue Map Modal */}
      {showVenueMap && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", background: "var(--bg-page)" }}>
          <div style={{ flexShrink: 0, background: "var(--bg-card)", borderBottom: "1px solid var(--border)", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 17 }}>🗺️ Find a Spot</span>
              <button onClick={closeVenueMap} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>✕</button>
            </div>
            <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 4 }}>Tap a marker or pick from the list</p>
          </div>
          {venueMapLoading && (
            <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", gap: 12 }}>
              <div style={{ width: 36, height: 36, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Loading nearby spots...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
          <div ref={venueMapDivRef} style={{ flex: 1, minHeight: 0 }} />
          {mapVenues.length > 0 && (() => {
            const cats = ["All", ...Array.from(new Set(mapVenues.map((v) => v.category)))];
            const filteredVenues = venueCatFilter === "All" ? mapVenues : mapVenues.filter((v) => v.category === venueCatFilter);
            return (
              <div style={{ flexShrink: 0, background: "var(--bg-card)", borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "10px 12px 8px", scrollbarWidth: "none" }}>
                  {cats.map((cat) => {
                    const catVenue = mapVenues.find((v) => v.category === cat);
                    const catEmoji = cat === "All" ? "🗺️" : (catVenue?.emoji ?? "📍");
                    const count = cat === "All" ? mapVenues.length : mapVenues.filter((v) => v.category === cat).length;
                    const active = venueCatFilter === cat;
                    return (
                      <button key={cat} onClick={() => setVenueCatFilter(cat)}
                        style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 999, border: `1.5px solid ${active ? "var(--accent)" : "var(--border-medium)"}`, background: active ? "var(--accent)" : "var(--bg-card-alt)", color: active ? "#fff" : "var(--text-secondary)", fontWeight: 700, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                        {catEmoji} {cat} <span style={{ opacity: 0.7 }}>({count})</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ maxHeight: "28vh", overflowY: "auto", padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>
                    {filteredVenues.length} SPOTS — tap to select
                  </div>
                  {filteredVenues.map((v, i) => (
                    <button key={i} onClick={() => pickVenue(v)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 12, background: "var(--bg-card-alt)", border: "1px solid var(--border)", cursor: "pointer", textAlign: "left", width: "100%" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14 }}>{v.emoji} {v.name}</div>
                        <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginTop: 2 }}>{v.category}</div>
                        {v.address && <div style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 1 }}>{v.address}</div>}
                      </div>
                      <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 13, flexShrink: 0, marginLeft: 8 }}>Select →</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          {!venueMapLoading && mapVenues.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", background: "var(--bg-card)", borderTop: "1px solid var(--border)" }}>
              <p style={{ color: "var(--text-faint)", fontSize: 14 }}>No venues found nearby.</p>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          background: "var(--text-primary)", color: "var(--bg-page)",
          padding: "12px 20px", borderRadius: 999, fontWeight: 700, fontSize: 14,
          zIndex: 9999, whiteSpace: "nowrap", animation: "slideUp 0.2s ease",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
        }}>{toast}</div>
      )}

      {/* Create Circle Modal */}
      {showCreate && (
        <div onClick={() => setShowCreate(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", border: "1px solid var(--border)" }}>

            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-strong)", margin: "0 auto 20px" }} />
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Create a Circle</h2>
            <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 20 }}>A local group for your activity</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Emoji picker */}
              <div>
                <label style={labelStyle}>ICON</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => setFormEmoji(e)}
                      style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${formEmoji === e ? "var(--accent)" : "var(--bg-input)"}`, background: formEmoji === e ? "#FF450022" : "var(--bg-card-alt)", fontSize: 20, cursor: "pointer" }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>NAME *</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Willow Grove Chess Club"
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>DESCRIPTION</label>
                <div style={{ position: "relative" }}>
                  <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="What's this circle about?"
                    rows={3} maxLength={300} style={{ ...inputStyle, resize: "none", paddingBottom: 28 } as React.CSSProperties} />
                  <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 11, color: formDesc.length > 280 ? "var(--error, #ef4444)" : "var(--text-faint)", fontWeight: 600 }}>
                    {formDesc.length}/300
                  </div>
                </div>
              </div>

              {/* Activity picker with categories */}
              <div>
                <label style={labelStyle}>ACTIVITY</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(ACTIVITY_CATEGORIES).map(([key, cat]) => (
                    <div key={key}>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, marginBottom: 6, letterSpacing: 0.3 }}>
                        {cat.emoji} {cat.label.toUpperCase()}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {cat.activities.map((a) => (
                          <button key={a} onClick={() => { setFormActivity(a); setFormEmoji(ACTIVITY_EMOJI[a] ?? "🎯"); }}
                            style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${formActivity === a ? "var(--accent)" : "var(--bg-input)"}`, background: formActivity === a ? "var(--accent)" : "transparent", color: formActivity === a ? "#fff" : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                            {ACTIVITY_EMOJI[a]} {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>CITY (OPTIONAL)</label>
                <input value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="e.g. Philadelphia"
                  style={inputStyle} />
              </div>

              {/* Venue Picker */}
              <div>
                <label style={labelStyle}>DEFAULT SPOT (OPTIONAL)</label>
                {selectedVenue ? (
                  <div style={{ background: "var(--bg-card-alt)", border: "1px solid var(--success)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>📍 {selectedVenue.display_name.split(",")[0].trim()}</div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{selectedVenue.display_name.split(",").slice(1, 3).join(",").trim()}</div>
                    </div>
                    <button onClick={() => setSelectedVenue(null)}
                      style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 18, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>✕</button>
                  </div>
                ) : (
                  <button onClick={openVenueMap}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px dashed var(--border-medium)", background: "var(--bg-card-alt)", color: "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                    🗺️ Find a spot on map…
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, paddingBottom: 16 }}>
                <button onClick={() => setShowCreate(false)}
                  style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={createCommunity} disabled={saving || !formName.trim()}
                  style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: formName.trim() ? "var(--accent)" : "var(--bg-card-alt)", color: formName.trim() ? "#fff" : "var(--text-faint)", fontWeight: 700, fontSize: 15, cursor: formName.trim() ? "pointer" : "default", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Creating..." : "Create Circle 🌀"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CircleCard({ community, onOpen, onJoinLeave }: {
  community: Community;
  onOpen: () => void;
  onJoinLeave: (id: string, isMember: boolean) => void;
}) {
  const catEntry = Object.values(ACTIVITY_CATEGORIES).find((cat) =>
    community.sport != null && cat.activities.includes(community.sport)
  );
  const activityEmoji = community.sport ? (ACTIVITY_EMOJI[community.sport] ?? "🎯") : null;

  return (
    <div style={{ background: "var(--bg-card-alt)", borderRadius: 16, padding: 16, border: `1px solid ${community.is_member ? "var(--accent)" : "var(--border-medium)"}`, cursor: "pointer", boxShadow: "var(--shadow-card)" }}
      onClick={onOpen}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0, border: "1px solid var(--border-medium)" }}>
          {community.avatar_emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15, marginBottom: 4 }}>{community.name}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {community.sport && (
              <span style={{ fontSize: 11, color: "var(--accent)", background: "var(--bg-card-alt)", borderRadius: 999, padding: "2px 8px", border: "1px solid var(--border-medium)", fontWeight: 700 }}>
                {activityEmoji} {community.sport}
              </span>
            )}
            {catEntry && (
              <span style={{ fontSize: 11, color: "var(--text-faint)", background: "var(--bg-card-alt)", borderRadius: 999, padding: "2px 8px", border: "1px solid var(--border-medium)" }}>
                {catEntry.label}
              </span>
            )}
            {community.city && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-card-alt)", borderRadius: 999, padding: "2px 8px", border: "1px solid var(--border-medium)" }}>
                📍 {community.city}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
            👥 {community.member_count} {community.member_count === 1 ? "member" : "members"}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onJoinLeave(community.id, community.is_member); }}
          style={{
            flexShrink: 0, padding: "8px 16px", borderRadius: 999, fontWeight: 700, fontSize: 12, cursor: "pointer",
            background: community.is_member ? "transparent" : "var(--accent)",
            border: community.is_member ? "1px solid var(--border-strong)" : "none",
            color: community.is_member ? "var(--text-faint)" : "#fff",
          }}>
          {community.is_member ? "Joined ✓" : "Join"}
        </button>
      </div>
      {community.description && (
        <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 10, lineHeight: 1.5, margin: "10px 0 0" }}>{community.description}</p>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-faint)", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "11px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" };
