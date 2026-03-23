import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEMO_USERS } from "@/lib/demo/seed-data";

// Protect with a secret so this can't be triggered accidentally in prod
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
  const results: { id: string; status: string; error?: string }[] = [];

  for (const user of DEMO_USERS) {
    try {
      // 1. Create auth user (idempotent: ignore "already exists")
      const { error: authError } = await (supabase.auth.admin.createUser as any)({
        user_id: user.id,
        email: user.email,
        password: "DemoPass123!",
        email_confirm: true,
      });

      if (authError && !authError.message.includes("already been registered")) {
        results.push({ id: user.id, status: "error", error: `auth: ${authError.message}` });
        continue;
      }

      // 2. Upsert profile
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
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
          preferred_times: user.preferred_times,
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
        results.push({ id: user.id, status: "error", error: `profile: ${profileError.message}` });
        continue;
      }

      results.push({ id: user.id, status: "ok" });
    } catch (err: any) {
      results.push({ id: user.id, status: "error", error: err.message });
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const errors = results.filter((r) => r.status === "error");

  return NextResponse.json({
    seeded: ok,
    failed: errors.length,
    errors,
  });
}

// GET: quick status check — counts how many demo profiles exist
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();
  const demoIds = DEMO_USERS.map((u) => u.id);

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("id", demoIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    total_demo_users: DEMO_USERS.length,
    seeded_in_db: count ?? 0,
  });
}
