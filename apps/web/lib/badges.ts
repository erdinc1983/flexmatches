import { supabase } from "./supabase";

export type BadgeKey =
  | "first_match"
  | "social_butterfly"
  | "connector"
  | "goal_setter"
  | "goal_crusher"
  | "overachiever"
  | "profile_complete"
  | "early_adopter"
  | "event_organizer";

export type Badge = {
  key: BadgeKey;
  emoji: string;
  title: string;
  description: string;
  color: string;
};

export const BADGES: Badge[] = [
  { key: "first_match",      emoji: "🤝", title: "First Connection", description: "Made your first match",         color: "#22c55e" },
  { key: "social_butterfly", emoji: "🦋", title: "Social Butterfly",  description: "Connected with 5 people",      color: "#a855f7" },
  { key: "connector",        emoji: "🌟", title: "Super Connector",   description: "Connected with 10 people",     color: "#f59e0b" },
  { key: "goal_setter",      emoji: "🎯", title: "Goal Setter",       description: "Created your first goal",      color: "#3b82f6" },
  { key: "goal_crusher",     emoji: "💪", title: "Goal Crusher",      description: "Completed your first goal",    color: "#FF4500" },
  { key: "overachiever",     emoji: "🏆", title: "Overachiever",      description: "Completed 5 goals",            color: "#f59e0b" },
  { key: "profile_complete", emoji: "✅", title: "Complete Profile",  description: "Filled out your full profile", color: "#22c55e" },
  { key: "early_adopter",    emoji: "🚀", title: "Early Adopter",     description: "One of the first 100 users",   color: "#FF4500" },
  { key: "event_organizer",  emoji: "🎪", title: "Event Organizer",   description: "Created your first event",      color: "#a855f7" },
];

export const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.key, b])) as Record<BadgeKey, Badge>;

export async function awardBadge(userId: string, key: BadgeKey): Promise<boolean> {
  const { error } = await supabase
    .from("user_badges")
    .insert({ user_id: userId, badge_key: key });
  // If already exists, unique constraint fires — that's fine
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

export async function checkAndAwardProfileBadge(userId: string, profile: Record<string, unknown>) {
  const required = ["full_name", "bio", "city", "fitness_level", "age", "gender"];
  const filled = required.every((k) => profile[k] != null && profile[k] !== "");
  if (filled) await awardBadge(userId, "profile_complete");
}
