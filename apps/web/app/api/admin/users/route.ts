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
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, full_name, username, email, city, sports, fitness_level, is_admin, banned_at, created_at, avatar_url"
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

// ─── PATCH /api/admin/users — ban / unban / promote ──────────────────────────
// body: { userId, action: "ban" | "unban" | "promote" | "demote" }

export async function PATCH(req: NextRequest) {
  if (!(await callerIsAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, action } = await req.json();
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
