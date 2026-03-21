"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { sendPush } from "../../../lib/sendPush";
import { calcTier, checkAndAwardMatchBadges } from "../../../lib/badges";

type Privacy = { hide_age: boolean; hide_city: boolean; hide_weight: boolean };

type User = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  city: string | null;
  gym_name: string | null;
  fitness_level: "beginner" | "intermediate" | "advanced" | null;
  age: number | null;
  avatar_url: string | null;
  sports: string[] | null;
  gender: string | null;
  weight: number | null;
  target_weight: number | null;
  privacy_settings: Privacy | null;
  preferred_times: string[] | null;
  occupation: string | null;
  company: string | null;
  industry: string | null;
  distance_km?: number;
  matchScore?: number;
  tierEmoji?: string;
  is_pro?: boolean;
};

type MyProfile = {
  sports: string[] | null;
  fitness_level: string | null;
  preferred_times: string[] | null;
  industry: string | null;
};

const LEVEL_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

function calcMatchScore(me: MyProfile, other: User, distanceKm?: number): number {
  let score = 0;

  // Sports overlap: up to 30pts
  const mySports = me.sports ?? [];
  const otherSports = other.sports ?? [];
  if (mySports.length > 0 && otherSports.length > 0) {
    const overlap = mySports.filter((s) => otherSports.includes(s)).length;
    const maxPossible = Math.max(mySports.length, otherSports.length);
    score += Math.round((overlap / maxPossible) * 30);
  }

  // Fitness level: 20pts same, 10pts adjacent
  if (me.fitness_level && other.fitness_level) {
    const diff = Math.abs(LEVEL_ORDER[me.fitness_level] - LEVEL_ORDER[other.fitness_level]);
    if (diff === 0) score += 20;
    else if (diff === 1) score += 10;
  }

  // Preferred time overlap: up to 15pts
  const myTimes = me.preferred_times ?? [];
  const otherTimes = other.preferred_times ?? [];
  if (myTimes.length > 0 && otherTimes.length > 0) {
    const timeOverlap = myTimes.filter((t) => otherTimes.includes(t)).length;
    const maxTimes = Math.max(myTimes.length, otherTimes.length);
    score += Math.round((timeOverlap / maxTimes) * 15);
  }

  // Location: up to 20pts (only when distance is available)
  if (distanceKm != null) {
    if (distanceKm <= 2) score += 20;
    else if (distanceKm <= 5) score += 15;
    else if (distanceKm <= 10) score += 10;
    else if (distanceKm <= 20) score += 5;
  }

  // Industry match: 15pts
  if (me.industry && other.industry && me.industry === other.industry) score += 15;

  return Math.min(score, 100);
}

const SWIPE_THRESHOLD = 80;

function SwipeableCard({ onLike, onPass, onTap, children }: {
  onLike: () => void; onPass: () => void; onTap: () => void; children: React.ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const dxRef = useRef(0);
  const swipingRef = useRef(false);
  const animatingRef = useRef(false);

  function reset() {
    const el = cardRef.current; if (!el) return;
    el.style.transition = "transform 0.25s ease";
    el.style.transform = "";
    el.style.opacity = "1";
    const rl = el.querySelector("[data-rl]") as HTMLElement | null;
    const ll = el.querySelector("[data-ll]") as HTMLElement | null;
    if (rl) rl.style.opacity = "0";
    if (ll) ll.style.opacity = "0";
  }

  function onTouchStart(e: React.TouchEvent) {
    if (animatingRef.current) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    dxRef.current = 0; swipingRef.current = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (animatingRef.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = Math.abs(e.touches[0].clientY - startY.current);
    dxRef.current = dx;
    if (Math.abs(dx) > dy + 8) { swipingRef.current = true; e.preventDefault(); }
    if (!swipingRef.current) return;
    const el = cardRef.current; if (!el) return;
    el.style.transition = "none";
    el.style.transform = `translateX(${dx}px) rotate(${dx * 0.06}deg)`;
    const progress = Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1);
    const rl = el.querySelector("[data-rl]") as HTMLElement | null;
    const ll = el.querySelector("[data-ll]") as HTMLElement | null;
    if (rl) rl.style.opacity = dx > 0 ? String(progress) : "0";
    if (ll) ll.style.opacity = dx < 0 ? String(progress) : "0";
  }

  function onTouchEnd() {
    if (animatingRef.current) return;
    const dx = dxRef.current;
    const el = cardRef.current; if (!el) return;
    if (swipingRef.current && Math.abs(dx) >= SWIPE_THRESHOLD) {
      animatingRef.current = true;
      const dir = dx > 0;
      el.style.transition = "transform 0.3s ease, opacity 0.3s ease";
      el.style.transform = `translateX(${dir ? "130%" : "-130%"}) rotate(${dir ? 18 : -18}deg)`;
      el.style.opacity = "0";
      setTimeout(() => { animatingRef.current = false; if (dir) onLike(); else onPass(); }, 320);
    } else if (!swipingRef.current || Math.abs(dx) < 6) {
      reset(); onTap();
    } else {
      reset();
    }
  }

  return (
    <div ref={cardRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ position: "relative", userSelect: "none", touchAction: "pan-y" }}>
      <div data-rl style={{ position: "absolute", top: 14, left: 14, opacity: 0, pointerEvents: "none", zIndex: 10, transform: "rotate(-12deg)", transition: "none" }}>
        <span style={{ fontSize: 36, filter: "drop-shadow(0 2px 8px #22c55e)" }}>❤️</span>
      </div>
      <div data-ll style={{ position: "absolute", top: 14, right: 14, opacity: 0, pointerEvents: "none", zIndex: 10, transform: "rotate(12deg)", transition: "none" }}>
        <span style={{ fontSize: 36, filter: "drop-shadow(0 2px 8px #ef4444)" }}>✕</span>
      </div>
      {children}
    </div>
  );
}

const RADIUS_OPTIONS = [3, 6, 15, 30]; // miles → converted to km for query

const LEVEL_COLOR: Record<string, string> = {
  beginner: "var(--success)",
  intermediate: "#f59e0b",
  advanced: "var(--accent)",
};

const SPORTS_LIST = ["Gym", "Running", "Cycling", "Swimming", "Football", "Basketball", "Tennis", "Boxing", "Yoga", "CrossFit", "Pilates", "Hiking"];
const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"];
const TIME_LABELS: Record<string, string> = { morning: "🌅 Morning", afternoon: "☀️ Afternoon", evening: "🌙 Evening" };

function buildWhyMatch(me: MyProfile, other: User) {
  const sharedSports = (me.sports ?? []).filter((s) => other.sports?.includes(s));
  const sharedTimes = (me.preferred_times ?? []).filter((t) => other.preferred_times?.includes(t));
  const sameLevel = me.fitness_level && other.fitness_level && me.fitness_level === other.fitness_level;
  return [
    { icon: "🏋️", label: "Sports", value: sharedSports.length > 0 ? sharedSports.join(", ") : "No overlap", match: sharedSports.length > 0 },
    { icon: "🕐", label: "Training time", value: sharedTimes.length > 0 ? sharedTimes.map((t) => TIME_LABELS[t] ?? t).join(", ") : "Different schedules", match: sharedTimes.length > 0 },
    { icon: "⭐", label: "Fitness level", value: sameLevel ? (me.fitness_level ?? "-") : `You: ${me.fitness_level ?? "?"} · Them: ${other.fitness_level ?? "?"}`, match: !!sameLevel },
    { icon: "📍", label: "City", value: other.city ?? "Not set", match: false },
  ];
}

type MatchUser = { id: string; username: string; full_name: string | null; city: string | null; avatar_url: string | null; current_streak: number };
type Match = { id: string; status: string; sender_id: string; other_user: MatchUser };

export default function DiscoverPage() {
  const router = useRouter();
  const [discoverTab, setDiscoverTab] = useState<"discover" | "matches">("discover");

  // Matches tab state
  const [pending, setPending] = useState<Match[]>([]);
  const [accepted, setAccepted] = useState<Match[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [matchesLoaded, setMatchesLoaded] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  const [sortByScore, setSortByScore] = useState(true);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [mutualMatchUser, setMutualMatchUser] = useState<User | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>("");
  const [filterCity, setFilterCity] = useState("");
  const [filterSport, setFilterSport] = useState<string>("");
  const [filterTime, setFilterTime] = useState<string>("");
  const [filterGender, setFilterGender] = useState<string>("");
  const [filterFavorites, setFilterFavorites] = useState(false);

  // Location
  const [nearMe, setNearMe] = useState(false);
  const [radius, setRadius] = useState(6); // miles
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  // Map
  const [showMap, setShowMap] = useState(false);
  const [mapGyms, setMapGyms] = useState<Array<{ name: string; lat: number; lon: number; category: string }>>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapCategory, setMapCategory] = useState("all");
  const mapDivRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const gymLayerRef = useRef<any>(null);

  useEffect(() => { loadData(); }, []);

  async function loadMatches() {
    if (matchesLoaded) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: incomingRaw } = await supabase
      .from("matches").select("id, status, sender_id")
      .eq("receiver_id", user.id).eq("status", "pending");

    if (incomingRaw && incomingRaw.length > 0) {
      const { data: senderUsers } = await supabase.from("users")
        .select("id, username, full_name, city, avatar_url, current_streak")
        .in("id", incomingRaw.map((m: any) => m.sender_id));
      const map = Object.fromEntries((senderUsers ?? []).map((u: any) => [u.id, u]));
      setPending(incomingRaw.map((m: any) => ({ id: m.id, status: m.status, sender_id: m.sender_id, other_user: map[m.sender_id] ?? { id: m.sender_id, username: "unknown", full_name: null, city: null, avatar_url: null, current_streak: 0 } })));
    }

    const { data: acceptedRaw } = await supabase
      .from("matches").select("id, status, sender_id, receiver_id")
      .eq("status", "accepted").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (acceptedRaw && acceptedRaw.length > 0) {
      const otherIds = acceptedRaw.map((m: any) => m.sender_id === user.id ? m.receiver_id : m.sender_id);
      const { data: otherUsers } = await supabase.from("users")
        .select("id, username, full_name, city, avatar_url, current_streak").in("id", otherIds);
      const map = Object.fromEntries((otherUsers ?? []).map((u: any) => [u.id, u]));
      setAccepted(acceptedRaw.map((m: any) => {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        return { id: m.id, status: m.status, sender_id: m.sender_id, other_user: map[otherId] ?? { id: otherId, username: "unknown", full_name: null, city: null, avatar_url: null, current_streak: 0 } };
      }));
      const counts: Record<string, number> = {};
      await Promise.all(acceptedRaw.map(async (m: any) => {
        const { count } = await supabase.from("messages").select("id", { count: "exact", head: true })
          .eq("match_id", m.id).neq("sender_id", user.id);
        counts[m.id] = count ?? 0;
      }));
      setUnreadCounts(counts);
    }
    setMatchesLoaded(true);
  }

  async function respondToMatch(matchId: string, status: "accepted" | "declined") {
    await supabase.from("matches").update({ status }).eq("id", matchId);
    if (status === "accepted") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) checkAndAwardMatchBadges(user.id);
    }
    setMatchesLoaded(false);
    await loadMatches();
  }

  function switchTab(tab: "discover" | "matches") {
    setDiscoverTab(tab);
    if (tab === "matches") loadMatches();
  }

  useEffect(() => {
    let result = users.filter((u) => !blockedIds.has(u.id) && !passedIds.has(u.id));
    if (filterFavorites) result = result.filter((u) => favorites.has(u.id));
    if (filterLevel) result = result.filter((u) => u.fitness_level === filterLevel);
    if (filterCity.trim()) result = result.filter((u) => u.city?.toLowerCase().includes(filterCity.toLowerCase()));
    if (filterSport) result = result.filter((u) => u.sports?.includes(filterSport));
    if (filterTime) result = result.filter((u) => u.preferred_times?.includes(filterTime));
    if (filterGender) result = result.filter((u) => u.gender === filterGender);
    if (sortByScore) result = [...result].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    setFiltered(result);
  }, [users, blockedIds, passedIds, favorites, filterFavorites, filterLevel, filterCity, filterSport, filterTime, filterGender, sortByScore]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const [{ data: matches }, { data: me }, { data }, { data: blocks }, { data: favs }, { data: passesData }] = await Promise.all([
      supabase.from("matches").select("receiver_id").eq("sender_id", user.id).in("status", ["pending", "accepted"]),
      supabase.from("users").select("sports, fitness_level, preferred_times, industry").eq("id", user.id).single(),
      supabase.from("users")
        .select("id, username, full_name, bio, city, gym_name, fitness_level, age, avatar_url, sports, gender, weight, target_weight, privacy_settings, preferred_times, occupation, company, industry, is_pro")
        .neq("id", user.id).limit(100),
      supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
      supabase.from("favorites").select("favorited_id").eq("user_id", user.id),
      supabase.from("passes").select("passed_id").eq("user_id", user.id),
    ]);

    setLikedIds(new Set((matches ?? []).map((m: any) => m.receiver_id)));
    const blocked = new Set((blocks ?? []).map((b: any) => b.blocked_id));
    const passed = new Set((passesData ?? []).map((p: any) => p.passed_id));
    setBlockedIds(blocked);
    setPassedIds(passed);
    setFavorites(new Set((favs ?? []).map((f: any) => f.favorited_id)));

    const profile: MyProfile = me ?? { sports: null, fitness_level: null, preferred_times: null, industry: null };
    setMyProfile(profile);

    if (data) {
      const filtered = data.filter((u: User) => !blocked.has(u.id) && !(u.privacy_settings as any)?.hide_profile);
      const ids = filtered.map((u: User) => u.id);
      const { data: badgeRows } = ids.length > 0
        ? await supabase.from("user_badges").select("user_id").in("user_id", ids)
        : { data: [] };
      const badgeCounts: Record<string, number> = {};
      for (const row of badgeRows ?? []) badgeCounts[row.user_id] = (badgeCounts[row.user_id] ?? 0) + 1;

      const withScores = filtered.map((u: User) => ({
        ...u,
        matchScore: calcMatchScore(profile, u, u.distance_km),
        tierEmoji: calcTier((badgeCounts[u.id] ?? 0) * 100).emoji,
      }));
      setUsers(withScores);
    }
    setLoading(false);
  }

  async function toggleNearMe() {
    if (nearMe) { setNearMe(false); return; }
    if (userLat && userLng) { setNearMe(true); loadNearby(userLat, userLng, radius); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLat(lat); setUserLng(lng);
        setNearMe(true);
        setLocating(false);
        loadNearby(lat, lng, radius);
      },
      () => { setLocating(false); alert("Could not get location. Please allow location access."); }
    );
  }

  async function loadNearby(lat: number, lng: number, miles: number) {
    if (!currentUserId) return;
    setLoading(true);
    const { data } = await supabase.rpc("nearby_users", {
      user_lat: lat, user_lng: lng, radius_km: miles * 1.60934, current_user_id: currentUserId,
    });
    // Convert distance_km → distance_mi for display
    const converted = ((data as any[]) ?? []).map((u) => ({ ...u, distance_km: u.distance_km / 1.60934 }));
    const profile = myProfile ?? { sports: null, fitness_level: null, preferred_times: null, industry: null };
    const ids = converted.map((u: any) => u.id);
    const { data: badgeRows } = ids.length > 0
      ? await supabase.from("user_badges").select("user_id").in("user_id", ids)
      : { data: [] };
    const badgeCounts: Record<string, number> = {};
    for (const row of badgeRows ?? []) badgeCounts[row.user_id] = (badgeCounts[row.user_id] ?? 0) + 1;
    const withScores = converted.map((u: User) => ({
      ...u,
      matchScore: calcMatchScore(profile, u, u.distance_km),
      tierEmoji: calcTier((badgeCounts[u.id] ?? 0) * 100).emoji,
    }));
    setUsers(withScores as User[]);
    setLoading(false);
  }

  async function changeRadius(miles: number) {
    setRadius(miles);
    if (nearMe && userLat && userLng) loadNearby(userLat, userLng, miles);
  }

  function detectSportCategory(tags: any): string {
    const sport = (tags?.sport ?? "").toLowerCase();
    const leisure = (tags?.leisure ?? "").toLowerCase();
    if (sport.includes("american_football")) return "american_football";
    if (sport.includes("basketball")) return "basketball";
    if (sport.includes("baseball") || sport.includes("softball")) return "baseball";
    if (sport.includes("tennis")) return "tennis";
    if (sport.includes("swimming") || leisure === "swimming_pool") return "swimming";
    if (sport.includes("soccer") || sport.includes("football")) return "soccer";
    if (sport.includes("fitness") || sport.includes("gym") || leisure === "fitness_centre" || leisure === "sports_centre") return "gym";
    if (leisure === "pitch") return "soccer";
    return "gym";
  }

  async function openMap() {
    setShowMap(true);
    setMapLoading(true);
    let lat = userLat, lng = userLng;
    if (!lat || !lng) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 }));
        lat = pos.coords.latitude; lng = pos.coords.longitude;
        setUserLat(lat); setUserLng(lng);
      } catch { setMapLoading(false); return; }
    }
    try {
      const q = `[out:json][timeout:30];(node["leisure"~"fitness_centre|pitch|sports_centre|swimming_pool"](around:5000,${lat},${lng});way["leisure"~"fitness_centre|pitch|sports_centre|swimming_pool"](around:5000,${lat},${lng});node["sport"~"fitness|soccer|football|basketball|baseball|american_football|tennis|swimming"](around:5000,${lat},${lng});way["sport"~"fitness|soccer|football|basketball|baseball|american_football|tennis|swimming"](around:5000,${lat},${lng}););out center;`;
      const r = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
      const d = await r.json();
      setMapGyms((d.elements ?? []).slice(0, 80).map((el: any) => ({
        name: el.tags?.name ?? el.tags?.sport ?? "Sports Facility",
        lat: el.lat ?? el.center?.lat,
        lon: el.lon ?? el.center?.lon,
        category: detectSportCategory(el.tags),
      })).filter((g: any) => g.lat && g.lon));
    } catch {}
    setMapLoading(false);
  }

  function closeMap() {
    if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }
    gymLayerRef.current = null;
    setShowMap(false);
    setMapGyms([]);
    setMapCategory("all");
  }

  // Init Leaflet base map when map modal opens
  useEffect(() => {
    if (!showMap || !userLat || !userLng) return;
    function initMap() {
      if (!mapDivRef.current || leafletMapRef.current) return;
      const L = (window as any).L;
      if (!L) return;
      const map = L.map(mapDivRef.current).setView([userLat!, userLng!], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors", maxZoom: 19,
      }).addTo(map);
      L.circleMarker([userLat!, userLng!], {
        radius: 10, fillColor: "var(--accent, #FF4500)", color: "#fff", weight: 2, fillOpacity: 1,
      }).addTo(map).bindPopup("<b>You are here</b>");
      gymLayerRef.current = L.layerGroup().addTo(map);
      leafletMapRef.current = map;
      window.dispatchEvent(new Event("leaflet-map-ready"));
    }
    if ((window as any).L) { setTimeout(initMap, 50); return; }
    if (!document.querySelector('link[href*="leaflet@"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[src*="leaflet@"]')) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setTimeout(initMap, 50);
      document.head.appendChild(script);
    }
  }, [showMap, userLat, userLng]);

  const CATEGORY_ICONS: Record<string, string> = {
    gym: "🏋️", soccer: "⚽", basketball: "🏀",
    baseball: "⚾", american_football: "🏈", tennis: "🎾", swimming: "🏊",
  };

  // Update gym markers when gyms or category filter changes
  useEffect(() => {
    function updateMarkers() {
      if (!gymLayerRef.current || !leafletMapRef.current) return;
      const L = (window as any).L;
      if (!L) return;
      gymLayerRef.current.clearLayers();
      const visible = mapCategory === "all" ? mapGyms : mapGyms.filter((g) => g.category === mapCategory);
      visible.forEach((gym) => {
        const gymUsers = users.filter((u) => {
          const gn = (u.gym_name ?? "").toLowerCase();
          const mn = gym.name.toLowerCase();
          return gn.length >= 4 && mn.length >= 4 && (gn.includes(mn.slice(0, 5)) || mn.includes(gn.slice(0, 5)));
        });
        const icon = CATEGORY_ICONS[gym.category] ?? "📍";
        const markerIcon = L.divIcon({
          html: `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">${icon}</div>`,
          className: "", iconSize: [28, 28], iconAnchor: [14, 14],
        });
        const membersLine = gymUsers.length > 0
          ? `<br/><span style="color:#FF4500;font-weight:700">${gymUsers.length} FlexMatches member${gymUsers.length > 1 ? "s" : ""}</span>`
          : "";
        L.marker([gym.lat, gym.lon], { icon: markerIcon })
          .addTo(gymLayerRef.current)
          .bindPopup(`<b>${gym.name}</b>${membersLine}`);
      });
    }
    updateMarkers();
    window.addEventListener("leaflet-map-ready", updateMarkers);
    return () => window.removeEventListener("leaflet-map-ready", updateMarkers);
  }, [mapGyms, mapCategory, users]);

  async function likeUser(otherUser: User) {
    if (!currentUserId) return;
    const receiverId = otherUser.id;

    // Check if the other person already liked us (pending match where they're sender)
    const { data: theirLike } = await supabase
      .from("matches")
      .select("id")
      .eq("sender_id", receiverId)
      .eq("receiver_id", currentUserId)
      .eq("status", "pending")
      .maybeSingle();

    if (theirLike) {
      // Mutual match! Accept their pending request
      await supabase.from("matches").update({ status: "accepted" }).eq("id", theirLike.id);
      setLikedIds((prev) => new Set([...prev, receiverId]));
      setMutualMatchUser(otherUser);
      setSelectedUser(null);
      sendPush(receiverId, "🎉 It's a Match!", "You matched on FlexMatches! Start chatting.", "/app/matches");
    } else {
      // No mutual yet — create pending like
      const { error } = await supabase
        .from("matches")
        .insert({ sender_id: currentUserId, receiver_id: receiverId, status: "pending" });
      if (!error) {
        setLikedIds((prev) => new Set([...prev, receiverId]));
        sendPush(receiverId, "❤️ Someone liked you!", "Check out who liked you on FlexMatches.", "/app/matches");
        setSelectedUser(null);
      }
    }
  }

  async function passUser(userId: string) {
    if (!currentUserId) return;
    await supabase.from("passes").insert({ user_id: currentUserId, passed_id: userId });
    setPassedIds((prev) => new Set([...prev, userId]));
    setSelectedUser(null);
  }

  async function toggleFavorite(userId: string) {
    if (!currentUserId) return;
    if (favorites.has(userId)) {
      await supabase.from("favorites").delete().eq("user_id", currentUserId).eq("favorited_id", userId);
      setFavorites((prev) => { const next = new Set(prev); next.delete(userId); return next; });
    } else {
      await supabase.from("favorites").insert({ user_id: currentUserId, favorited_id: userId });
      setFavorites((prev) => new Set([...prev, userId]));
    }
  }

  async function blockUser(userId: string) {
    if (!currentUserId) return;
    await supabase.from("blocks").insert({ blocker_id: currentUserId, blocked_id: userId });
    setBlockedIds((prev) => new Set([...prev, userId]));
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setSelectedUser(null);
    setShowReportMenu(false);
  }

  async function reportUser(userId: string, reason: string) {
    if (!currentUserId || !reason.trim()) return;
    setReporting(true);
    await supabase.from("reports").insert({ reporter_id: currentUserId, reported_id: userId, reason });
    setReporting(false);
    setShowReportMenu(false);
    setReportReason("");
    setSelectedUser(null);
  }

  const activeFilterCount = [filterLevel, filterCity.trim(), filterSport, filterTime, filterGender, filterFavorites ? "1" : ""].filter(Boolean).length;

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px" }}>

      {/* Tab selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, background: "var(--bg-card)", borderRadius: 14, padding: 4 }}>
        {(["discover", "matches"] as const).map((t) => (
          <button key={t} onClick={() => switchTab(t)}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", background: discoverTab === t ? "var(--accent)" : "transparent", color: discoverTab === t ? "var(--text-primary)" : "var(--text-faint)", position: "relative" }}>
            {t === "discover" ? "🔍 Discover" : "🤝 Matches"}
            {t === "matches" && (pending.length + Object.values(unreadCounts).reduce((a, b) => a + b, 0)) > 0 && (
              <span style={{ position: "absolute", top: 4, right: 8, background: "var(--accent)", color: "#fff", borderRadius: 999, fontSize: 9, fontWeight: 800, minWidth: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                {pending.length + Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* MATCHES TAB */}
      {discoverTab === "matches" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!matchesLoaded && <div style={{ textAlign: "center", color: "var(--text-faint)", paddingTop: 40 }}>Loading...</div>}
          {matchesLoaded && pending.length === 0 && accepted.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 48 }}>🤝</div>
              <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 18, marginTop: 16 }}>No connections yet</p>
              <p style={{ color: "var(--text-faint)", marginTop: 8 }}>Discover people and send a connect request!</p>
            </div>
          )}

          {/* Pending requests */}
          {pending.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>
                REQUESTS <span style={{ color: "var(--accent)" }}>{pending.length}</span>
              </div>
              {pending.map((m) => (
                <div key={m.id} style={{ background: "var(--bg-card-alt)", borderRadius: 16, padding: 14, border: "1px solid var(--accent-faint)", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 22, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
                      {m.other_user.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>@{m.other_user.username}</div>
                      {m.other_user.city && <div style={{ fontSize: 12, color: "var(--text-faint)" }}>📍 {m.other_user.city}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => respondToMatch(m.id, "declined")} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-faint)", fontWeight: 600, cursor: "pointer" }}>Decline</button>
                    <button onClick={() => respondToMatch(m.id, "accepted")} style={{ flex: 2, padding: "8px 0", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>✓ Accept</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Accepted connections */}
          {accepted.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>
                CONNECTIONS <span style={{ color: "var(--accent)" }}>{accepted.length}</span>
              </div>
              {accepted.map((m) => (
                <div key={m.id} style={{ background: "var(--bg-card-alt)", borderRadius: 16, padding: 14, border: "1px solid var(--border-medium)", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ position: "relative" }}>
                    {m.other_user.avatar_url
                      ? <img src={m.other_user.avatar_url} style={{ width: 44, height: 44, borderRadius: 22, objectFit: "cover", border: "2px solid var(--border-medium)" }} />
                      : <div style={{ width: 44, height: 44, borderRadius: 22, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{m.other_user.username[0].toUpperCase()}</div>}
                    {unreadCounts[m.id] > 0 && (
                      <span style={{ position: "absolute", top: -4, right: -4, background: "var(--accent)", color: "#fff", borderRadius: 999, fontSize: 9, fontWeight: 800, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {unreadCounts[m.id]}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>@{m.other_user.username}</div>
                    {m.other_user.full_name && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.other_user.full_name}</div>}
                    {m.other_user.city && <div style={{ fontSize: 11, color: "var(--text-faint)" }}>📍 {m.other_user.city}</div>}
                  </div>
                  <button onClick={() => router.push(`/app/chat/${m.id}`)} style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "var(--accent)", padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                    💬 Chat
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DISCOVER TAB */}
      {discoverTab === "discover" && <>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.5 }}>Discover</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setFilterFavorites(!filterFavorites)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: filterFavorites ? "#FF450022" : "var(--bg-card-alt)", border: `1px solid ${filterFavorites ? "var(--accent)" : "var(--bg-input)"}`, borderRadius: 12, padding: "8px 12px", color: filterFavorites ? "var(--accent)" : "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            ❤️ Saved
          </button>
          <button
            onClick={() => setSortByScore(!sortByScore)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: sortByScore ? "#FF450022" : "var(--bg-card-alt)", border: `1px solid ${sortByScore ? "var(--accent)" : "var(--bg-input)"}`, borderRadius: 12, padding: "8px 12px", color: sortByScore ? "var(--accent)" : "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            🎯 Match
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: activeFilterCount > 0 ? "var(--accent)" : "var(--bg-card-alt)", border: `1px solid ${activeFilterCount > 0 ? "var(--accent)" : "var(--bg-input)"}`, borderRadius: 12, padding: "8px 14px", color: "var(--text-primary)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            ⚡ Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>
      </div>

      {/* Near Me bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={toggleNearMe} disabled={locating}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 12, border: `1px solid ${nearMe ? "var(--accent)" : "var(--bg-input)"}`, background: nearMe ? "#FF450022" : "var(--bg-card-alt)", color: nearMe ? "var(--accent)" : "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: locating ? 0.6 : 1 }}>
          📍 {locating ? "Locating..." : nearMe ? "Near Me ✓" : "Near Me"}
        </button>
        <button onClick={openMap}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 12, border: "1px solid var(--bg-input)", background: "var(--bg-card-alt)", color: "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          🗺️ Map
        </button>
        {nearMe && RADIUS_OPTIONS.map((mi) => (
          <button key={mi} onClick={() => changeRadius(mi)}
            style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${radius === mi ? "var(--accent)" : "var(--bg-input)"}`, background: radius === mi ? "var(--accent)" : "transparent", color: radius === mi ? "var(--text-primary)" : "var(--text-faint)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {mi}mi
          </button>
        ))}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* City */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>CITY</label>
            <input
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              placeholder="e.g. Istanbul"
              style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "9px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Fitness Level */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>FITNESS LEVEL</label>
            <div style={{ display: "flex", gap: 8 }}>
              {FITNESS_LEVELS.map((lvl) => (
                <button key={lvl} onClick={() => setFilterLevel(filterLevel === lvl ? "" : lvl)}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1px solid ${filterLevel === lvl ? LEVEL_COLOR[lvl] : "var(--bg-input)"}`, background: filterLevel === lvl ? LEVEL_COLOR[lvl] + "22" : "transparent", color: filterLevel === lvl ? LEVEL_COLOR[lvl] : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Sport */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>SPORT</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SPORTS_LIST.map((s) => (
                <button key={s} onClick={() => setFilterSport(filterSport === s ? "" : s)}
                  style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${filterSport === s ? "var(--accent)" : "var(--bg-input)"}`, background: filterSport === s ? "var(--accent)" : "transparent", color: filterSport === s ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>GENDER</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Male", "Female", "Other"].map((g) => (
                <button key={g} onClick={() => setFilterGender(filterGender === g ? "" : g)}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1px solid ${filterGender === g ? "var(--accent)" : "var(--bg-input)"}`, background: filterGender === g ? "#FF450022" : "transparent", color: filterGender === g ? "var(--accent)" : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Training Time */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>TRAINING TIME</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ value: "morning", label: "🌅 Morning" }, { value: "afternoon", label: "☀️ Afternoon" }, { value: "evening", label: "🌙 Evening" }].map((t) => (
                <button key={t.value} onClick={() => setFilterTime(filterTime === t.value ? "" : t.value)}
                  style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: `1px solid ${filterTime === t.value ? "var(--accent)" : "var(--bg-input)"}`, background: filterTime === t.value ? "#FF450022" : "transparent", color: filterTime === t.value ? "var(--accent)" : "var(--text-muted)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button onClick={() => { setFilterLevel(""); setFilterCity(""); setFilterSport(""); setFilterTime(""); setFilterGender(""); setFilterFavorites(false); }}
              style={{ background: "transparent", border: "1px solid var(--border-strong)", borderRadius: 10, padding: "8px 0", color: "var(--text-faint)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Count */}
      <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 12 }}>
        {filtered.length} {filtered.length === 1 ? "person" : "people"} {activeFilterCount > 0 ? "match your filters" : "near you"}
      </div>

      {/* User List */}
      {filtered.length === 0 ? (
        <EmptyState
          nearMe={nearMe}
          hasFilters={activeFilterCount > 0}
          hasUsers={users.length > 0}
          radius={radius}
          onClearFilters={() => { setFilterLevel(""); setFilterCity(""); setFilterSport(""); setFilterTime(""); setFilterGender(""); setFilterFavorites(false); }}
          onIncreaseRadius={() => { const bigger = RADIUS_OPTIONS.find(r => r > radius); if (bigger) changeRadius(bigger); }}
          maxRadius={radius >= Math.max(...RADIUS_OPTIONS)}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {filtered.map((user) => (
            <SwipeableCard key={user.id} onLike={() => likeUser(user)} onPass={() => passUser(user.id)} onTap={() => setSelectedUser(user)}>
            {/* Photo-first card */}
            <div style={{ background: "var(--bg-card-alt)", borderRadius: 18, overflow: "hidden", border: "1px solid var(--border-medium)", cursor: "pointer", position: "relative" }}>

              {/* Photo area */}
              <div style={{ position: "relative", width: "100%", paddingBottom: "110%", background: "var(--bg-card)" }}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, #1a0a00, #0a0a1a)`, fontSize: 48, fontWeight: 900, color: "var(--accent)" }}>
                    {user.username[0].toUpperCase()}
                  </div>
                )}
                {/* Gradient overlay */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)" }} />

                {/* Match score badge top-right */}
                {user.matchScore != null && user.matchScore > 0 && (
                  <div style={{ position: "absolute", top: 8, right: 8, background: user.matchScore >= 70 ? "rgba(34,197,94,0.92)" : user.matchScore >= 40 ? "rgba(245,158,11,0.92)" : "rgba(30,30,30,0.88)", borderRadius: 10, padding: "3px 8px", backdropFilter: "blur(4px)" }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: "#fff" }}>{user.matchScore}%</span>
                  </div>
                )}

                {/* Pro badge top-left */}
                {user.is_pro && (
                  <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(96,165,250,0.92)", borderRadius: 8, padding: "2px 7px", backdropFilter: "blur(4px)" }}>
                    <span style={{ fontSize: 9, fontWeight: 900, color: "#fff" }}>💎 PRO</span>
                  </div>
                )}

                {/* Name overlay at bottom of photo */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 10px 6px" }}>
                  <div style={{ fontWeight: 800, color: "#fff", fontSize: 13, lineHeight: 1.2 }}>
                    {user.full_name ?? `@${user.username}`}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>
                    {user.fitness_level && <span style={{ color: user.fitness_level === "advanced" ? "#ff6b35" : user.fitness_level === "intermediate" ? "#f59e0b" : "#22c55e" }}>{user.fitness_level}</span>}
                    {user.city && !user.privacy_settings?.hide_city && <span> · {user.city}</span>}
                  </div>
                </div>
              </div>

              {/* Sports tags */}
              {user.sports && user.sports.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "8px 8px 0" }}>
                  {user.sports.slice(0, 2).map((s) => (
                    <span key={s} style={{ fontSize: 9, color: "#00d4ff", background: "#001a2a", borderRadius: 6, padding: "2px 6px", border: "1px solid #00d4ff33", fontWeight: 700 }}>{s}</span>
                  ))}
                  {user.sports.length > 2 && <span style={{ fontSize: 9, color: "var(--text-faint)" }}>+{user.sports.length - 2}</span>}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 6, padding: "8px 8px 10px" }}>
                {likedIds.has(user.id) ? (
                  <div style={{ flex: 1, textAlign: "center", fontSize: 11, color: "#22c55e", fontWeight: 800, padding: "7px 0" }}>Connected ✓</div>
                ) : (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); passUser(user.id); }}
                      style={{ flex: 1, padding: "7px 0", borderRadius: 10, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-faint)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                      ✕
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); likeUser(user); }}
                      style={{ flex: 2, padding: "7px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #00d4ff, #22c55e)", color: "#000", fontWeight: 900, fontSize: 13, cursor: "pointer" }}>
                      ❤️ Connect
                    </button>
                  </>
                )}
              </div>
            </div>
            </SwipeableCard>
          ))}
        </div>
      )}

      {/* Mutual Match Celebration */}
      {mutualMatchUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 24, padding: 32, width: "100%", maxWidth: 400, textAlign: "center", border: "1px solid var(--accent-faint)", boxShadow: "0 0 60px #FF450033" }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>🎉</div>
            <h2 style={{ color: "var(--accent)", fontSize: 28, fontWeight: 900, margin: "0 0 8px" }}>It's a Match!</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
              You and <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>@{mutualMatchUser.username}</span> liked each other. Time to connect!
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="/app/matches"
                style={{ padding: 16, borderRadius: 14, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 800, fontSize: 16, cursor: "pointer", textDecoration: "none", display: "block" }}>
                💬 Start Chatting
              </a>
              <button onClick={() => setMutualMatchUser(null)}
                style={{ padding: 14, borderRadius: 14, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                Keep Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Detail Modal */}
      {selectedUser && (
        <div
          onClick={() => { setSelectedUser(null); setShowReportMenu(false); setReportReason(""); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", border: "1px solid var(--border)" }}
          >
            {/* Handle */}

            {/* Avatar + Name */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              {selectedUser.avatar_url ? (
                <img src={selectedUser.avatar_url} alt="" style={{ width: 80, height: 80, borderRadius: 40, objectFit: "cover", border: "3px solid var(--accent)", marginBottom: 12 }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: 40, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "var(--text-primary)", margin: "0 auto 12px" }}>
                  {selectedUser.username[0].toUpperCase()}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 20 }}>@{selectedUser.username}</div>
                {selectedUser.is_pro && <span style={{ fontSize: 11, fontWeight: 800, color: "#60a5fa", background: "#1e3a5f", borderRadius: 999, padding: "3px 10px", border: "1px solid #60a5fa44" }}>💎 Pro</span>}
                {selectedUser.tierEmoji && <span style={{ fontSize: 18 }}>{selectedUser.tierEmoji}</span>}
                <button onClick={() => toggleFavorite(selectedUser.id)}
                  style={{ background: "transparent", border: "none", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 0 }}>
                  {favorites.has(selectedUser.id) ? "❤️" : "🤍"}
                </button>
              </div>
              {selectedUser.full_name && <div style={{ color: "var(--text-muted)", fontSize: 15, marginTop: 2 }}>{selectedUser.full_name}</div>}
              {selectedUser.matchScore != null && selectedUser.matchScore > 0 && (
                <div style={{ marginTop: 10 }}>
                  <span style={{
                    fontSize: 15, fontWeight: 800,
                    color: selectedUser.matchScore >= 70 ? "var(--success)" : selectedUser.matchScore >= 40 ? "#f59e0b" : "var(--text-muted)",
                    background: "var(--bg-card-alt)", borderRadius: 999, padding: "6px 16px",
                    border: `1px solid ${selectedUser.matchScore >= 70 ? "#22c55e44" : selectedUser.matchScore >= 40 ? "#f59e0b44" : "#333"}`,
                    display: "inline-block",
                  }}>
                    🎯 {selectedUser.matchScore}% match
                  </span>
                </div>
              )}
              {selectedUser.fitness_level && (
                <span style={{ fontSize: 12, color: LEVEL_COLOR[selectedUser.fitness_level], fontWeight: 700, background: "var(--bg-card-alt)", borderRadius: 999, padding: "4px 14px", border: `1px solid ${LEVEL_COLOR[selectedUser.fitness_level]}`, display: "inline-block", marginTop: 8, textTransform: "capitalize" }}>
                  {selectedUser.fitness_level}
                </span>
              )}
            </div>

            {/* Info chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              {selectedUser.distance_km != null && <Chip>📍 {selectedUser.distance_km.toFixed(1)} mi away</Chip>}
              {selectedUser.city && !selectedUser.privacy_settings?.hide_city && <Chip>📍 {selectedUser.city}</Chip>}
              {selectedUser.age && !selectedUser.privacy_settings?.hide_age && <Chip>🎂 {selectedUser.age} yo</Chip>}
              {selectedUser.gender && <Chip>{selectedUser.gender}</Chip>}
              {selectedUser.gym_name && <Chip>🏋️ {selectedUser.gym_name}</Chip>}
            </div>

            {/* Weight */}
            {(selectedUser.weight || selectedUser.target_weight) && !selectedUser.privacy_settings?.hide_weight && (
              <div style={{ background: "var(--bg-card-alt)", borderRadius: 14, padding: 14, border: "1px solid var(--border-medium)", display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
                {selectedUser.weight && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "var(--accent)" }}>{selectedUser.weight}<span style={{ fontSize: 12, color: "var(--text-faint)" }}>lbs</span></div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Current</div>
                  </div>
                )}
                {selectedUser.target_weight && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "var(--accent)" }}>{selectedUser.target_weight}<span style={{ fontSize: 12, color: "var(--text-faint)" }}>lbs</span></div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Target</div>
                  </div>
                )}
              </div>
            )}

            {/* Career */}
            {(selectedUser.occupation || selectedUser.company || selectedUser.industry) && (
              <div style={{ background: "var(--bg-card-alt)", borderRadius: 12, padding: 12, border: "1px solid var(--border-medium)", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selectedUser.occupation && <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>💼 {selectedUser.occupation}</span>}
                {selectedUser.company && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>@ {selectedUser.company}</span>}
                {selectedUser.industry && <span style={{ fontSize: 12, color: "var(--text-faint)", background: "var(--bg-card)", borderRadius: 999, padding: "2px 10px", border: "1px solid var(--border-medium)" }}>{selectedUser.industry}</span>}
              </div>
            )}

            {/* Bio */}
            {selectedUser.bio && (
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 16, textAlign: "center" }}>{selectedUser.bio}</p>
            )}

            {/* Why you match */}
            {myProfile && (
              <div style={{ background: "#0d1f0d", borderRadius: 14, padding: 14, border: "1px solid #1a3a1a", marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 700, marginBottom: 10 }}>🎯 WHY YOU MATCH</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {buildWhyMatch(myProfile, selectedUser).map((row) => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 14, width: 20 }}>{row.icon}</span>
                      <span style={{ fontSize: 12, color: "var(--text-faint)", width: 90, flexShrink: 0 }}>{row.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: row.match ? "var(--success)" : "var(--text-faint)", flex: 1 }}>
                        {row.match && <span style={{ marginRight: 4 }}>✓</span>}
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sports */}
            {selectedUser.sports && selectedUser.sports.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, marginBottom: 8 }}>SPORTS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedUser.sports.map((s) => (
                    <span key={s} style={{ fontSize: 13, color: "var(--accent)", background: "#1a0800", borderRadius: 999, padding: "5px 12px", border: "1px solid var(--accent-faint)", fontWeight: 600 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferred Times */}
            {selectedUser.preferred_times && selectedUser.preferred_times.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, marginBottom: 8 }}>TRAINS</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selectedUser.preferred_times.map((t) => {
                    const labels: Record<string, string> = { morning: "🌅 Morning", afternoon: "☀️ Afternoon", evening: "🌙 Evening" };
                    return <span key={t} style={{ fontSize: 13, color: "var(--accent)", background: "#1a0800", borderRadius: 10, padding: "5px 12px", border: "1px solid var(--accent-faint)", fontWeight: 600 }}>{labels[t] ?? t}</span>;
                  })}
                </div>
              </div>
            )}

            {/* Like / Pass */}
            {likedIds.has(selectedUser.id) ? (
              <div style={{ width: "100%", padding: 16, borderRadius: 14, background: "var(--bg-card-alt)", color: "var(--success)", fontWeight: 800, fontSize: 16, textAlign: "center" }}>
                ✓ You liked this person
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => passUser(selectedUser.id)}
                  style={{ flex: 1, padding: 16, borderRadius: 14, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                  ✕ Pass
                </button>
                <button onClick={() => likeUser(selectedUser)}
                  style={{ flex: 2, padding: 16, borderRadius: 14, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
                  ❤️ Like
                </button>
              </div>
            )}

            {/* Block / Report */}
            {!showReportMenu ? (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => blockUser(selectedUser.id)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-faint)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  🚫 Block
                </button>
                <button onClick={() => setShowReportMenu(true)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-faint)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  ⚑ Report
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 10, background: "var(--bg-card-alt)", borderRadius: 14, padding: 14, border: "1px solid var(--border-medium)" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, marginBottom: 10 }}>Why are you reporting this user?</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {["Spam or fake profile", "Inappropriate content", "Harassment", "Other"].map((reason) => (
                    <button key={reason} onClick={() => setReportReason(reason)}
                      style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${reportReason === reason ? "var(--accent)" : "var(--bg-input)"}`, background: reportReason === reason ? "#FF450022" : "transparent", color: reportReason === reason ? "var(--accent)" : "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                      {reason}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => { setShowReportMenu(false); setReportReason(""); }}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-faint)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={() => reportUser(selectedUser.id, reportReason)} disabled={!reportReason || reporting}
                    style={{ flex: 2, padding: "10px 0", borderRadius: 10, border: "none", background: reportReason ? "var(--accent)" : "var(--bg-card-alt)", color: reportReason ? "var(--text-primary)" : "var(--text-faint)", fontWeight: 700, fontSize: 13, cursor: reportReason ? "pointer" : "default", opacity: reporting ? 0.6 : 1 }}>
                    {reporting ? "Sending..." : "Submit Report"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Gym Map Modal */}
      {showMap && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", flexDirection: "column", background: "var(--bg-page)" }}>
          {/* Header */}
          <div style={{ flexShrink: 0, background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px" }}>
              <span style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 17 }}>🗺️ Nearby Sports Facilities</span>
              <button onClick={closeMap} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>✕</button>
            </div>
            {/* Category chips */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 16px 12px", scrollbarWidth: "none" }}>
              {[
                { id: "all", label: "All", icon: "🗺️" },
                { id: "gym", label: "Gym", icon: "🏋️" },
                { id: "soccer", label: "Soccer", icon: "⚽" },
                { id: "basketball", label: "Basketball", icon: "🏀" },
                { id: "baseball", label: "Baseball", icon: "⚾" },
                { id: "american_football", label: "Football", icon: "🏈" },
                { id: "tennis", label: "Tennis", icon: "🎾" },
                { id: "swimming", label: "Swimming", icon: "🏊" },
              ].map((cat) => {
                const active = mapCategory === cat.id;
                const count = cat.id === "all" ? mapGyms.length : mapGyms.filter((g) => g.category === cat.id).length;
                if (cat.id !== "all" && count === 0) return null;
                return (
                  <button key={cat.id} onClick={() => setMapCategory(cat.id)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 20, border: `1px solid ${active ? "var(--accent)" : "var(--border-medium)"}`, background: active ? "var(--accent-faint)" : "transparent", color: active ? "var(--accent)" : "var(--text-muted)", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {cat.icon} {cat.label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Loading overlay */}
          {mapLoading && (
            <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", gap: 12 }}>
              <div style={{ width: 36, height: 36, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>Loading facilities...</span>
            </div>
          )}
          {/* Map container */}
          <div ref={mapDivRef} style={{ flex: 1, minHeight: 0 }} />
          {/* Facility list */}
          {mapGyms.length > 0 && (
            <div style={{ flexShrink: 0, maxHeight: "32vh", overflowY: "auto", background: "var(--bg-card)", borderTop: "1px solid var(--border)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {(() => {
                const visible = mapCategory === "all" ? mapGyms : mapGyms.filter((g) => g.category === mapCategory);
                return (
                  <>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>
                      {visible.length} FACILITIES FOUND
                    </div>
                    {visible.map((gym, i) => {
                      const gymUsers = users.filter((u) => {
                        const gn = (u.gym_name ?? "").toLowerCase();
                        const mn = gym.name.toLowerCase();
                        return gn.length >= 4 && mn.length >= 4 && (gn.includes(mn.slice(0, 5)) || mn.includes(gn.slice(0, 5)));
                      });
                      const icon = (CATEGORY_ICONS as any)[gym.category] ?? "📍";
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 12, background: "var(--bg-card-alt)", border: "1px solid var(--border)" }}>
                          <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14 }}>{icon} {gym.name}</span>
                          {gymUsers.length > 0 && (
                            <span style={{ background: "var(--accent-faint)", color: "var(--accent)", fontWeight: 700, fontSize: 12, padding: "3px 10px", borderRadius: 999, border: "1px solid var(--accent)", flexShrink: 0, marginLeft: 8 }}>
                              {gymUsers.length} member{gymUsers.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
      </>}
    </div>
  );
}

function EmptyState({ nearMe, hasFilters, hasUsers, radius, onClearFilters, onIncreaseRadius, maxRadius }: {
  nearMe: boolean; hasFilters: boolean; hasUsers: boolean; radius: number;
  onClearFilters: () => void; onIncreaseRadius: () => void; maxRadius: boolean;
}) {
  if (nearMe && !hasUsers) {
    return (
      <div style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: 52 }}>📍</div>
        <p style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, marginTop: 16 }}>No one nearby</p>
        <p style={{ color: "var(--text-faint)", fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
          No fitness buddies within {radius} miles yet.{!maxRadius ? " Try a bigger radius." : ""}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24, maxWidth: 280, margin: "24px auto 0" }}>
          {!maxRadius && (
            <button onClick={onIncreaseRadius}
              style={{ padding: "12px 0", borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Expand Radius
            </button>
          )}
          <a href="/app/profile" style={{ padding: "12px 0", borderRadius: 12, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, cursor: "pointer", textDecoration: "none", display: "block" }}>
            Invite Friends →
          </a>
        </div>
      </div>
    );
  }

  if (hasFilters && !hasUsers) {
    return (
      <div style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: 52 }}>🔍</div>
        <p style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, marginTop: 16 }}>No one matches</p>
        <p style={{ color: "var(--text-faint)", fontSize: 14, marginTop: 8 }}>Try adjusting your filters.</p>
        <button onClick={onClearFilters}
          style={{ marginTop: 20, padding: "12px 28px", borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Clear Filters
        </button>
      </div>
    );
  }

  if (hasFilters) {
    return (
      <div style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: 52 }}>🔍</div>
        <p style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, marginTop: 16 }}>No matches for these filters</p>
        <p style={{ color: "var(--text-faint)", fontSize: 14, marginTop: 8 }}>Try broadening your search.</p>
        <button onClick={onClearFilters}
          style={{ marginTop: 20, padding: "12px 28px", borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Clear Filters
        </button>
      </div>
    );
  }

  // No users at all
  return (
    <div style={{ textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 52 }}>🚀</div>
      <p style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, marginTop: 16 }}>You're one of the first!</p>
      <p style={{ color: "var(--text-faint)", fontSize: 14, marginTop: 8, lineHeight: 1.6, maxWidth: 280, margin: "8px auto 0" }}>
        FlexMatches is just getting started. Invite friends to find your fitness buddy.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24, maxWidth: 280, margin: "24px auto 0" }}>
        <a href="/app/profile"
          style={{ padding: "13px 0", borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 15, cursor: "pointer", textDecoration: "none", display: "block" }}>
          🔗 Share Your Profile
        </a>
        <p style={{ color: "var(--text-ultra-faint)", fontSize: 12, marginTop: 4 }}>Share your profile link and invite training partners</p>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 13, color: "var(--text-secondary)", background: "var(--bg-card-alt)", borderRadius: 999, padding: "5px 12px", border: "1px solid var(--border-medium)" }}>{children}</span>;
}

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
