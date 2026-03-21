import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getCallerUserId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const supabase = adminClient();
  const { data } = await supabase.auth.getUser(token);
  return data?.user?.id ?? null;
}

async function callerIsAdmin(req: NextRequest): Promise<boolean> {
  const uid = await getCallerUserId(req);
  if (!uid) return false;
  const supabase = adminClient();
  const { data } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", uid)
    .single();
  return data?.is_admin === true;
}

// ─── GET /api/admin/users — list all users ────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await callerIsAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = adminClient();

  // Get auth users (has email)
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  // Get public profile data
  const { data: profiles, error: profileError } = await supabase
    .from("users")
    .select("id, full_name, username, city, sports, fitness_level, is_admin, is_pro, banned_at, created_at, avatar_url");

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const profileMap = new Map((profiles ?? []).map((p: Record<string, unknown>) => [p.id, p]));

  const users = (authData?.users ?? []).map((u) => {
    const p = profileMap.get(u.id) as Record<string, unknown> | undefined;
    return {
      id: u.id,
      email: u.email ?? null,
      full_name: p?.full_name ?? null,
      username: p?.username ?? null,
      city: p?.city ?? null,
      sports: p?.sports ?? null,
      fitness_level: p?.fitness_level ?? null,
      is_admin: p?.is_admin ?? false,
      is_pro: p?.is_pro ?? false,
      banned_at: p?.banned_at ?? null,
      avatar_url: p?.avatar_url ?? null,
      created_at: (p?.created_at as string) ?? u.created_at,
    };
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ users });
}

// ─── PATCH /api/admin/users — ban / unban / promote ──────────────────────────
// body: { userId, action: "ban" | "unban" | "promote" | "demote" }

export async function PATCH(req: NextRequest) {
  if (!(await callerIsAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { userId, action, full_name, username, city, fitness_level, sports } = body;
  if (!userId || !action)
    return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });

  const supabase = adminClient();

  if (action === "ban") {
    // ban in auth (cannot login)
    await supabase.auth.admin.updateUserById(userId, {
      ban_duration: "876600h", // 100 years
    });
    // mark in public.users
    const { error } = await supabase
      .from("users")
      .update({ banned_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === "unban") {
    await supabase.auth.admin.updateUserById(userId, { ban_duration: "none" });
    const { error } = await supabase
      .from("users")
      .update({ banned_at: null })
      .eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === "promote") {
    const { error } = await supabase
      .from("users")
      .update({ is_admin: true })
      .eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === "demote") {
    const { error } = await supabase
      .from("users")
      .update({ is_admin: false })
      .eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === "make_pro") {
    const { error } = await supabase
      .from("users")
      .update({ is_pro: true })
      .eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === "remove_pro") {
    const { error } = await supabase
      .from("users")
      .update({ is_pro: false })
      .eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === "edit") {
    const updates: Record<string, unknown> = {};
    if (full_name     !== undefined) updates.full_name     = full_name;
    if (username      !== undefined) updates.username      = username;
    if (city          !== undefined) updates.city          = city;
    if (fitness_level !== undefined) updates.fitness_level = fitness_level;
    if (sports        !== undefined) updates.sports        = sports;
    const { error } = await supabase.from("users").update(updates).eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

// ─── DELETE /api/admin/users — permanently delete a user ─────────────────────
// body: { userId }

export async function DELETE(req: NextRequest) {
  if (!(await callerIsAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId)
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const supabase = adminClient();

  // delete from auth (cascades to public.users via FK trigger)
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
