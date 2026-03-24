import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEMO_USERS } from "@/lib/demo/seed-data";

function isAuthorized(req: NextRequest) {
  const secret = req.headers.get("x-demo-secret");
  return secret === process.env.DEMO_SEED_SECRET;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();

  // ── Step 1: Build email→actualId map from existing demo auth users ─────────
  const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const existingById = new Map<string, string>(); // email → supabase-assigned UUID
  for (const u of authList?.users ?? []) {
    if (u.email?.endsWith("@flex-demo.local")) {
      existingById.set(u.email, u.id);
    }
  }

  // ── Step 2: Create any missing auth users ──────────────────────────────────
  for (const user of DEMO_USERS) {
    if (existingById.has(user.email)) continue;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: "DemoPass123!",
      email_confirm: true,
      user_metadata: { username: user.username, full_name: user.full_name },
    });
    if (authError) {
      // Could have been created in a parallel/race — ignore "already exists"
      if (!authError.message.toLowerCase().includes("already")) {
        return NextResponse.json({ error: `auth create failed for ${user.username}: ${authError.message}` }, { status: 500 });
      }
    } else {
      existingById.set(user.email, authData.user.id);
    }
  }

  // Re-fetch to catch any we missed
  const { data: authList2 } = await supabase.auth.admin.listUsers({ perPage: 200 });
  for (const u of authList2?.users ?? []) {
    if (u.email?.endsWith("@flex-demo.local") && !existingById.has(u.email!)) {
      existingById.set(u.email!, u.id);
    }
  }

  // ── Step 3: Clear any orphan public.users rows for demo usernames ──────────
  const demoUsernames = DEMO_USERS.map((u) => u.username);
  await supabase.from("users").delete().in("username", demoUsernames);

  // ── Step 4: Upsert full profiles using actual Supabase UUIDs ──────────────
  const results: { username: string; status: string; error?: string }[] = [];

  for (const user of DEMO_USERS) {
    const actualId = existingById.get(user.email);
    if (!actualId) {
      results.push({ username: user.username, status: "error", error: "no auth user found" });
      continue;
    }

    const { error: profileError } = await supabase.from("users").upsert(
      {
        id: actualId,
        username: user.username,
        full_name: user.full_name,
        bio: user.bio,
        sports: user.sports,
        fitness_level: user.fitness_level,
        age: user.age,
        gender: user.gender,
        city: user.city,
        gym_name: user.gym_name,
        lat: user.lat,
        lng: user.lng,
        availability: user.availability,
        looking_for: user.looking_for,
        occupation: user.occupation,
        current_streak: user.current_streak,
        avatar_url: null,
        onboarding_completed: true,
        last_active: user.last_active,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      results.push({ username: user.username, status: "error", error: `profile: ${profileError.message}` });
    } else {
      results.push({ username: user.username, status: "ok" });
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const errors = results.filter((r) => r.status === "error");
  return NextResponse.json({ seeded: ok, failed: errors.length, errors });
}

// GET: quick status check
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();
  const demoUsernames = DEMO_USERS.map((u) => u.username);

  const { count: authCount } = await (async () => {
    const { data } = await supabase.auth.admin.listUsers({ perPage: 200 });
    return { count: (data?.users ?? []).filter((u) => u.email?.endsWith("@flex-demo.local")).length };
  })();

  const { count: profileCount } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .in("username", demoUsernames);

  return NextResponse.json({
    total_demo_users: DEMO_USERS.length,
    seeded_auth: authCount ?? 0,
    seeded_profiles: profileCount ?? 0,
  });
}
