-- ============================================================
-- FlexMatches Full Migration
-- Run this in Supabase SQL Editor (safe to run multiple times)
-- ============================================================

-- ─── 1. USERS TABLE — add missing columns ───────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name         text,
  ADD COLUMN IF NOT EXISTS bio               text,
  ADD COLUMN IF NOT EXISTS city              text,
  ADD COLUMN IF NOT EXISTS gym_name          text,
  ADD COLUMN IF NOT EXISTS fitness_level     text CHECK (fitness_level IN ('beginner','intermediate','advanced')),
  ADD COLUMN IF NOT EXISTS age               int,
  ADD COLUMN IF NOT EXISTS avatar_url        text,
  ADD COLUMN IF NOT EXISTS weight            numeric,
  ADD COLUMN IF NOT EXISTS target_weight     numeric,
  ADD COLUMN IF NOT EXISTS gender            text,
  ADD COLUMN IF NOT EXISTS sports            text[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certifications    text[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability      jsonb     DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS privacy_settings  jsonb     DEFAULT '{"hide_age":false,"hide_city":false,"hide_weight":false,"hide_profile":false}',
  ADD COLUMN IF NOT EXISTS preferred_times   text[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lat               numeric,
  ADD COLUMN IF NOT EXISTS lng               numeric,
  ADD COLUMN IF NOT EXISTS current_streak    int       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak    int       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checkin_date date,
  ADD COLUMN IF NOT EXISTS occupation        text,
  ADD COLUMN IF NOT EXISTS company           text,
  ADD COLUMN IF NOT EXISTS industry          text,
  ADD COLUMN IF NOT EXISTS education_level   text,
  ADD COLUMN IF NOT EXISTS career_goals      text,
  ADD COLUMN IF NOT EXISTS is_pro            boolean   DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at        timestamptz DEFAULT now();

-- ─── 2. MESSAGES — add read_at ──────────────────────────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- ─── 3. BLOCKS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blocks_select" ON public.blocks;
CREATE POLICY "blocks_select" ON public.blocks FOR SELECT USING (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "blocks_insert" ON public.blocks;
CREATE POLICY "blocks_insert" ON public.blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "blocks_delete" ON public.blocks;
CREATE POLICY "blocks_delete" ON public.blocks FOR DELETE USING (auth.uid() = blocker_id);

-- ─── 4. PASSES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.passes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  passed_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, passed_id)
);
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "passes_all" ON public.passes;
CREATE POLICY "passes_all" ON public.passes USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── 5. FAVORITES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favorites (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  favorited_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (user_id, favorited_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "favorites_all" ON public.favorites;
CREATE POLICY "favorites_all" ON public.favorites USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── 6. PUSH SUBSCRIPTIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint     text NOT NULL,
  subscription jsonb NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_subs_all" ON public.push_subscriptions;
CREATE POLICY "push_subs_all" ON public.push_subscriptions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── 7. NOTIFICATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text,
  url        text,
  read       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifs_all" ON public.notifications;
CREATE POLICY "notifs_all" ON public.notifications USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── 8. USER BADGES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_badges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_key  text NOT NULL,
  earned_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, badge_key)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badges_select" ON public.user_badges;
CREATE POLICY "badges_select" ON public.user_badges FOR SELECT USING (true);
DROP POLICY IF EXISTS "badges_insert" ON public.user_badges;
CREATE POLICY "badges_insert" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── 9. WORKOUTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workouts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  exercise_type text NOT NULL,
  duration_min  int,
  calories      int,
  notes         text,
  logged_at     timestamptz DEFAULT now()
);
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workouts_all" ON public.workouts;
CREATE POLICY "workouts_all" ON public.workouts USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── 10. BODY MEASUREMENTS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  weight    numeric,
  body_fat  numeric,
  chest     numeric,
  waist     numeric,
  hips      numeric,
  notes     text,
  logged_at timestamptz DEFAULT now()
);
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "measurements_all" ON public.body_measurements;
CREATE POLICY "measurements_all" ON public.body_measurements USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── 11. GOALS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  goal_type     text,
  target_value  numeric,
  current_value numeric DEFAULT 0,
  unit          text,
  deadline      date,
  status        text DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goals_all" ON public.goals;
CREATE POLICY "goals_all" ON public.goals USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── 12. HABITS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.habits (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  emoji      text DEFAULT '✅',
  color      text DEFAULT '#FF4500',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habits_all" ON public.habits;
CREATE POLICY "habits_all" ON public.habits USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── 13. HABIT LOGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  habit_id    uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  logged_date date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (habit_id, logged_date)
);
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habit_logs_all" ON public.habit_logs;
CREATE POLICY "habit_logs_all" ON public.habit_logs USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── 14. PUBLIC CHALLENGES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  goal_type    text NOT NULL,
  target_value numeric,
  unit         text,
  end_date     date,
  created_by   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_public    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "challenges_select" ON public.challenges;
CREATE POLICY "challenges_select" ON public.challenges FOR SELECT USING (is_public = true OR auth.uid() = created_by);
DROP POLICY IF EXISTS "challenges_insert" ON public.challenges;
CREATE POLICY "challenges_insert" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "challenges_delete" ON public.challenges;
CREATE POLICY "challenges_delete" ON public.challenges FOR DELETE USING (auth.uid() = created_by);

-- ─── 15. CHALLENGE PARTICIPANTS ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_value numeric DEFAULT 0,
  joined_at     timestamptz DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cp_select" ON public.challenge_participants;
CREATE POLICY "cp_select" ON public.challenge_participants FOR SELECT USING (true);
DROP POLICY IF EXISTS "cp_insert" ON public.challenge_participants;
CREATE POLICY "cp_insert" ON public.challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cp_update" ON public.challenge_participants;
CREATE POLICY "cp_update" ON public.challenge_participants FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "cp_delete" ON public.challenge_participants;
CREATE POLICY "cp_delete" ON public.challenge_participants FOR DELETE USING (auth.uid() = user_id);

-- ─── 16. COMMUNITIES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  sport        text,
  city         text,
  avatar_emoji text DEFAULT '🏋️',
  creator_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "communities_select" ON public.communities;
CREATE POLICY "communities_select" ON public.communities FOR SELECT USING (true);
DROP POLICY IF EXISTS "communities_insert" ON public.communities;
CREATE POLICY "communities_insert" ON public.communities FOR INSERT WITH CHECK (auth.uid() = creator_id);
DROP POLICY IF EXISTS "communities_update" ON public.communities;
CREATE POLICY "communities_update" ON public.communities FOR UPDATE USING (auth.uid() = creator_id);

-- ─── 17. COMMUNITY MEMBERS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at    timestamptz DEFAULT now(),
  UNIQUE (community_id, user_id)
);
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cm_select" ON public.community_members;
CREATE POLICY "cm_select" ON public.community_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "cm_insert" ON public.community_members;
CREATE POLICY "cm_insert" ON public.community_members FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cm_delete" ON public.community_members;
CREATE POLICY "cm_delete" ON public.community_members FOR DELETE USING (auth.uid() = user_id);

-- ─── 18. COMMUNITY POSTS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content      text NOT NULL,
  is_pinned    boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "posts_select" ON public.community_posts;
CREATE POLICY "posts_select" ON public.community_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "posts_insert" ON public.community_posts;
CREATE POLICY "posts_insert" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "posts_delete" ON public.community_posts;
CREATE POLICY "posts_delete" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "posts_update" ON public.community_posts;
CREATE POLICY "posts_update" ON public.community_posts FOR UPDATE USING (auth.uid() = user_id);

-- ─── 19. COMMUNITY POLLS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_polls (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question     text NOT NULL,
  options      text[] NOT NULL,
  ends_at      timestamptz,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "polls_select" ON public.community_polls;
CREATE POLICY "polls_select" ON public.community_polls FOR SELECT USING (true);
DROP POLICY IF EXISTS "polls_insert" ON public.community_polls;
CREATE POLICY "polls_insert" ON public.community_polls FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── 20. COMMUNITY POLL VOTES ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_poll_votes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      uuid NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  option_index int NOT NULL,
  UNIQUE (poll_id, user_id)
);
ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "votes_select" ON public.community_poll_votes;
CREATE POLICY "votes_select" ON public.community_poll_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "votes_insert" ON public.community_poll_votes;
CREATE POLICY "votes_insert" ON public.community_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── 21. POST REACTIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji   text NOT NULL DEFAULT '❤️',
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reactions_select" ON public.post_reactions;
CREATE POLICY "reactions_select" ON public.post_reactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "reactions_insert" ON public.post_reactions;
CREATE POLICY "reactions_insert" ON public.post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reactions_delete" ON public.post_reactions;
CREATE POLICY "reactions_delete" ON public.post_reactions FOR DELETE USING (auth.uid() = user_id);

-- ─── 22. EVENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  sport            text NOT NULL,
  location_name    text,
  event_date       timestamptz NOT NULL,
  max_participants int DEFAULT 20,
  visibility       text DEFAULT 'public' CHECK (visibility IN ('public','private')),
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_select" ON public.events;
CREATE POLICY "events_select" ON public.events FOR SELECT USING (visibility = 'public' OR auth.uid() = creator_id);
DROP POLICY IF EXISTS "events_insert" ON public.events;
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (auth.uid() = creator_id);
DROP POLICY IF EXISTS "events_update" ON public.events;
CREATE POLICY "events_update" ON public.events FOR UPDATE USING (auth.uid() = creator_id);
DROP POLICY IF EXISTS "events_delete" ON public.events;
CREATE POLICY "events_delete" ON public.events FOR DELETE USING (auth.uid() = creator_id);

-- ─── 23. EVENT PARTICIPANTS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_participants (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id  uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ep_select" ON public.event_participants;
CREATE POLICY "ep_select" ON public.event_participants FOR SELECT USING (true);
DROP POLICY IF EXISTS "ep_insert" ON public.event_participants;
CREATE POLICY "ep_insert" ON public.event_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ep_delete" ON public.event_participants;
CREATE POLICY "ep_delete" ON public.event_participants FOR DELETE USING (auth.uid() = user_id);

-- ─── 24. EVENT WAITLIST ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_waitlist (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id  uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ew_select" ON public.event_waitlist;
CREATE POLICY "ew_select" ON public.event_waitlist FOR SELECT USING (true);
DROP POLICY IF EXISTS "ew_insert" ON public.event_waitlist;
CREATE POLICY "ew_insert" ON public.event_waitlist FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ew_delete" ON public.event_waitlist;
CREATE POLICY "ew_delete" ON public.event_waitlist FOR DELETE USING (auth.uid() = user_id);

-- ─── 25. REPORTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_insert" ON public.reports;
CREATE POLICY "reports_insert" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "reports_select" ON public.reports;
CREATE POLICY "reports_select" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);

-- ─── 26. REFERRALS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  referral_code text NOT NULL UNIQUE,
  status        text DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrals_all" ON public.referrals;
CREATE POLICY "referrals_all" ON public.referrals USING (auth.uid() = referrer_id) WITH CHECK (auth.uid() = referrer_id);
DROP POLICY IF EXISTS "referrals_select_code" ON public.referrals;
CREATE POLICY "referrals_select_code" ON public.referrals FOR SELECT USING (true);

-- ─── 27. WORKOUT INVITES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workout_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id    uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  message     text,
  workout_at  timestamptz,
  status      text DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.workout_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invites_all" ON public.workout_invites;
CREATE POLICY "invites_all" ON public.workout_invites USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "invites_insert" ON public.workout_invites;
CREATE POLICY "invites_insert" ON public.workout_invites FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ─── 28. GROUP MESSAGES (event/community chat) ───────────────
CREATE TABLE IF NOT EXISTS public.group_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type    text NOT NULL CHECK (room_type IN ('event','community')),
  room_id      uuid NOT NULL,
  sender_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content      text NOT NULL,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gm_select" ON public.group_messages;
CREATE POLICY "gm_select" ON public.group_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "gm_insert" ON public.group_messages;
CREATE POLICY "gm_insert" ON public.group_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ─── 29. BUG REPORTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  category    text,
  description text NOT NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bugs_insert" ON public.bug_reports;
CREATE POLICY "bugs_insert" ON public.bug_reports FOR INSERT WITH CHECK (true);

-- ─── 30. REALTIME enable ─────────────────────────────────────
-- Enable realtime for chat tables (run in Supabase dashboard if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- ─── 31. GYM STATUS (users table additions) ──────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_at_gym       boolean   DEFAULT false,
  ADD COLUMN IF NOT EXISTS gym_checkin_at  timestamptz,
  ADD COLUMN IF NOT EXISTS total_kudos     int       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leaderboard_tier text     DEFAULT 'bronze' CHECK (leaderboard_tier IN ('bronze','silver','gold','platinum','diamond'));

-- ─── 32. FEED POSTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  post_type   text NOT NULL CHECK (post_type IN ('workout','goal','badge','match','event','milestone')),
  content     text,
  meta        jsonb     DEFAULT '{}',
  kudos_count int       DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fp_select" ON public.feed_posts;
CREATE POLICY "fp_select" ON public.feed_posts FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.status = 'matched'
      AND ((m.user1_id = auth.uid() AND m.user2_id = feed_posts.user_id)
        OR (m.user2_id = auth.uid() AND m.user1_id = feed_posts.user_id))
  )
);
DROP POLICY IF EXISTS "fp_insert" ON public.feed_posts;
CREATE POLICY "fp_insert" ON public.feed_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "fp_delete" ON public.feed_posts;
CREATE POLICY "fp_delete" ON public.feed_posts FOR DELETE USING (auth.uid() = user_id);

-- ─── 33. FEED REACTIONS (kudos) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.feed_reactions (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id  uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji    text NOT NULL DEFAULT '🔥',
  created_at timestamptz DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fr_select" ON public.feed_reactions;
CREATE POLICY "fr_select" ON public.feed_reactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "fr_insert" ON public.feed_reactions;
CREATE POLICY "fr_insert" ON public.feed_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "fr_delete" ON public.feed_reactions;
CREATE POLICY "fr_delete" ON public.feed_reactions FOR DELETE USING (auth.uid() = user_id);

-- Auto-update kudos_count on feed_posts when reaction added/removed
CREATE OR REPLACE FUNCTION public.update_feed_kudos() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_posts SET kudos_count = kudos_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_posts SET kudos_count = GREATEST(kudos_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_feed_kudos ON public.feed_reactions;
CREATE TRIGGER trg_feed_kudos
  AFTER INSERT OR DELETE ON public.feed_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_feed_kudos();

-- ─── 34. FEED COMMENTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feed_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fc_select" ON public.feed_comments;
CREATE POLICY "fc_select" ON public.feed_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "fc_insert" ON public.feed_comments;
CREATE POLICY "fc_insert" ON public.feed_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "fc_delete" ON public.feed_comments;
CREATE POLICY "fc_delete" ON public.feed_comments FOR DELETE USING (auth.uid() = user_id);

-- ─── 35. BUDDY SESSIONS (workout scheduling) ─────────────────
CREATE TABLE IF NOT EXISTS public.buddy_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id     uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  sport        text NOT NULL,
  location     text,
  session_date date NOT NULL,
  session_time text,
  notes        text,
  status       text DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','completed','cancelled')),
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.buddy_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bs_select" ON public.buddy_sessions;
CREATE POLICY "bs_select" ON public.buddy_sessions FOR SELECT USING (auth.uid() = proposer_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "bs_insert" ON public.buddy_sessions;
CREATE POLICY "bs_insert" ON public.buddy_sessions FOR INSERT WITH CHECK (auth.uid() = proposer_id);
DROP POLICY IF EXISTS "bs_update" ON public.buddy_sessions;
CREATE POLICY "bs_update" ON public.buddy_sessions FOR UPDATE USING (auth.uid() = proposer_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "bs_delete" ON public.buddy_sessions;
CREATE POLICY "bs_delete" ON public.buddy_sessions FOR DELETE USING (auth.uid() = proposer_id);

-- ─── 36. REALTIME additions ───────────────────────────────────
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_reactions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.buddy_sessions;

-- ─── DONE ────────────────────────────────────────────────────
-- All tables created. You can now use all features of the app.

-- ─── 37. ADMIN ────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at  timestamptz;

-- Set yourself as admin (replace with your actual user id after running):
-- UPDATE public.users SET is_admin = true WHERE id = 'YOUR-USER-UUID-HERE';

-- RLS: admins can read all users
DROP POLICY IF EXISTS "admin_read_all" ON public.users;
CREATE POLICY "admin_read_all" ON public.users
  FOR SELECT USING (
    auth.uid() = id
    OR (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
  );

-- RLS: admins can update any user (for ban / promote)
DROP POLICY IF EXISTS "admin_update_any" ON public.users;
CREATE POLICY "admin_update_any" ON public.users
  FOR UPDATE USING (
    auth.uid() = id
    OR (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
  );

-- ─── 38. AFFILIATE CLICK TRACKING ────────────────────────────
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  product_id   text NOT NULL,
  product_name text,
  brand        text,
  affiliate_program text,
  price_usd    numeric,
  clicked_at   timestamptz DEFAULT now()
);
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ac_insert" ON public.affiliate_clicks;
CREATE POLICY "ac_insert" ON public.affiliate_clicks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ac_admin_read" ON public.affiliate_clicks;
CREATE POLICY "ac_admin_read" ON public.affiliate_clicks FOR SELECT USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);
