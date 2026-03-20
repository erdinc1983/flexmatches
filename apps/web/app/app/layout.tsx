"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchBadges = useCallback(async (uid: string) => {
    // Pending match requests (incoming)
    const { count: pending } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", uid)
      .eq("status", "pending");

    // Unread messages (received, not read)
    const { data: myMatches } = await supabase
      .from("matches")
      .select("id")
      .eq("status", "accepted")
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

    let unread = 0;
    if (myMatches && myMatches.length > 0) {
      const matchIds = myMatches.map((m: any) => m.id);
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("match_id", matchIds)
        .neq("sender_id", uid)
        .is("read_at", null);
      unread = count ?? 0;
    }

    setPendingCount(pending ?? 0);
    setUnreadCount(unread);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUserId(session.user.id);
      fetchBadges(session.user.id);
      setChecking(false);
    });
  }, [router, fetchBadges]);

  // Refresh badges when pathname changes (user navigates)
  useEffect(() => {
    if (userId) fetchBadges(userId);
  }, [pathname, userId, fetchBadges]);

  // Realtime: listen for new messages + new matches
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("badge-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => fetchBadges(userId))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches" }, () => fetchBadges(userId))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, () => fetchBadges(userId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchBadges]);

  if (checking) {
    return (
      <div style={{ background: "#0F0F0F", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const tabs = [
    { href: "/app/discover", label: "Discover", icon: "🔍", badge: 0 },
    { href: "/app/matches", label: "Matches", icon: "🤝", badge: pendingCount + unreadCount },
    { href: "/app/goals", label: "Goals", icon: "🎯", badge: 0 },
    { href: "/app/profile", label: "Profile", icon: "👤", badge: 0 },
  ];

  return (
    <div style={{ background: "#0F0F0F", minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 72 }}>
      {children}
      <nav style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: "#111", borderTop: "1px solid #1a1a1a",
        display: "flex", zIndex: 100,
      }}>
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link key={tab.href} href={tab.href} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              padding: "10px 0", gap: 4, textDecoration: "none", position: "relative",
            }}>
              <span style={{ position: "relative", display: "inline-block" }}>
                <span style={{ fontSize: 20 }}>{tab.icon}</span>
                {tab.badge > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -8,
                    background: "#FF4500", color: "#fff", borderRadius: 999,
                    fontSize: 9, fontWeight: 800, minWidth: 16, height: 16,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 3px", border: "2px solid #111",
                  }}>
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: active ? "#FF4500" : "#555" }}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
