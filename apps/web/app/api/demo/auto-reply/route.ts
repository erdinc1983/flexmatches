import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateDemoReply } from "@/lib/demo/chat-engine";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { matchId, demoUserId, incomingMessage } = body as {
    matchId: string;
    demoUserId: string;
    incomingMessage: string;
  };

  if (!matchId || !demoUserId || !incomingMessage) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = adminClient();

  // Safety check: verify this is a demo user by checking their auth email domain
  const { data: { user: authUser } } = await supabase.auth.admin.getUserById(demoUserId);
  if (!authUser || !authUser.email?.endsWith("@flex-demo.local")) {
    return NextResponse.json({ error: "Not a demo user" }, { status: 403 });
  }

  const { text } = generateDemoReply({ demoUserId, incomingMessage });

  // Insert the auto-reply message as the demo user
  const { data, error } = await supabase
    .from("messages")
    .insert({
      match_id: matchId,
      sender_id: demoUserId,
      content: text,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update the match's last_message + updated_at so it surfaces in the list
  await supabase
    .from("matches")
    .update({ last_message: text, updated_at: new Date().toISOString() })
    .eq("id", matchId);

  return NextResponse.json({ message: data });
}
