"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/login");
      setChecking(false);
    });
  }, [router]);

  if (checking) {
    return (
      <div style={{ background: "#0F0F0F", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const tabs = [
    { href: "/app/discover", label: "Discover", icon: "🔍" },
    { href: "/app/matches", label: "Matches", icon: "🤝" },
    { href: "/app/profile", label: "Profile", icon: "👤" },
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
          const active = pathname === tab.href;
          return (
            <Link key={tab.href} href={tab.href} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              padding: "10px 0", gap: 4, textDecoration: "none",
            }}>
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
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
