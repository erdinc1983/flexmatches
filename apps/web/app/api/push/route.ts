import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  webpush.setVapidDetails(
    "mailto:admin@flexmatches.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { targetUserId, title, body, url } = await req.json();
  if (!targetUserId) return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", targetUserId);

  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 });

  const payload = JSON.stringify({ title, body, url });
  let sent = 0;

  await Promise.all(
    subs.map(async (row: any) => {
      try {
        await webpush.sendNotification(row.subscription, payload);
        sent++;
      } catch {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", row.subscription.endpoint);
      }
    })
  );

  return NextResponse.json({ sent });
}
