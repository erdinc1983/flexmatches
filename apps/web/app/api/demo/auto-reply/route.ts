import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateDemoReply } from "@/lib/demo/chat-engine";
import { DEMO_USER_IDS } from "@/lib/demo/seed-data";

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

  // Safety check: only allow demo users to auto-reply
  if (!DEMO_USER_IDS.has(demoUserId)) {
    return NextResponse.json({ error: "Not a demo user" }, { status: 403 });
  }

  const { text } = generateDemoReply({ demoUserId, incomingMessage });

  const supabase = adminClient();

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
