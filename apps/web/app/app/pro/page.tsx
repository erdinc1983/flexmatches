"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const FREE_FEATURES = [
  "Up to 10 likes/day",
  "Basic discover filters",
  "1:1 chat with matches",
  "Goals & streak tracking",
  "Communities (read-only feed)",
  "Activity log (10 workouts/month)",
  "Bronze & Silver tiers only",
];

const PRO_FEATURES = [
  { label: "Unlimited likes per day", icon: "❤️" },
  { label: "See who liked you first", icon: "👀" },
  { label: "Advanced filters — tier, industry, time", icon: "🔍" },
  { label: "💎 Pro badge on your profile", icon: "💎" },
  { label: "Priority in discovery feed", icon: "🚀" },
  { label: "Unlimited activity logging", icon: "💪" },
  { label: "Gold & Diamond tiers unlocked", icon: "🥇" },
  { label: "Workout invite analytics", icon: "📊" },
  { label: "Profile boost — 3x/month", icon: "⚡" },
  { label: "Early access to new features", icon: "🎯" },
];

export default function ProPage() {
  const router = useRouter();
  const [isPro, setIsPro] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  const monthlyPrice = billingCycle === "yearly" ? 4.99 : 7.99;
  const yearlyTotal = (4.99 * 12).toFixed(0);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("users").select("is_pro, username").eq("id", user.id).single();
      setIsPro(data?.is_pro ?? false);
      setEmail(user.email ?? "");
      setLoading(false);
    });
  }, []);

  async function joinWaitlist() {
    if (!email.trim()) return;
    // Store waitlist interest — using notifications table as a simple log
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "🎉 You're on the Pro waitlist!",
        body: "We'll notify you as soon as FlexMatches Pro launches. Early members get 30% off!",
        url: "/app/pro",
      });
    }
    setSubmitted(true);
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (isPro) return (
    <div style={{ padding: "40px 24px", textAlign: "center", paddingBottom: 90 }}>
      <button onClick={() => router.back()} style={{ position: "absolute", top: 20, left: 16, background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer" }}>←</button>
      <div style={{ fontSize: 64, marginBottom: 20 }}>💎</div>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 8 }}>You're Pro!</h1>
      <p style={{ color: "#888", fontSize: 15, marginBottom: 32 }}>Enjoy all premium features. Thank you for supporting FlexMatches.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", maxWidth: 360, margin: "0 auto" }}>
        {PRO_FEATURES.map((f) => (
          <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 12, background: "#1a1a1a", borderRadius: 12, padding: "12px 14px", border: "1px solid #FF450033" }}>
            <span style={{ fontSize: 20 }}>{f.icon}</span>
            <span style={{ color: "#ccc", fontSize: 14 }}>{f.label}</span>
            <span style={{ marginLeft: "auto", color: "#22c55e", fontSize: 16 }}>✓</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ paddingBottom: 90 }}>
      <button onClick={() => router.back()} style={{ position: "absolute", top: 20, left: 16, zIndex: 10, background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer" }}>←</button>

      {/* Hero */}
      <div style={{ background: "linear-gradient(180deg, #1a0800 0%, #0F0F0F 100%)", padding: "48px 24px 32px", textAlign: "center", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>💎</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: -0.5, marginBottom: 10 }}>
          FlexMatches <span style={{ color: "#FF4500" }}>Pro</span>
        </h1>
        <p style={{ color: "#888", fontSize: 15, lineHeight: 1.6, maxWidth: 300, margin: "0 auto" }}>
          Find better matches, grow faster, stand out in the community.
        </p>
      </div>

      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Billing toggle */}
        <div style={{ display: "flex", gap: 4, background: "#1a1a1a", borderRadius: 12, padding: 3 }}>
          {(["monthly", "yearly"] as const).map((b) => (
            <button key={b} onClick={() => setBillingCycle(b)}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: billingCycle === b ? "#FF4500" : "transparent", color: billingCycle === b ? "#fff" : "#555", fontWeight: 700, fontSize: 13, cursor: "pointer", position: "relative" }}>
              {b === "monthly" ? "Monthly" : "Yearly"}
              {b === "yearly" && <span style={{ position: "absolute", top: -8, right: 8, fontSize: 9, background: "#22c55e", color: "#fff", borderRadius: 999, padding: "2px 6px", fontWeight: 800 }}>SAVE 37%</span>}
            </button>
          ))}
        </div>

        {/* Price card */}
        <div style={{ background: "#1a1a1a", borderRadius: 20, padding: 24, border: "2px solid #FF4500", textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: "#fff" }}>
            ${monthlyPrice}
            <span style={{ fontSize: 16, color: "#555", fontWeight: 400 }}>/mo</span>
          </div>
          {billingCycle === "yearly" && (
            <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Billed ${yearlyTotal}/year · saves $36/year</div>
          )}
          <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>Cancel anytime · 7-day free trial</div>
        </div>

        {/* Pro features */}
        <div>
          <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 0.5, marginBottom: 12 }}>EVERYTHING IN PRO</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PRO_FEATURES.map((f) => (
              <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 12, background: "#1a1a1a", borderRadius: 12, padding: "12px 14px", border: "1px solid #2a2a2a" }}>
                <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{f.icon}</span>
                <span style={{ color: "#ccc", fontSize: 14, flex: 1 }}>{f.label}</span>
                <span style={{ color: "#FF4500", fontSize: 14, fontWeight: 800 }}>✓</span>
              </div>
            ))}
          </div>
        </div>

        {/* Free vs Pro comparison */}
        <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 18, border: "1px solid #2a2a2a" }}>
          <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 0.5, marginBottom: 12 }}>FREE PLAN LIMITS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FREE_FEATURES.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#555" }}>
                <span style={{ color: "#333" }}>✕</span>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Waitlist CTA */}
        {submitted ? (
          <div style={{ background: "#052e16", borderRadius: 16, padding: 24, textAlign: "center", border: "1px solid #22c55e44" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontWeight: 800, color: "#22c55e", fontSize: 18, marginBottom: 8 }}>You're on the list!</div>
            <div style={{ color: "#888", fontSize: 14 }}>We'll notify you when Pro launches. Early members get <strong style={{ color: "#fff" }}>30% off</strong> for life.</div>
          </div>
        ) : (
          <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 20, border: "1px solid #2a2a2a" }}>
            <div style={{ fontWeight: 800, color: "#fff", fontSize: 16, marginBottom: 6 }}>🚀 Coming Soon</div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>Payment not live yet. Join the waitlist — early members get <strong style={{ color: "#FF4500" }}>30% off for life</strong>.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ flex: 1, background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none" }} />
              <button onClick={joinWaitlist}
                style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
                Join
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 12, color: "#444" }}>
          🔒 Secure payment · Cancel anytime · GDPR compliant
        </div>
      </div>
    </div>
  );
}
