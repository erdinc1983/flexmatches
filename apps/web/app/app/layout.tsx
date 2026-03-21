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
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [showStreakBanner, setShowStreakBanner] = useState(false);

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

    const { count: notifCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("read", false);

    setPendingCount(pending ?? 0);
    setUnreadCount(unread);
    setUnreadNotifs(notifCount ?? 0);
  }, []);

  async function subscribeToPush(uid: string) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) { await saveSub(uid, existing); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      await saveSub(uid, sub);
    } catch {}
  }

  async function saveSub(uid: string, sub: PushSubscription) {
    const json = sub.toJSON();
    await supabase.from("push_subscriptions").upsert(
      { user_id: uid, endpoint: json.endpoint!, subscription: json },
      { onConflict: "user_id,endpoint" }
    );
  }

  function localToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const checkStreakBanner = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("users").select("last_checkin_date").eq("id", uid).single();
    if (data?.last_checkin_date !== localToday()) setShowStreakBanner(true);
    else setShowStreakBanner(false);
  }, []);

  // Apply stored theme immediately to avoid flash
  useEffect(() => {
    const saved = localStorage.getItem("flexmatches_theme") ?? "dark";
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      // Check onboarding
      const { data: userData } = await supabase
        .from("users").select("onboarding_completed").eq("id", session.user.id).single();
      if (!userData?.onboarding_completed) { router.replace("/onboarding"); return; }
      setUserId(session.user.id);
      fetchBadges(session.user.id);
      setChecking(false);
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") subscribeToPush(session.user.id);
      });
      checkStreakBanner(session.user.id);
    });
  }, [router, fetchBadges, checkStreakBanner]);

  // Refresh badges + streak banner when pathname changes
  useEffect(() => {
    if (userId) {
      fetchBadges(userId);
      checkStreakBanner(userId);
    }
  }, [pathname, userId, fetchBadges, checkStreakBanner]);

  // Hide banner immediately when user checks in
  useEffect(() => {
    const handler = () => setShowStreakBanner(false);
    window.addEventListener("streak-checkin", handler);
    return () => window.removeEventListener("streak-checkin", handler);
  }, []);

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
      <div style={{ background: "var(--bg-page)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const tabs = [
    { href: "/app/home", label: "Home", icon: "🏠", badge: 0 },
    { href: "/app/discover", label: "Discover", icon: "🔍", badge: 0 },
    { href: "/app/matches", label: "Matches", icon: "🤝", badge: pendingCount + unreadCount },
    { href: "/app/activity", label: "Activity", icon: "💪", badge: 0 },
    { href: "/app/profile", label: "Profile", icon: "👤", badge: 0 },
  ];

  const isGoalsPage = pathname === "/app/goals" || pathname === "/app/activity" || pathname === "/app/home";

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 72 }}>
      {/* Top-right icons: Search + Bell + Settings */}
      <div style={{ position: "fixed", top: 12, right: 16, zIndex: 200, display: "flex", gap: 8 }}>
        {!pathname.startsWith("/app/search") && (
          <Link href="/app/search" style={{ textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              🔎
            </div>
          </Link>
        )}
        {!pathname.startsWith("/app/notifications") && (
          <Link href="/app/notifications" style={{ textDecoration: "none" }}>
            <div style={{ position: "relative", width: 36, height: 36, borderRadius: 18, background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              🔔
              {unreadNotifs > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, background: "var(--accent)", color: "var(--text-primary)", borderRadius: 999, fontSize: 9, fontWeight: 800, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", border: "2px solid #0F0F0F" }}>
                  {unreadNotifs > 9 ? "9+" : unreadNotifs}
                </span>
              )}
            </div>
          </Link>
        )}
        {!pathname.startsWith("/app/settings") && (
          <Link href="/app/settings" style={{ textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              ⚙️
            </div>
          </Link>
        )}
      </div>
      {showStreakBanner && !isGoalsPage && (
        <Link href="/app/goals" onClick={() => setShowStreakBanner(false)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--accent)", padding: "10px 16px", textDecoration: "none" }}>
          <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 13 }}>🔥 Don't break your streak! Check in today →</span>
          <button onClick={(e) => { e.preventDefault(); setShowStreakBanner(false); }}
            style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: 16, cursor: "pointer", opacity: 0.7, padding: 0 }}>✕</button>
        </Link>
      )}
      {children}
      <nav style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: "var(--bg-card)", borderTop: "1px solid var(--border)",
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
                <span style={{ fontSize: 18 }}>{tab.icon}</span>
                {tab.badge > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -8,
                    background: "var(--accent)", color: "var(--text-primary)", borderRadius: 999,
                    fontSize: 9, fontWeight: 800, minWidth: 16, height: 16,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 3px", border: "2px solid #111",
                  }}>
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? "var(--accent)" : "var(--text-faint)" }}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
