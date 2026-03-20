"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { setUnits, getUnits, type UnitSystem } from "../../../lib/useUnits";

type Privacy = { hide_age: boolean; hide_city: boolean; hide_weight: boolean };
type NotifPrefs = {
  match_requests: boolean;
  new_messages: boolean;
  event_reminders: boolean;
  community_posts: boolean;
  challenge_updates: boolean;
  streak_reminders: boolean;
};

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  match_requests: true,
  new_messages: true,
  event_reminders: true,
  community_posts: false,
  challenge_updates: true,
  streak_reminders: true,
};

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [units, setUnitsState] = useState<UnitSystem>("imperial");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [privacy, setPrivacy] = useState<Privacy>({ hide_age: false, hide_city: false, hide_weight: false });
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("users")
      .select("units, push_enabled, notification_prefs, privacy_settings, username, is_pro")
      .eq("id", user.id)
      .single();

    const savedUnits = (data?.units as UnitSystem) ?? getUnits();
    setUnitsState(savedUnits);
    setUnits(savedUnits);
    setPushEnabled(data?.push_enabled ?? true);
    setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...(data?.notification_prefs ?? {}) });
    setPrivacy({ hide_age: false, hide_city: false, hide_weight: false, ...(data?.privacy_settings ?? {}) });
    setUsername(data?.username ?? "");
    setIsPro(data?.is_pro ?? false);
    setLoading(false);
  }

  async function saveUnits(system: UnitSystem) {
    setUnitsState(system);
    setUnits(system);
    if (userId) await supabase.from("users").update({ units: system }).eq("id", userId);
  }

  async function togglePush(enabled: boolean) {
    setPushEnabled(enabled);
    if (userId) await supabase.from("users").update({ push_enabled: enabled }).eq("id", userId);
    if (!enabled) {
      await supabase.from("push_subscriptions").delete().eq("user_id", userId!);
    } else {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });
        const json = sub.toJSON();
        await supabase.from("push_subscriptions").upsert(
          { user_id: userId!, endpoint: json.endpoint!, subscription: json },
          { onConflict: "user_id,endpoint" }
        );
      } catch {}
    }
  }

  async function updateNotifPref(key: keyof NotifPrefs, val: boolean) {
    const next = { ...notifPrefs, [key]: val };
    setNotifPrefs(next);
    if (userId) await supabase.from("users").update({ notification_prefs: next }).eq("id", userId);
  }

  async function updatePrivacy(key: keyof Privacy, val: boolean) {
    const next = { ...privacy, [key]: val };
    setPrivacy(next);
    if (userId) await supabase.from("users").update({ privacy_settings: next }).eq("id", userId);
  }

  async function deleteAccount() {
    if (deleteInput !== "DELETE" || !userId) return;
    setDeleting(true);
    await supabase.from("users").delete().eq("id", userId);
    await supabase.auth.signOut();
    router.replace("/");
  }

  function shareProfile() {
    const url = `${window.location.origin}/u/${username}`;
    if (navigator.share) {
      navigator.share({ title: "My FlexMatches profile", url });
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer", padding: 0 }}>←</button>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: 0 }}>Settings</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Pro upgrade banner */}
        {!isPro && (
          <div onClick={() => router.push("/app/pro")}
            style={{ background: "linear-gradient(135deg, #1a0800, #2a0a00)", borderRadius: 16, padding: 16, border: "1px solid #FF450044", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 32 }}>💎</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>Upgrade to Pro</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Unlimited likes · Advanced filters · Pro badge</div>
            </div>
            <span style={{ color: "#FF4500", fontWeight: 700, fontSize: 13 }}>See plans →</span>
          </div>
        )}
        {isPro && (
          <div style={{ background: "#1a0800", borderRadius: 16, padding: 16, border: "1px solid #FF450044", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 32 }}>💎</span>
            <div>
              <div style={{ fontWeight: 800, color: "#FF4500", fontSize: 15 }}>FlexMatches Pro</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Active · All premium features unlocked</div>
            </div>
          </div>
        )}

        {/* Share Profile */}
        <SettingCard title="Profile" description={`flexmatches.com/u/${username}`}>
          <button onClick={shareProfile} style={actionBtnStyle}>
            {copied ? "✅ Link copied!" : "🔗 Share my profile"}
          </button>
          <button onClick={() => router.push("/app/profile")} style={actionBtnStyle}>
            ✏️ Edit Profile
          </button>
        </SettingCard>

        {/* Units */}
        <SettingCard title="Measurement Units" description="Choose your preferred unit system">
          <div style={{ display: "flex", gap: 8, background: "#0f0f0f", borderRadius: 12, padding: 4 }}>
            {(["imperial", "metric"] as UnitSystem[]).map((sys) => (
              <button key={sys} onClick={() => saveUnits(sys)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: units === sys ? "#FF4500" : "transparent", color: units === sys ? "#fff" : "#666" }}>
                {sys === "imperial" ? "🇺🇸 Imperial" : "🌍 Metric"}
              </button>
            ))}
          </div>
        </SettingCard>

        {/* Privacy */}
        <SettingCard title="Privacy" description="Control what others see on your profile">
          {([
            { key: "hide_age", label: "Hide my age" },
            { key: "hide_city", label: "Hide my city" },
            { key: "hide_weight", label: "Hide my weight" },
          ] as { key: keyof Privacy; label: string }[]).map(({ key, label }) => (
            <ToggleRow key={key} label={label}
              value={privacy[key]}
              onChange={(v) => updatePrivacy(key, v)} />
          ))}
        </SettingCard>

        {/* Push Notifications */}
        <SettingCard title="Notifications" description="Manage what you get notified about">
          <ToggleRow label="Enable push notifications" value={pushEnabled} onChange={togglePush} bold />
          {pushEnabled && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4, borderTop: "1px solid #1a1a1a" }}>
              {([
                { key: "match_requests", label: "Match requests", emoji: "🤝" },
                { key: "new_messages", label: "New messages", emoji: "💬" },
                { key: "event_reminders", label: "Event reminders", emoji: "📅" },
                { key: "community_posts", label: "Community posts", emoji: "🌍" },
                { key: "challenge_updates", label: "Challenge updates", emoji: "🏆" },
                { key: "streak_reminders", label: "Streak reminders", emoji: "🔥" },
              ] as { key: keyof NotifPrefs; label: string; emoji: string }[]).map(({ key, label, emoji }) => (
                <ToggleRow key={key} label={`${emoji} ${label}`}
                  value={notifPrefs[key]}
                  onChange={(v) => updateNotifPref(key, v)} />
              ))}
            </div>
          )}
        </SettingCard>

        {/* Account */}
        <SettingCard title="Account">
          <button onClick={() => router.push("/reset-password")} style={actionBtnStyle}>
            🔑 Change Password
          </button>
          <button onClick={() => router.push("/app/recommendations")} style={actionBtnStyle}>
            🤖 AI Recommendations
          </button>
          <button onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))}
            style={actionBtnStyle}>
            🚪 Sign Out
          </button>
        </SettingCard>

        {/* About */}
        <SettingCard title="About">
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Platform" value="FlexMatches PWA" />
          <button onClick={() => window.open("https://flexmatches.com", "_blank")} style={actionBtnStyle}>
            🌐 Visit flexmatches.com
          </button>
        </SettingCard>

        {/* Danger Zone */}
        <SettingCard title="Danger Zone">
          <button onClick={() => setShowDeleteConfirm(true)}
            style={{ ...actionBtnStyle, color: "#ff6b6b", borderColor: "#ff6b6b33" }}>
            🗑️ Delete Account
          </button>
        </SettingCard>

      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div onClick={() => setShowDeleteConfirm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, border: "1px solid #ff6b6b33" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 18, textAlign: "center", marginBottom: 8 }}>Delete Account</h2>
            <p style={{ color: "#888", fontSize: 13, textAlign: "center", lineHeight: 1.6, marginBottom: 20 }}>
              This will permanently delete your profile, matches, goals, and all data. This cannot be undone.
            </p>
            <p style={{ color: "#666", fontSize: 12, marginBottom: 8 }}>Type <strong style={{ color: "#ff6b6b" }}>DELETE</strong> to confirm:</p>
            <input value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #ff6b6b44", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={deleteAccount} disabled={deleteInput !== "DELETE" || deleting}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: deleteInput === "DELETE" ? "#ff6b6b" : "#2a2a2a", color: "#fff", fontWeight: 700, cursor: deleteInput === "DELETE" ? "pointer" : "default", opacity: deleting ? 0.6 : 1 }}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */
function ToggleRow({ label, value, onChange, bold }: { label: string; value: boolean; onChange: (v: boolean) => void; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: bold ? "#fff" : "#ccc", fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <button onClick={() => onChange(!value)}
        style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: value ? "#FF4500" : "#333", position: "relative", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 0.2s", display: "block" }} />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "#888", fontSize: 14 }}>{label}</span>
      <span style={{ color: "#555", fontSize: 14 }}>{value}</span>
    </div>
  );
}

function SettingCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111", borderRadius: 16, padding: 16, border: "1px solid #1a1a1a", display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#FF4500", letterSpacing: 0.5 }}>{title.toUpperCase()}</div>
        {description && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #2a2a2a",
  background: "transparent", color: "#ccc", fontWeight: 600, fontSize: 14,
  cursor: "pointer", textAlign: "left",
};

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
