"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { calcTier } from "../../../lib/badges";

type Privacy = { hide_age: boolean; hide_city: boolean; hide_weight: boolean };

type PublicProfile = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  city: string | null;
  gym_name: string | null;
  fitness_level: string | null;
  age: number | null;
  avatar_url: string | null;
  sports: string[] | null;
  certifications: string[] | null;
  availability: Record<string, boolean> | null;
  privacy_settings: Privacy | null;
  occupation: string | null;
  company: string | null;
  industry: string | null;
  education_level: string | null;
  career_goals: string | null;
  is_pro: boolean | null;
  current_streak: number | null;
};

type Badge = { badge_key: string };

const BADGE_MAP: Record<string, { emoji: string; title: string; color: string }> = {
  first_match:       { emoji: "🤝", title: "First Match",       color: "#FF4500" },
  social_butterfly:  { emoji: "🦋", title: "Social Butterfly",  color: "#a855f7" },
  connector:         { emoji: "🔗", title: "Connector",         color: "#3b82f6" },
  goal_setter:       { emoji: "🎯", title: "Goal Setter",       color: "#22c55e" },
  goal_crusher:      { emoji: "💥", title: "Goal Crusher",      color: "#f59e0b" },
  overachiever:      { emoji: "🏆", title: "Overachiever",      color: "#eab308" },
  profile_complete:  { emoji: "⭐", title: "Profile Complete",  color: "#06b6d4" },
  early_adopter:     { emoji: "🚀", title: "Early Adopter",     color: "#FF4500" },
  event_organizer:   { emoji: "🎪", title: "Event Organizer",   color: "#ec4899" },
  week_warrior:      { emoji: "🔥", title: "Week Warrior",      color: "#f97316" },
  month_champion:    { emoji: "👑", title: "Month Champion",    color: "#eab308" },
  first_workout:     { emoji: "💪", title: "First Workout",     color: "#22c55e" },
  workout_10:        { emoji: "🏅", title: "10 Workouts",       color: "#3b82f6" },
  workout_50:        { emoji: "🔥", title: "50 Workouts",       color: "#f97316" },
  silver_achiever:   { emoji: "🥈", title: "Silver Achiever",  color: "#9ca3af" },
  gold_achiever:     { emoji: "🥇", title: "Gold Achiever",    color: "#eab308" },
  diamond_achiever:  { emoji: "💎", title: "Diamond Achiever", color: "#60a5fa" },
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function PublicProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [badges, setBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!username) return;
    Promise.all([
      fetchProfile(),
      supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session)),
    ]);
  }, [username]);

  async function fetchProfile() {
    const { data } = await supabase
      .from("users")
      .select("id, username, full_name, bio, city, gym_name, fitness_level, age, avatar_url, sports, certifications, availability, privacy_settings, occupation, company, industry, education_level, career_goals, is_pro, current_streak")
      .eq("username", username)
      .single();

    if (!data) { setNotFound(true); setLoading(false); return; }
    setProfile(data);

    const { data: badgeData } = await supabase
      .from("user_badges").select("badge_key").eq("user_id", data.id);
    setBadges((badgeData ?? []).map((b: Badge) => b.badge_key));
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ background: "#0A0A0A", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ background: "#0A0A0A", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
        <h1 style={{ color: "#fff", fontWeight: 900, fontSize: 24, marginBottom: 8 }}>Profile not found</h1>
        <p style={{ color: "#555", marginBottom: 28 }}>This user doesn't exist or may have changed their username.</p>
        <a href="/" style={{ color: "#FF4500", fontWeight: 700, textDecoration: "none" }}>← Go to FlexMatches</a>
      </div>
    );
  }

  if (!profile) return null;

  const privacy = profile.privacy_settings ?? { hide_age: false, hide_city: false, hide_weight: false };
  const displayName = profile.full_name || `@${profile.username}`;
  const tier = calcTier(badges.length * 100 + (profile.current_streak ?? 0) * 5);

  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh" }}>

      {/* Header bar */}
      <div style={{ background: "#111", borderBottom: "1px solid #1a1a1a", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ fontSize: 20, fontWeight: 900, color: "#FF4500", textDecoration: "none", letterSpacing: -0.5 }}>FlexMatches</a>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/login" style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #2a2a2a", color: "#888", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Log in</a>
          <a href="/register" style={{ padding: "8px 16px", borderRadius: 10, background: "#FF4500", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Sign up free</a>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px 100px" }}>

        {/* Avatar + name */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username}
              style={{ width: 100, height: 100, borderRadius: 50, objectFit: "cover", border: "3px solid #FF4500", marginBottom: 14 }} />
          ) : (
            <div style={{ width: 100, height: 100, borderRadius: 50, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 900, color: "#fff", margin: "0 auto 14px" }}>
              {profile.username[0]?.toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 900, margin: 0 }}>{displayName}</h1>
            {profile.is_pro && (
              <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg, #FF4500, #ff6a00)", borderRadius: 999, padding: "3px 8px" }}>💎 PRO</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
            <span style={{ color: "#555", fontSize: 14 }}>@{profile.username}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: tier.color }}>{tier.emoji} {tier.label}</span>
          </div>
          {profile.fitness_level && (
            <span style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: "#FF4500", fontWeight: 700, background: "#1a0800", borderRadius: 999, padding: "4px 14px", border: "1px solid #FF450033", textTransform: "capitalize" }}>
              {profile.fitness_level}
            </span>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p style={{ color: "#888", fontSize: 15, textAlign: "center", lineHeight: 1.7, marginBottom: 20 }}>{profile.bio}</p>
        )}

        {/* Info chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 20 }}>
          {profile.city && !privacy.hide_city && <Chip>📍 {profile.city}</Chip>}
          {profile.gym_name && <Chip>🏋️ {profile.gym_name}</Chip>}
          {profile.age && !privacy.hide_age && <Chip>🎂 {profile.age} yo</Chip>}
          {profile.occupation && <Chip>💼 {profile.occupation}</Chip>}
          {profile.company && <Chip>🏢 {profile.company}</Chip>}
          {profile.industry && <Chip>🔖 {profile.industry}</Chip>}
          {profile.education_level && <Chip>🎓 {profile.education_level}</Chip>}
        </div>

        {profile.career_goals && (
          <div style={{ background: "#111", borderRadius: 14, padding: 14, border: "1px solid #1a1a1a", marginBottom: 20 }}>
            <SectionTitle>Career Goals</SectionTitle>
            <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{profile.career_goals}</p>
          </div>
        )}

        {/* Sports */}
        {profile.sports && profile.sports.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionTitle>Sports & Activities</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.sports.map((s) => (
                <span key={s} style={{ fontSize: 13, color: "#FF4500", background: "#1a0800", borderRadius: 999, padding: "6px 14px", border: "1px solid #FF450033", fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {profile.certifications && profile.certifications.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionTitle>Certifications</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.certifications.map((c) => (
                <span key={c} style={{ fontSize: 13, color: "#22c55e", background: "#0d1f0d", borderRadius: 999, padding: "6px 14px", border: "1px solid #22c55e33", fontWeight: 600 }}>🏅 {c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Availability */}
        {profile.availability && Object.values(profile.availability).some(Boolean) && (
          <div style={{ marginBottom: 20 }}>
            <SectionTitle>Available to train</SectionTitle>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DAYS.filter((d) => profile.availability?.[d]).map((d) => (
                <span key={d} style={{ fontSize: 12, color: "#FF4500", background: "#1a0800", borderRadius: 8, padding: "5px 12px", border: "1px solid #FF450033", fontWeight: 700 }}>{d}</span>
              ))}
            </div>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionTitle>Badges</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {badges.map((key) => {
                const b = BADGE_MAP[key];
                if (!b) return null;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, background: "#111", border: `1px solid ${b.color}33`, borderRadius: 12, padding: "8px 12px" }}>
                    <span style={{ fontSize: 18 }}>{b.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: b.color }}>{b.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px 20px 24px", background: "linear-gradient(to top, #0A0A0A 60%, transparent)", backdropFilter: "blur(4px)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <a href={isLoggedIn ? "/app/discover" : "/register"}
            style={{ display: "block", padding: "16px 0", borderRadius: 16, background: "#FF4500", color: "#fff", fontWeight: 800, fontSize: 16, textAlign: "center", textDecoration: "none", boxShadow: "0 4px 24px #FF450055" }}>
            💪 Train with {profile.full_name?.split(" ")[0] ?? profile.username} on FlexMatches
          </a>
          {!isLoggedIn && (
            <p style={{ color: "#444", fontSize: 12, textAlign: "center", marginTop: 10 }}>
              Free to join · No credit card required
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>{String(children).toUpperCase()}</div>;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 13, color: "#ccc", background: "#1a1a1a", borderRadius: 999, padding: "6px 14px", border: "1px solid #2a2a2a" }}>{children}</span>;
}
