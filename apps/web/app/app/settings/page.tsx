"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { setUnits, getUnits, type UnitSystem } from "../../../lib/useUnits";
import { applyTheme, getStoredTheme, type Theme } from "../../../lib/useTheme";

type Privacy = {
  hide_age: boolean;
  hide_city: boolean;
  hide_weight: boolean;
  hide_profile: boolean;
  hide_activity: boolean;
};

type NotifPrefs = {
  match_requests: boolean;
  new_messages: boolean;
  event_reminders: boolean;
  community_posts: boolean;
  challenge_updates: boolean;
  streak_reminders: boolean;
};

const DEFAULT_PRIVACY: Privacy = {
  hide_age: false,
  hide_city: false,
  hide_weight: false,
  hide_profile: false,
  hide_activity: false,
};

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  match_requests: true,
  new_messages: true,
  event_reminders: true,
  community_posts: false,
  challenge_updates: true,
  streak_reminders: true,
};

const FAQ_ITEMS = [
  { q: "How does matching work?", a: "We match you with nearby fitness enthusiasts based on your sport preferences, schedule, fitness level, and goals." },
  { q: "Is my personal data safe?", a: "Yes. We use Supabase with row-level security. Only you can access your private data. See our Privacy Controls section to manage visibility." },
  { q: "How do I change my location?", a: "Go to your Profile and tap the location field. We use your city to show nearby matches." },
  { q: "Can I pause my account?", a: "Yes — use the 'Hide my profile from Discover' toggle in Privacy settings. Your data stays, but others won't see you." },
  { q: "How do I delete my account?", a: "Scroll to Danger Zone below and tap Delete Account. This permanently removes all your data." },
];

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [username, setUsername] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setThemeState] = useState<Theme>("dark");
  const [units, setUnitsState] = useState<UnitSystem>("imperial");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [privacy, setPrivacy] = useState<Privacy>(DEFAULT_PRIVACY);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Change email
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");

  // Report issue
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);

  // FAQ
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    setUserEmail(user.email ?? "");

    const { data } = await supabase
      .from("users")
      .select("units, push_enabled, notification_prefs, privacy_settings, username, is_pro, is_admin")
      .eq("id", user.id)
      .single();

    setThemeState(getStoredTheme());
    const savedUnits = (data?.units as UnitSystem) ?? getUnits();
    setUnitsState(savedUnits);
    setUnits(savedUnits);
    setPushEnabled(data?.push_enabled ?? true);
    setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...(data?.notification_prefs ?? {}) });
    setPrivacy({ ...DEFAULT_PRIVACY, ...(data?.privacy_settings ?? {}) });
    setUsername(data?.username ?? "");
    setIsPro(data?.is_pro ?? false);
    setIsAdmin(data?.is_admin ?? false);
    setLoading(false);
  }

  function saveTheme(t: Theme) {
    setThemeState(t);
    applyTheme(t);
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

  async function changeEmail() {
    if (!newEmail.trim() || emailSaving) return;
    setEmailSaving(true);
    setEmailMsg("");
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      setEmailMsg(`Error: ${error.message}`);
    } else {
      setEmailMsg("Verification email sent! Check your inbox to confirm the change.");
    }
    setEmailSaving(false);
  }

  async function submitReport() {
    if (!reportText.trim() || reportSaving || !userId) return;
    setReportSaving(true);
    await supabase.from("bug_reports").insert({
      user_id: userId,
      message: reportText.trim(),
      created_at: new Date().toISOString(),
    });
    setReportSent(true);
    setReportSaving(false);
    setTimeout(() => { setShowReportModal(false); setReportText(""); setReportSent(false); }, 2000);
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
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer", padding: 0 }}>←</button>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>Settings</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Admin panel link — only visible to admins */}
        {isAdmin && (
          <div onClick={() => router.push("/app/admin")}
            style={{ background: "#0f0a00", borderRadius: 14, padding: "14px 18px", border: "1px solid #FF4500", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 26 }}>🛡️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "#FF4500", fontSize: 15 }}>Admin Panel</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Manage users, ban, delete</div>
            </div>
            <span style={{ color: "#FF4500", fontSize: 18 }}>→</span>
          </div>
        )}

        {/* Pro banner */}
        {!isPro ? (
          <div onClick={() => router.push("/app/pro")}
            style={{ background: "linear-gradient(135deg, #1a0800, #2a0a00)", borderRadius: 16, padding: 16, border: "1px solid var(--accent-faint)", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 32 }}>💎</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 15 }}>Upgrade to Pro</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Unlimited likes · Advanced filters · Pro badge</div>
            </div>
            <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 13 }}>See plans →</span>
          </div>
        ) : (
          <div style={{ background: "#1a0800", borderRadius: 16, padding: 16, border: "1px solid var(--accent-faint)", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 32 }}>💎</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "var(--accent)", fontSize: 15 }}>FlexMatches Pro</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Active · All premium features unlocked</div>
            </div>
            <button onClick={() => router.push("/app/pro")}
              style={{ fontSize: 12, color: "var(--text-muted)", background: "transparent", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
              Manage
            </button>
          </div>
        )}

        {/* Account */}
        <SettingCard title="Account" description={userEmail}>
          <button onClick={shareProfile} style={actionBtnStyle}>
            {copied ? "✅ Profile link copied!" : "🔗 Share my profile"}
          </button>
          <button onClick={() => router.push("/app/profile")} style={actionBtnStyle}>
            ✏️ Edit Profile
          </button>
          <button onClick={() => setShowEmailModal(true)} style={actionBtnStyle}>
            📧 Change Email
          </button>
          <button onClick={() => router.push("/app/security")} style={{ ...actionBtnStyle, color: "var(--success)", borderColor: "#22c55e33" }}>
            🔐 Security & Privacy
          </button>
          <button onClick={() => router.push("/reset-password")} style={actionBtnStyle}>
            🔑 Change Password
          </button>
          <button onClick={() => router.push("/app/referral")} style={actionBtnStyle}>
            📣 Invite Friends & Earn
          </button>
          <button onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))}
            style={actionBtnStyle}>
            🚪 Sign Out
          </button>
        </SettingCard>

        {/* Units */}
        <SettingCard title="App Preferences" description="Measurement units and display">
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Theme</div>
            <div style={{ display: "flex", gap: 8, background: "var(--bg-page)", borderRadius: 12, padding: 4 }}>
              {(["dark", "light"] as Theme[]).map((t) => (
                <button key={t} onClick={() => saveTheme(t)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: theme === t ? "var(--accent)" : "transparent", color: theme === t ? "var(--text-primary)" : "var(--text-faint)" }}>
                  {t === "dark" ? "🌙 Dark" : "☀️ Light"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Units of measurement</div>
            <div style={{ display: "flex", gap: 8, background: "var(--bg-page)", borderRadius: 12, padding: 4 }}>
              {(["imperial", "metric"] as UnitSystem[]).map((sys) => (
                <button key={sys} onClick={() => saveUnits(sys)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: units === sys ? "var(--accent)" : "transparent", color: units === sys ? "var(--text-primary)" : "var(--text-faint)" }}>
                  {sys === "imperial" ? "🇺🇸 Imperial (lbs, mi)" : "🌍 Metric (kg, km)"}
                </button>
              ))}
            </div>
          </div>
        </SettingCard>

        {/* Privacy */}
        <SettingCard title="Privacy" description="Control what others see">
          {([
            { key: "hide_profile", label: "Hide my profile from Discover", desc: "Others won't find you in search" },
            { key: "hide_activity", label: "Hide my activity from partners", desc: "Workout stats won't show in chat" },
            { key: "hide_age", label: "Hide my age", desc: "Age hidden on your public profile" },
            { key: "hide_city", label: "Hide my city", desc: "City hidden on your public profile" },
            { key: "hide_weight", label: "Hide my weight", desc: "Weight hidden on your public profile" },
          ] as { key: keyof Privacy; label: string; desc: string }[]).map(({ key, label, desc }) => (
            <div key={key}>
              <ToggleRow label={label} value={privacy[key]} onChange={(v) => updatePrivacy(key, v)} />
              <div style={{ fontSize: 11, color: "var(--text-ultra-faint)", marginTop: 2, marginLeft: 0, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>{desc}</div>
            </div>
          ))}
        </SettingCard>

        {/* Notifications */}
        <SettingCard title="Notifications" description="Manage what you get notified about">
          <ToggleRow label="Enable push notifications" value={pushEnabled} onChange={togglePush} bold />
          {pushEnabled && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4, borderTop: "1px solid var(--border)" }}>
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

        {/* Help & Support */}
        <SettingCard title="Help & Support">
          <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 700, letterSpacing: 0.4, marginBottom: 4 }}>FREQUENTLY ASKED QUESTIONS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", background: "none", border: "none", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "12px 0", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{item.q}</span>
                  <span style={{ color: "var(--text-faint)", fontSize: 16, flexShrink: 0 }}>{openFaq === i ? "▲" : "▼"}</span>
                </button>
                {openFaq === i && (
                  <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.7, paddingBottom: 12 }}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setShowReportModal(true)} style={actionBtnStyle}>
            🐛 Report a Bug or Issue
          </button>
          <button onClick={() => window.open("mailto:support@flexmatches.com", "_blank")} style={actionBtnStyle}>
            📩 Contact Support
          </button>
        </SettingCard>

        {/* About */}
        <SettingCard title="About">
          <InfoRow label="Version" value="1.0.0 (MVP 9)" />
          <InfoRow label="Platform" value="FlexMatches PWA" />
          <InfoRow label="Build" value="2026 · Beta" />
          <button onClick={() => router.push("/app/recommendations")} style={actionBtnStyle}>
            🤖 AI Recommendations
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

      {/* Change Email Modal */}
      {showEmailModal && (
        <div onClick={() => { setShowEmailModal(false); setEmailMsg(""); setNewEmail(""); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", border: "1px solid var(--border)", paddingBottom: 24 }}>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Change Email</h2>
            <p style={{ color: "var(--text-faint)", fontSize: 12, marginBottom: 16 }}>Current: {userEmail}</p>
            <label style={labelStyle}>NEW EMAIL ADDRESS</label>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@email.com"
              style={inputStyle} />
            {emailMsg && (
              <div style={{ fontSize: 12, color: emailMsg.startsWith("Error") ? "#ff6b6b" : "var(--success)", marginTop: 8, lineHeight: 1.5 }}>{emailMsg}</div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => { setShowEmailModal(false); setEmailMsg(""); setNewEmail(""); }}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={changeEmail} disabled={!newEmail.trim() || emailSaving}
                style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: newEmail.trim() ? "var(--accent)" : "var(--bg-card-alt)", color: newEmail.trim() ? "var(--text-primary)" : "var(--text-faint)", fontWeight: 700, fontSize: 15, cursor: newEmail.trim() ? "pointer" : "default", opacity: emailSaving ? 0.6 : 1 }}>
                {emailSaving ? "Sending..." : "Send Verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {showReportModal && (
        <div onClick={() => setShowReportModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", border: "1px solid var(--border)", paddingBottom: 24 }}>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, marginBottom: 16 }}>Report a Bug or Issue</h2>
            {reportSent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <p style={{ color: "var(--success)", fontWeight: 700 }}>Report sent! Thank you.</p>
              </div>
            ) : (
              <>
                <textarea value={reportText} onChange={(e) => setReportText(e.target.value)}
                  placeholder="Describe the issue you encountered..."
                  rows={5}
                  style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: "12px 14px", color: "var(--text-primary)", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button onClick={() => setShowReportModal(false)}
                    style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={submitReport} disabled={!reportText.trim() || reportSaving}
                    style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: reportText.trim() ? "var(--accent)" : "var(--bg-card-alt)", color: reportText.trim() ? "var(--text-primary)" : "var(--text-faint)", fontWeight: 700, fontSize: 15, cursor: reportText.trim() ? "pointer" : "default", opacity: reportSaving ? 0.6 : 1 }}>
                    {reportSaving ? "Sending..." : "Submit Report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div onClick={() => setShowDeleteConfirm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, maxHeight: "88vh", overflowY: "auto", border: "1px solid #ff6b6b33" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, textAlign: "center", marginBottom: 8 }}>Delete Account</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", lineHeight: 1.6, marginBottom: 20 }}>
              This will permanently delete your profile, matches, goals, and all data. This cannot be undone.
            </p>
            <p style={{ color: "var(--text-faint)", fontSize: 12, marginBottom: 8 }}>Type <strong style={{ color: "#ff6b6b" }}>DELETE</strong> to confirm:</p>
            <input value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid #ff6b6b44", borderRadius: 10, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={deleteAccount} disabled={deleteInput !== "DELETE" || deleting}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: deleteInput === "DELETE" ? "#ff6b6b" : "var(--bg-input)", color: "var(--text-primary)", fontWeight: 700, cursor: deleteInput === "DELETE" ? "pointer" : "default", opacity: deleting ? 0.6 : 1 }}>
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
      <span style={{ color: bold ? "var(--text-primary)" : "var(--text-secondary)", fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <button onClick={() => onChange(!value)}
        style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: value ? "var(--accent)" : "#333", position: "relative", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: "var(--text-primary)", transition: "left 0.2s", display: "block" }} />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{label}</span>
      <span style={{ color: "var(--text-faint)", fontSize: 14 }}>{value}</span>
    </div>
  );
}

function SettingCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 16, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: 0.5 }}>{title.toUpperCase()}</div>
        {description && <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border-medium)",
  background: "transparent", color: "var(--text-secondary)", fontWeight: 600, fontSize: 14,
  cursor: "pointer", textAlign: "left",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "var(--text-faint)", letterSpacing: 0.5, display: "block", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12,
  padding: "12px 14px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box",
};

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
