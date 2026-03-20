"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  { label: "Pro badge on your profile", icon: "💎" },
  { label: "Priority in discovery feed", icon: "🚀" },
  { label: "Unlimited activity logging", icon: "💪" },
  { label: "Gold & Diamond tiers unlocked", icon: "🥇" },
  { label: "Workout invite analytics", icon: "📊" },
  { label: "Profile boost — 3x/month", icon: "⚡" },
  { label: "Early access to new features", icon: "🎯" },
];

export default function ProPage() {
  return <Suspense><ProPageInner /></Suspense>;
}

function ProPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPro, setIsPro] = useState(false);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  const monthlyPrice = billingCycle === "yearly" ? 4.99 : 7.99;
  const yearlyTotal = (4.99 * 12).toFixed(0);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      const { data } = await supabase.from("users").select("is_pro").eq("id", user.id).single();
      setIsPro(data?.is_pro ?? false);
      setUserId(user.id);
      setEmail(user.email ?? "");
      setLoading(false);
    });
  }, []);

  async function subscribe() {
    setSubscribing(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCycle, userId, email }),
      });
      const { url, error } = await res.json();
      if (error || !url) throw new Error(error ?? "No URL");
      window.location.href = url;
    } catch {
      setSubscribing(false);
      alert("Something went wrong. Please try again.");
    }
  }

  async function openPortal() {
    setOpeningPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const { url, error } = await res.json();
      if (error || !url) throw new Error(error ?? "No URL");
      window.location.href = url;
    } catch {
      setOpeningPortal(false);
      alert("Could not open billing portal. Please try again.");
    }
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

      {success && (
        <div style={{ background: "#052e16", borderRadius: 16, padding: 20, border: "1px solid #22c55e44", marginBottom: 28, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 800, color: "#22c55e", fontSize: 17, marginBottom: 4 }}>Welcome to Pro!</div>
          <div style={{ color: "#888", fontSize: 13 }}>All premium features are now unlocked.</div>
        </div>
      )}

      <div style={{ fontSize: 64, marginBottom: 20 }}>💎</div>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 8 }}>You&apos;re Pro!</h1>
      <p style={{ color: "#888", fontSize: 15, marginBottom: 32 }}>All premium features unlocked. Thank you for supporting FlexMatches.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", maxWidth: 360, margin: "0 auto 28px" }}>
        {PRO_FEATURES.map((f) => (
          <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 12, background: "#1a1a1a", borderRadius: 12, padding: "12px 14px", border: "1px solid #FF450033" }}>
            <span style={{ fontSize: 20 }}>{f.icon}</span>
            <span style={{ color: "#ccc", fontSize: 14 }}>{f.label}</span>
            <span style={{ marginLeft: "auto", color: "#22c55e", fontSize: 16 }}>✓</span>
          </div>
        ))}
      </div>

      <button onClick={openPortal} disabled={openingPortal}
        style={{ padding: "12px 28px", borderRadius: 12, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
        {openingPortal ? "Opening..." : "⚙️ Manage Subscription"}
      </button>
    </div>
  );

  return (
    <div style={{ paddingBottom: 90 }}>
      <button onClick={() => router.back()} style={{ position: "absolute", top: 20, left: 16, zIndex: 10, background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer" }}>←</button>

      {canceled && (
        <div style={{ margin: "16px 20px 0", background: "#1a1a00", borderRadius: 12, padding: 14, border: "1px solid #66660033", textAlign: "center" }}>
          <span style={{ color: "#888", fontSize: 13 }}>Checkout canceled. You can try again anytime.</span>
        </div>
      )}

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

        {/* Subscribe button */}
        <button onClick={subscribe} disabled={subscribing}
          style={{ width: "100%", padding: "18px 0", borderRadius: 16, border: "none", background: subscribing ? "#993300" : "#FF4500", color: "#fff", fontWeight: 800, fontSize: 17, cursor: subscribing ? "default" : "pointer", boxShadow: "0 8px 32px rgba(255,69,0,0.35)", opacity: subscribing ? 0.8 : 1 }}>
          {subscribing ? "Redirecting to checkout..." : `💎 Start ${billingCycle === "yearly" ? "Yearly" : "Monthly"} Pro — $${monthlyPrice}/mo`}
        </button>

        <div style={{ textAlign: "center", fontSize: 12, color: "#444" }}>
          🔒 Secure payment via Stripe · Cancel anytime · 7-day free trial
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

      </div>
    </div>
  );
}
