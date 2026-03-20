"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Referral = {
  id: string;
  created_at: string;
  referred_user_id: string;
  username?: string;
};

const REWARDS = [
  { count: 1,  label: "First Invite",    emoji: "📣", reward: "📣 First Referral badge", color: "#a855f7" },
  { count: 3,  label: "3 Friends",       emoji: "🎯", reward: "🎯 Bonus notifications credits", color: "#3b82f6" },
  { count: 5,  label: "Referral Master", emoji: "🌟", reward: "🌟 Referral Master badge", color: "#FF4500" },
  { count: 10, label: "10 Invites",      emoji: "💎", reward: "💎 1 month Pro free (coming soon)", color: "#60a5fa" },
];

export default function ReferralPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: userData } = await supabase
      .from("users").select("username, referral_code").eq("id", user.id).single();

    setUsername(userData?.username ?? "");
    setReferralCode(userData?.referral_code ?? "");

    // Load referrals made by this user
    const { data: refs } = await supabase
      .from("referrals")
      .select("id, created_at, referred_user_id")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (refs && refs.length > 0) {
      const ids = refs.map((r: any) => r.referred_user_id);
      const { data: users } = await supabase.from("users").select("id, username").in("id", ids);
      const umap = Object.fromEntries((users ?? []).map((u: any) => [u.id, u.username]));
      setReferrals(refs.map((r: any) => ({ ...r, username: umap[r.referred_user_id] ?? "?" })));
    }

    setLoading(false);
  }

  function getReferralLink() {
    return `${window.location.origin}/register?ref=${referralCode}`;
  }

  function share() {
    const link = getReferralLink();
    const text = `Join me on FlexMatches — find fitness partners who match your schedule and sport! 💪\n${link}`;
    if (navigator.share) {
      navigator.share({ title: "Join FlexMatches", text, url: link });
    } else {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const total = referrals.length;
  const nextReward = REWARDS.find(r => r.count > total);
  const toNext = nextReward ? nextReward.count - total : 0;

  return (
    <div style={{ padding: "20px 16px", paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer", padding: 0 }}>←</button>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: 0 }}>Invite Friends</h1>
      </div>

      {/* Hero card */}
      <div style={{ background: "linear-gradient(135deg, #1a0800, #2a0a00)", borderRadius: 20, padding: 24, border: "1px solid #FF450044", marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📣</div>
        <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Invite & Earn Rewards</h2>
        <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Share your link — when a friend joins, you both unlock rewards. The more you invite, the bigger the prizes.
        </p>
      </div>

      {/* Referral code */}
      {referralCode ? (
        <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 20, border: "1px solid #2a2a2a", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 0.5, marginBottom: 12 }}>YOUR REFERRAL CODE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1, background: "#111", borderRadius: 12, padding: "14px 16px", border: "1px solid #FF450033" }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: "#FF4500", letterSpacing: 3 }}>{referralCode}</span>
            </div>
            <button onClick={copyCode}
              style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid #2a2a2a", background: "transparent", color: copied ? "#22c55e" : "#888", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <button onClick={share}
            style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: "#FF4500", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
            🔗 Share My Link
          </button>
          <div style={{ marginTop: 10, fontSize: 12, color: "#444", textAlign: "center", wordBreak: "break-all" }}>
            {typeof window !== "undefined" ? getReferralLink() : ""}
          </div>
        </div>
      ) : (
        <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 20, border: "1px solid #2a2a2a", marginBottom: 16, textAlign: "center" }}>
          <p style={{ color: "#555", fontSize: 14 }}>Complete your profile to get your referral code.</p>
          <button onClick={() => router.push("/app/profile")}
            style={{ marginTop: 10, padding: "12px 24px", borderRadius: 12, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Complete Profile →
          </button>
        </div>
      )}

      {/* Progress toward next reward */}
      {nextReward && (
        <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 16, border: "1px solid #2a2a2a", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Next reward: {nextReward.reward}</span>
            <span style={{ fontSize: 12, color: "#FF4500", fontWeight: 700 }}>{toNext} to go</span>
          </div>
          <div style={{ background: "#111", borderRadius: 99, height: 6 }}>
            <div style={{ background: "#FF4500", height: 6, borderRadius: 99, width: `${Math.min((total / nextReward.count) * 100, 100)}%`, transition: "width 0.4s" }} />
          </div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>{total} / {nextReward.count} referrals</div>
        </div>
      )}

      {/* Reward milestones */}
      <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 16, border: "1px solid #2a2a2a", marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>REWARD MILESTONES</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {REWARDS.map(r => {
            const achieved = total >= r.count;
            return (
              <div key={r.count} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: achieved ? `${r.color}22` : "#111", border: `1px solid ${achieved ? r.color : "#2a2a2a"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {r.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: achieved ? "#fff" : "#555" }}>{r.reward}</div>
                  <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{r.count} referral{r.count > 1 ? "s" : ""}</div>
                </div>
                {achieved && <span style={{ color: "#22c55e", fontSize: 16 }}>✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral list */}
      <div>
        <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 0.5, marginBottom: 12 }}>
          PEOPLE YOU'VE INVITED ({total})
        </div>
        {referrals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <p style={{ color: "#555", fontSize: 14 }}>No referrals yet. Share your link above!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {referrals.map(r => (
              <div key={r.id} style={{ background: "#1a1a1a", borderRadius: 12, padding: "12px 14px", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                  {r.username?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>@{r.username}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Joined {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                </div>
                <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>✓ Joined</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
