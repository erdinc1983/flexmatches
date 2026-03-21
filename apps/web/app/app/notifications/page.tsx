"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Notif = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifs(); }, []);

  async function loadNotifs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setNotifs(data ?? []);

    // Mark all as read
    await supabase.from("notifications").update({ read: true })
      .eq("user_id", user.id).eq("read", false);

    setLoading(false);
  }

  async function clearAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifs([]);
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: "20px 16px", paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer", padding: 0 }}>←</button>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>Notifications</h1>
        </div>
        {notifs.length > 0 && (
          <button onClick={clearAll}
            style={{ fontSize: 12, color: "var(--text-faint)", background: "transparent", border: "1px solid var(--border-medium)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}>
            Clear all
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <div style={{ fontSize: 56 }}>🔔</div>
          <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 18, marginTop: 16 }}>No notifications yet</p>
          <p style={{ color: "var(--text-faint)", fontSize: 14, marginTop: 8 }}>You'll see matches, messages and updates here</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notifs.map((n) => (
            <div key={n.id}
              onClick={() => n.url && router.push(n.url)}
              style={{ background: n.read ? "var(--bg-card)" : "#1a0800", borderRadius: 14, padding: "14px 16px", border: `1px solid ${n.read ? "var(--bg-card-alt)" : "#FF450033"}`, cursor: n.url ? "pointer" : "default", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: n.read ? "var(--bg-card-alt)" : "#FF450022", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, border: `1px solid ${n.read ? "var(--bg-input)" : "#FF450033"}` }}>
                {n.title.startsWith("🎉") ? "🎉" : n.title.startsWith("💪") ? "💪" : n.title.startsWith("🤝") ? "🤝" : n.title.startsWith("📅") ? "📅" : "🔔"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: n.read ? "var(--text-secondary)" : "var(--text-primary)", fontSize: 14, marginBottom: 2 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4 }}>{n.body}</div>
                <div style={{ fontSize: 11, color: "var(--text-ultra-faint)", marginTop: 6 }}>{timeAgo(n.created_at)}</div>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--accent)", flexShrink: 0, marginTop: 4 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
