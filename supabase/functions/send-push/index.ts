import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @deno-types="npm:@types/web-push"
import webpush from "npm:web-push";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@flexmatches.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const { user_id, title, body, url } = await req.json();
  if (!user_id || !title) return new Response("Missing params", { status: 400 });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", user_id);

  if (!subs || subs.length === 0) return new Response("No subscriptions", { status: 200 });

  const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/app/matches" });

  const results = await Promise.allSettled(
    subs.map((s: any) => webpush.sendNotification(s.subscription, payload)),
  );

  // Remove expired/invalid subscriptions (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      const err = r.reason as any;
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        const sub = subs[i].subscription as any;
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return new Response(JSON.stringify({ sent, total: subs.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
