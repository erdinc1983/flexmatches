"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { setUnits, getUnits, type UnitSystem } from "../../../lib/useUnits";

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [units, setUnitsState] = useState<UnitSystem>("imperial");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("users").select("units, push_enabled").eq("id", user.id).single();

    const savedUnits = (data?.units as UnitSystem) ?? getUnits();
    setUnitsState(savedUnits);
    setUnits(savedUnits); // sync localStorage
    setPushEnabled(data?.push_enabled ?? true);
    setLoading(false);
  }

  async function saveUnits(system: UnitSystem) {
    setUnitsState(system);
    setUnits(system); // instant localStorage update
    if (userId) await supabase.from("users").update({ units: system }).eq("id", userId);
  }

  async function togglePush(enabled: boolean) {
    setPushEnabled(enabled);
    if (userId) await supabase.from("users").update({ push_enabled: enabled }).eq("id", userId);

    if (!enabled) {
      // Remove push subscriptions
      await supabase.from("push_subscriptions").delete().eq("user_id", userId!);
    } else {
      // Re-subscribe
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

  async function deleteAccount() {
    if (deleteInput !== "DELETE" || !userId) return;
    setSaving(true);
    // Delete user data
    await supabase.from("users").delete().eq("id", userId);
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer", padding: 0 }}>←</button>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: 0 }}>Settings</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Units */}
        <SettingCard title="Measurement Units" description="Choose your preferred unit system">
          <div style={{ display: "flex", gap: 8, background: "#0f0f0f", borderRadius: 12, padding: 4 }}>
            {(["imperial", "metric"] as UnitSystem[]).map((sys) => (
              <button key={sys} onClick={() => saveUnits(sys)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: units === sys ? "#FF4500" : "transparent", color: units === sys ? "#fff" : "#666", transition: "all 0.2s" }}>
                {sys === "imperial" ? "🇺🇸 Imperial (lbs, mi)" : "🌍 Metric (kg, km)"}
              </button>
            ))}
          </div>
        </SettingCard>

        {/* Push Notifications */}
        <SettingCard title="Push Notifications" description="Receive alerts for messages, matches, and events">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#ccc", fontSize: 14 }}>Enable notifications</span>
            <button onClick={() => togglePush(!pushEnabled)}
              style={{ width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer", background: pushEnabled ? "#FF4500" : "#333", position: "relative", transition: "background 0.2s" }}>
              <span style={{ position: "absolute", top: 3, left: pushEnabled ? 24 : 3, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 0.2s", display: "block" }} />
            </button>
          </div>
        </SettingCard>

        {/* Account */}
        <SettingCard title="Account">
          <button onClick={() => router.push("/reset-password")}
            style={actionBtnStyle}>
            🔑 Change Password
          </button>
          <button onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))}
            style={actionBtnStyle}>
            🚪 Sign Out
          </button>
        </SettingCard>

        {/* About */}
        <SettingCard title="About">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#888", fontSize: 14 }}>Version</span>
            <span style={{ color: "#555", fontSize: 14 }}>1.0.0</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#888", fontSize: 14 }}>Platform</span>
            <span style={{ color: "#555", fontSize: 14 }}>FlexMatches PWA</span>
          </div>
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
              <button onClick={deleteAccount} disabled={deleteInput !== "DELETE" || saving}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: deleteInput === "DELETE" ? "#ff6b6b" : "#2a2a2a", color: "#fff", fontWeight: 700, cursor: deleteInput === "DELETE" ? "pointer" : "default", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #2a2a2a",
  background: "transparent", color: "#ccc", fontWeight: 600, fontSize: 14,
  cursor: "pointer", textAlign: "left",
};

function SettingCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111", borderRadius: 16, padding: 16, border: "1px solid #1a1a1a", display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#FF4500" }}>{title.toUpperCase()}</div>
        {description && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
