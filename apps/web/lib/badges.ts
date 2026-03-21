import { supabase } from "./supabase";

// ─── Achievement Tiers ───────────────────────────────────────────────────────

export type Tier = {
  key: string;
  emoji: string;
  label: string;
  color: string;
  minPoints: number;
  nextPoints: number | null; // null = max tier
};

export const TIERS: Tier[] = [
  { key: "bronze",  emoji: "🥉", label: "Bronze",  color: "#cd7f32", minPoints: 0,    nextPoints: 500  },
  { key: "silver",  emoji: "🥈", label: "Silver",  color: "#9ca3af", minPoints: 500,  nextPoints: 1500 },
  { key: "gold",    emoji: "🥇", label: "Gold",    color: "#eab308", minPoints: 1500, nextPoints: 4000 },
  { key: "diamond", emoji: "💎", label: "Diamond", color: "#60a5fa", minPoints: 4000, nextPoints: null },
];

export function calcTier(points: number): Tier {
  return [...TIERS].reverse().find((t) => points >= t.minPoints) ?? TIERS[0];
}

export async function calcUserPoints(userId: string): Promise<number> {
  const [{ count: badges }, { count: workouts }, { data: userData }] = await Promise.all([
    supabase.from("user_badges").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("users").select("current_streak").eq("id", userId).single(),
  ]);
  return (badges ?? 0) * 100 + (workouts ?? 0) * 10 + (userData?.current_streak ?? 0) * 5;
}

// ─── Badges ──────────────────────────────────────────────────────────────────

export type BadgeKey =
  | "first_match"
  | "social_butterfly"
  | "connector"
  | "goal_setter"
  | "goal_crusher"
  | "overachiever"
  | "profile_complete"
  | "early_adopter"
  | "event_organizer"
  | "week_warrior"
  | "month_champion"
  | "first_workout"
  | "workout_10"
  | "workout_50"
  | "silver_achiever"
  | "gold_achiever"
  | "diamond_achiever"
  | "first_referral"
  | "referral_master";

export type Badge = {
  key: BadgeKey;
  emoji: string;
  title: string;
  description: string;
  color: string;
};

export const BADGES: Badge[] = [
  { key: "first_match",      emoji: "🤝", title: "First Connection", description: "Made your first match",         color: "var(--success)" },
  { key: "social_butterfly", emoji: "🦋", title: "Social Butterfly",  description: "Connected with 5 people",      color: "#a855f7" },
  { key: "connector",        emoji: "🌟", title: "Super Connector",   description: "Connected with 10 people",     color: "#f59e0b" },
  { key: "goal_setter",      emoji: "🎯", title: "Goal Setter",       description: "Created your first goal",      color: "#3b82f6" },
  { key: "goal_crusher",     emoji: "💪", title: "Goal Crusher",      description: "Completed your first goal",    color: "var(--accent)" },
  { key: "overachiever",     emoji: "🏆", title: "Overachiever",      description: "Completed 5 goals",            color: "#f59e0b" },
  { key: "profile_complete", emoji: "✅", title: "Complete Profile",  description: "Filled out your full profile", color: "var(--success)" },
  { key: "early_adopter",    emoji: "🚀", title: "Early Adopter",     description: "One of the first 100 users",   color: "var(--accent)" },
  { key: "event_organizer",  emoji: "🎪", title: "Event Organizer",   description: "Created your first event",      color: "#a855f7" },
  { key: "week_warrior",     emoji: "🔥", title: "Week Warrior",      description: "7-day check-in streak",         color: "#f59e0b" },
  { key: "month_champion",   emoji: "👑", title: "Month Champion",    description: "30-day check-in streak",        color: "#f59e0b" },
  { key: "first_workout",    emoji: "💪", title: "First Sweat",       description: "Logged your first workout",     color: "var(--success)" },
  { key: "workout_10",       emoji: "🏃", title: "On a Roll",         description: "Logged 10 workouts",            color: "#3b82f6" },
  { key: "workout_50",       emoji: "🔱", title: "Iron Will",         description: "Logged 50 workouts",            color: "var(--accent)" },
  { key: "silver_achiever",  emoji: "🥈", title: "Silver Achiever",   description: "Reached Silver tier",           color: "#9ca3af" },
  { key: "gold_achiever",    emoji: "🥇", title: "Gold Achiever",     description: "Reached Gold tier",             color: "#eab308" },
  { key: "diamond_achiever", emoji: "💎", title: "Diamond Achiever",  description: "Reached Diamond tier",          color: "#60a5fa" },
  { key: "first_referral",   emoji: "📣", title: "First Referral",    description: "Invited your first friend",     color: "#a855f7" },
  { key: "referral_master",  emoji: "🌟", title: "Referral Master",   description: "Invited 5 friends to join",    color: "var(--accent)" },
];

export const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.key, b])) as Record<BadgeKey, Badge>;

export async function awardBadge(userId: string, key: BadgeKey): Promise<boolean> {
  const { error } = await supabase
    .from("user_badges")
    .insert({ user_id: userId, badge_key: key });
  // New badge earned — save to notifications
  if (!error) {
    const badge = BADGE_MAP[key];
    if (badge) {
      await supabase.from("notifications").insert({
        user_id: userId,
        title: `${badge.emoji} Badge Unlocked!`,
        body: `You earned "${badge.title}" — ${badge.description}`,
        url: "/app/goals",
      });
    }
  }
  return !error || error.code === "23505";
}

export async function checkAndAwardMatchBadges(userId: string) {
  const { count } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("status", "accepted")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  const n = count ?? 0;
  if (n >= 1)  await awardBadge(userId, "first_match");
  if (n >= 5)  await awardBadge(userId, "social_butterfly");
  if (n >= 10) await awardBadge(userId, "connector");
}

export async function checkAndAwardGoalBadges(userId: string) {
  // first goal created
  const { count: created } = await supabase
    .from("goals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((created ?? 0) >= 1) await awardBadge(userId, "goal_setter");

  // completed goals
  const { count: completed } = await supabase
    .from("goals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");
  const c = completed ?? 0;
  if (c >= 1) await awardBadge(userId, "goal_crusher");
  if (c >= 5) await awardBadge(userId, "overachiever");
}

export async function checkAndAwardWorkoutBadges(userId: string) {
  const { count } = await supabase
    .from("workouts").select("id", { count: "exact", head: true }).eq("user_id", userId);
  const n = count ?? 0;
  if (n >= 1)  await awardBadge(userId, "first_workout");
  if (n >= 10) await awardBadge(userId, "workout_10");
  if (n >= 50) await awardBadge(userId, "workout_50");

  // Check tier badges
  const pts = await calcUserPoints(userId);
  const tier = calcTier(pts);
  if (tier.key === "silver"  || tier.key === "gold" || tier.key === "diamond") await awardBadge(userId, "silver_achiever");
  if (tier.key === "gold"    || tier.key === "diamond") await awardBadge(userId, "gold_achiever");
  if (tier.key === "diamond") await awardBadge(userId, "diamond_achiever");
}

export async function checkAndAwardProfileBadge(userId: string, profile: Record<string, unknown>) {
  const required = ["full_name", "bio", "city", "fitness_level", "age", "gender"];
  const filled = required.every((k) => profile[k] != null && profile[k] !== "");
  if (filled) await awardBadge(userId, "profile_complete");
}
