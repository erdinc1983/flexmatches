# FlexMatches Demo Mode

A local demo/testing environment with 50 fictional users around Willow Grove, PA for testing the full matching, chat, and session flow without real users.

---

## Architecture

| File | Purpose |
|------|---------|
| `lib/demo/seed-data.ts` | 50 fictional demo users with personalities, response speeds, bios |
| `lib/demo/chat-engine.ts` | Intent detection + persona-based response generation |
| `app/api/demo/seed/route.ts` | One-time seeding endpoint (POST to create users in DB) |
| `app/api/demo/auto-reply/route.ts` | Called after each sent message to trigger auto-reply |

---

## Setup

### 1. Set environment variables

Add to `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DEMO_SEED_SECRET=choose_any_secret_here
```

The `DEMO_SEED_SECRET` protects the seed endpoint from accidental triggers.

### 2. Seed the demo users (one-time)

```bash
curl -X POST http://localhost:3000/api/demo/seed \
  -H "x-demo-secret: your_secret_here"
```

Or from the browser console:
```js
fetch('/api/demo/seed', { method: 'POST', headers: { 'x-demo-secret': 'your_secret_here' } })
  .then(r => r.json()).then(console.log)
```

Expected response:
```json
{ "seeded": 50, "failed": 0, "errors": [] }
```

Re-running is safe — uses `upsert` so existing records are updated.

### 3. Check seeding status

```bash
curl http://localhost:3000/api/demo/seed \
  -H "x-demo-secret: your_secret_here"
```

Returns `{ "total_demo_users": 50, "seeded_in_db": 50 }`.

---

## Demo Users

- **50 users** spread across Willow Grove, Horsham, Abington, Jenkintown, Glenside, Warminster, Ambler, Fort Washington, North Wales, Hatboro
- **20 male** (IDs: `demo0001-0000-0000-0000-000000000001` through `...000020`)
- **20 female** (IDs: `demo0021-0000-0000-0000-000000000021` through `...000040`)
- **10 other** (IDs: `demo0041-0000-0000-0000-000000000041` through `...000050`)
- Ages: 22–45
- Sports: Gym, Running, Basketball, Yoga, Hiking, CrossFit, Cycling, Swimming, Boxing
- Gyms: LA Fitness, Planet Fitness, Anytime Fitness, CrossFit Horsham, Jenkintown YMCA, etc.

### Personalities

| Personality | Style |
|------------|-------|
| `direct` | Short, no-nonsense replies |
| `friendly` | Warm, asks questions back, uses emoji |
| `reserved` | Brief, takes time to open up |
| `hype` | Enthusiastic, caps, lots of emoji |

### Response speeds

| Speed | Delay |
|-------|-------|
| `fast` | ~1.5s |
| `medium` | ~3s |
| `slow` | ~6s |

---

## Chat Auto-Reply

When a real user sends a message to a demo user:
1. The chat page calls `POST /api/demo/auto-reply`
2. The API detects the intent of the incoming message (greeting, workout type, gym location, meetup suggestion, etc.)
3. It picks a response template matching the demo user's personality and fills in their actual data (sports, gym, preferred times, goals)
4. The message is inserted into the DB as the demo user via service role key
5. Supabase realtime delivers it to the chat page — no polling needed

### Supported intents

- `greeting` — hi / hey / what's up
- `asking_how_are_you` — how are you / how's it going
- `asking_workout_type` — what sports / what do you do
- `asking_gym_location` — which gym / where do you train
- `asking_preferred_time` — what time / when are you available
- `suggesting_meetup` — want to work out together / let's meet
- `confirming_plan` — sounds good / I'm in / yes
- `declining` — can't make it / not available / busy
- `rescheduling` — different day / can we reschedule
- `asking_fitness_level` — how long have you trained / experience level
- `asking_goals` — what are your goals / why do you work out
- `compliment` — great profile / you look fit
- `farewell` — bye / take care / talk later
- `generic` — fallback for anything else

---

## Limitations & Notes

- Demo users have `password: "DemoPass123!"` — don't use real passwords
- Demo users are distinguishable by their ID prefix (`demo0001-...`)
- `DEMO_USER_IDS` is a `Set` exported from `seed-data.ts` for O(1) lookup
- The auto-reply endpoint only accepts IDs in `DEMO_USER_IDS` as a safety check
- Demo users will not show up in production matching unless you specifically set matching radius to include Willow Grove area
- The reply delay is server-side only — the response is inserted immediately on the server, then Supabase realtime delivers it after the DB insert
