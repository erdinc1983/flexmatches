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

function getNotifMeta(n: Notif): { emoji: string; iconBg: string; iconColor: string; borderColor: string } {
  const t = n.title;
  if (t.startsWith("🤝") || t.toLowerCase().includes("match")) {
    return { emoji: "🤝", iconBg: "#1a0800", iconColor: "var(--accent)", borderColor: "#FF450044" };
  }
  if (t.startsWith("💬") || t.toLowerCase().includes("message")) {
    return { emoji: "💬", iconBg: "#001a2a", iconColor: "#00d4ff", borderColor: "#00d4ff44" };
  }
  if (t.startsWith("🏅") || t.startsWith("🥇") || t.toLowerCase().includes("badge") || t.toLowerCase().includes("award")) {
    return { emoji: "🏅", iconBg: "#1a1400", iconColor: "#FFD700", borderColor: "#FFD70044" };
  }
  if (t.startsWith("🎉") || t.toLowerCase().includes("congrat")) {
    return { emoji: "🎉", iconBg: "#0d1f0d", iconColor: "#22c55e", borderColor: "#22c55e44" };
  }
  if (t.startsWith("📅") || t.toLowerCase().includes("event")) {
    return { emoji: "📅", iconBg: "#180d2a", iconColor: "#a855f7", borderColor: "#a855f744" };
  }
  if (t.startsWith("💪") || t.toLowerCase().includes("workout") || t.toLowerCase().includes("streak")) {
    return { emoji: "💪", iconBg: "#1a0800", iconColor: "var(--accent)", borderColor: "#FF450044" };
  }
  return { emoji: "🔔", iconBg: "var(--bg-card-alt)", iconColor: "var(--text-muted)", borderColor: "var(--border-medium)" };
}

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

  function isToday(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }

  const todayNotifs = notifs.filter((n) => isToday(n.created_at));
  const earlierNotifs = notifs.filter((n) => !isToday(n.created_at));
  const unreadCount = notifs.filter((n) => !n.read).length;

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: "0 0 90px" }}>

      {/* Header */}
      <div style={{ padding: "24px 16px 20px", background: "var(--bg-page)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.back()}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-medium)", color: "var(--text-muted)", fontSize: 18, cursor: "pointer", padding: "6px 10px", borderRadius: 10, lineHeight: 1 }}>←</button>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text-primary)", margin: 0, lineHeight: 1 }}>Notifications</h1>
              {unreadCount > 0 && (
                <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, marginTop: 3 }}>{unreadCount} unread</div>
              )}
            </div>
          </div>
          {notifs.length > 0 && (
            <button onClick={clearAll}
              style={{ fontSize: 12, color: "var(--text-faint)", background: "var(--bg-card)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 700 }}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {notifs.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 80, padding: "80px 32px 0" }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, background: "var(--bg-card)", border: "1px solid var(--border-medium)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 20px" }}>🔔</div>
          <p style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 20, margin: "0 0 8px" }}>All caught up!</p>
          <p style={{ color: "var(--text-faint)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>You'll see matches, messages and updates here when they arrive.</p>
          <button onClick={() => router.push("/app/discover")}
            style={{ marginTop: 24, padding: "12px 28px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            Find Partners →
          </button>
        </div>
      ) : (
        <div style={{ padding: "16px 16px 0" }}>

          {/* Today group */}
          {todayNotifs.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: 0.5, marginBottom: 10 }}>TODAY</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {todayNotifs.map((n) => {
                  const meta = getNotifMeta(n);
                  return (
                    <div key={n.id}
                      onClick={() => n.url && router.push(n.url)}
                      style={{
                        background: "var(--bg-card)",
                        borderRadius: 16,
                        padding: "14px 14px",
                        border: `1px solid ${n.read ? "var(--border)" : meta.borderColor}`,
                        cursor: n.url ? "pointer" : "default",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        borderLeft: `3px solid ${n.read ? "var(--border-medium)" : meta.iconColor}`,
                      }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 20, flexShrink: 0,
                        background: meta.iconBg,
                        border: `1px solid ${meta.borderColor}`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                      }}>
                        {meta.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14, marginBottom: 3 }}>{n.title}</div>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>{n.body}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontWeight: 600 }}>{timeAgo(n.created_at)}</div>
                      </div>
                      {!n.read && <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--accent)", flexShrink: 0, marginTop: 6 }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Earlier group */}
          {earlierNotifs.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: 0.5, marginBottom: 10 }}>EARLIER</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {earlierNotifs.map((n) => {
                  const meta = getNotifMeta(n);
                  return (
                    <div key={n.id}
                      onClick={() => n.url && router.push(n.url)}
                      style={{
                        background: "var(--bg-card)",
                        borderRadius: 16,
                        padding: "14px 14px",
                        border: "1px solid var(--border)",
                        cursor: n.url ? "pointer" : "default",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        borderLeft: "3px solid var(--border-medium)",
                        opacity: 0.85,
                      }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 20, flexShrink: 0,
                        background: "var(--bg-card-alt)",
                        border: "1px solid var(--border-medium)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                      }}>
                        {meta.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: 14, marginBottom: 3 }}>{n.title}</div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4 }}>{n.body}</div>
                        <div style={{ fontSize: 11, color: "var(--text-ultra-faint)", marginTop: 6, fontWeight: 600 }}>{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
