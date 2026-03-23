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
  | "week_warrior"
  | "month_champion"
  | "goal_crusher"
  | "workout_50"
  | "first_referral"
  | "reliable_partner";

export type Badge = {
  key: BadgeKey;
  emoji: string;
  title: string;
  description: string;
  color: string;
};

export const BADGES: Badge[] = [
  { key: "first_match",      emoji: "🤝", title: "First Connection",  description: "Made your first match",             color: "var(--success)" },
  { key: "week_warrior",     emoji: "🔥", title: "Week Warrior",      description: "7-day check-in streak",             color: "#f59e0b" },
  { key: "month_champion",   emoji: "👑", title: "Month Champion",    description: "30-day check-in streak",            color: "#f59e0b" },
  { key: "goal_crusher",     emoji: "💪", title: "Goal Crusher",      description: "Completed your first goal",         color: "var(--accent)" },
  { key: "workout_50",       emoji: "🔱", title: "Iron Will",         description: "Logged 50 workouts",                color: "var(--accent)" },
  { key: "first_referral",   emoji: "📣", title: "First Referral",    description: "Invited your first friend",         color: "#a855f7" },
  { key: "reliable_partner", emoji: "🫱", title: "Reliable Partner",  description: "Confirmed 3+ partner sessions",     color: "#22c55e" },
];

export const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.key, b])) as Record<BadgeKey, Badge>;

export async function awardBadge(userId: string, key: BadgeKey): Promise<boolean> {
  const { error } = await supabase
    .from("user_badges")
    .insert({ user_id: userId, badge_key: key });
  // New badge earned — save to notifications + post to feed
  if (!error) {
    const badge = BADGE_MAP[key];
    if (badge) {
      await Promise.all([
        supabase.from("notifications").insert({
          user_id: userId,
          title: `${badge.emoji} Badge Unlocked!`,
          body: `You earned "${badge.title}" — ${badge.description}`,
          url: "/app/goals",
        }),
        supabase.from("feed_posts").insert({
          user_id: userId,
          post_type: "badge",
          content: `${badge.emoji} Earned "${badge.title}" — ${badge.description}`,
          meta: { badge_key: key },
        }),
      ]);
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
  if ((count ?? 0) >= 1) await awardBadge(userId, "first_match");
}

export async function checkAndAwardGoalBadges(userId: string) {
  const { count: completed } = await supabase
    .from("goals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");
  if ((completed ?? 0) >= 1) await awardBadge(userId, "goal_crusher");
}

export async function checkAndAwardWorkoutBadges(userId: string) {
  const { count } = await supabase
    .from("workouts").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= 50) await awardBadge(userId, "workout_50");
}

export async function checkAndAwardPartnerBadge(userId: string) {
  const { count } = await supabase
    .from("workout_invites")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  if ((count ?? 0) >= 3) await awardBadge(userId, "reliable_partner");
}
