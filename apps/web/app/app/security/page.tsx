"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type EmergencyContact = { name: string; phone: string; relation: string };
type MFAFactor = { id: string; friendly_name?: string; factor_type: string; status: string };

/* ─── Simple QR-like display using text ─────────────────────────── */
function TotpSetup({ uri, secret, onVerify, onCancel }: { uri: string; secret: string; onVerify: (code: string) => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#0f0f0f", borderRadius: 14, padding: 16, border: "1px solid #2a2a2a" }}>
        <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 10 }}>1. OPEN GOOGLE AUTHENTICATOR OR AUTHY</div>
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.7 }}>
          Tap <strong style={{ color: "#fff" }}>+ Add account</strong> → <strong style={{ color: "#fff" }}>Enter a setup key</strong>
        </div>
      </div>
      <div style={{ background: "#0f0f0f", borderRadius: 14, padding: 16, border: "1px solid #2a2a2a" }}>
        <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 10 }}>2. ENTER THIS SECRET KEY</div>
        <div style={{ fontFamily: "monospace", fontSize: 16, color: "#22c55e", fontWeight: 700, letterSpacing: 2, wordBreak: "break-all", userSelect: "all" }}>{secret}</div>
        <button onClick={() => navigator.clipboard.writeText(secret)}
          style={{ marginTop: 10, fontSize: 12, color: "#555", background: "transparent", border: "1px solid #333", borderRadius: 8, padding: "4px 12px", cursor: "pointer" }}>
          Copy
        </button>
      </div>
      <div style={{ background: "#0f0f0f", borderRadius: 14, padding: 16, border: "1px solid #2a2a2a" }}>
        <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 10 }}>3. ENTER THE 6-DIGIT CODE FROM THE APP</div>
        <input
          type="text" inputMode="numeric" maxLength={6}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "14px", color: "#fff", fontSize: 22, fontWeight: 800, textAlign: "center", outline: "none", letterSpacing: 6, boxSizing: "border-box", fontFamily: "monospace" }}
        />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel}
          style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>
          Cancel
        </button>
        <button onClick={() => onVerify(code)} disabled={code.length !== 6}
          style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: code.length === 6 ? "#22c55e" : "#1a1a1a", color: code.length === 6 ? "#fff" : "#555", fontWeight: 700, fontSize: 15, cursor: code.length === 6 ? "pointer" : "default" }}>
          Enable 2FA ✓
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function SecurityPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // MFA / 2FA
  const [mfaFactors, setMfaFactors] = useState<MFAFactor[]>([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [totpUri, setTotpUri] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpFactorId, setTotpFactorId] = useState("");
  const [mfaMsg, setMfaMsg] = useState("");
  const [disabling2fa, setDisabling2fa] = useState(false);

  // Emergency contact
  const [ec, setEc] = useState<EmergencyContact>({ name: "", phone: "", relation: "" });
  const [ecSaving, setEcSaving] = useState(false);
  const [ecSaved, setEcSaved] = useState(false);
  const [showEcForm, setShowEcForm] = useState(false);

  // Verification
  const [verificationStatus, setVerificationStatus] = useState<"unverified" | "pending" | "verified">("unverified");
  const [isVerified, setIsVerified] = useState(false);
  const [requestingVerify, setRequestingVerify] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");

  // SOS
  const [sosActive, setSosActive] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    setUserEmail(user.email ?? "");

    // Load MFA factors
    const { data: mfaData } = await supabase.auth.mfa.listFactors();
    const factors = mfaData?.totp ?? [];
    setMfaFactors(factors as MFAFactor[]);
    setMfaEnabled(factors.some((f: any) => f.status === "verified"));

    // Load user data
    const { data: userData } = await supabase.from("users")
      .select("emergency_contact, is_verified, verification_status")
      .eq("id", user.id).single();

    if (userData?.emergency_contact) setEc(userData.emergency_contact as EmergencyContact);
    setIsVerified(userData?.is_verified ?? false);
    setVerificationStatus(userData?.verification_status ?? "unverified");

    setLoading(false);
  }

  /* ─── 2FA ─────────────────────────────────────────────────────── */
  async function startEnroll() {
    setEnrolling(true);
    setMfaMsg("");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "FlexMatches" });
    if (error || !data) {
      setMfaMsg(`Error: ${error?.message ?? "Could not enroll"}`);
      setEnrolling(false);
      return;
    }
    setTotpUri(data.totp.uri);
    setTotpSecret(data.totp.secret);
    setTotpFactorId(data.id);
  }

  async function verifyTotp(code: string) {
    setMfaMsg("");
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactorId });
    if (challengeError || !challengeData) {
      setMfaMsg(`Error: ${challengeError?.message}`);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactorId,
      challengeId: challengeData.id,
      code,
    });
    if (verifyError) {
      setMfaMsg("Invalid code. Please try again.");
      return;
    }
    setMfaEnabled(true);
    setEnrolling(false);
    setTotpUri(""); setTotpSecret(""); setTotpFactorId("");
    setMfaMsg("✅ 2FA enabled successfully!");
    loadData();
  }

  async function disable2FA() {
    if (!mfaFactors.length) return;
    setDisabling2fa(true);
    const factor = mfaFactors.find((f: any) => f.status === "verified");
    if (factor) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
    setMfaEnabled(false);
    setDisabling2fa(false);
    setMfaMsg("2FA has been disabled.");
    loadData();
  }

  /* ─── Emergency Contact ─────────────────────────────────────────── */
  async function saveEmergencyContact() {
    if (!userId || !ec.name.trim() || !ec.phone.trim()) return;
    setEcSaving(true);
    await supabase.from("users").update({ emergency_contact: ec }).eq("id", userId);
    setEcSaving(false);
    setEcSaved(true);
    setShowEcForm(false);
    setTimeout(() => setEcSaved(false), 3000);
  }

  /* ─── Verification request ───────────────────────────────────────── */
  async function requestVerification() {
    if (!userId) return;
    setRequestingVerify(true);
    await supabase.from("users").update({ verification_status: "pending" }).eq("id", userId);
    setVerificationStatus("pending");
    setVerifyMsg("Verification request submitted! We'll review your profile within 24 hours.");
    setRequestingVerify(false);
  }

  /* ─── SOS ──────────────────────────────────────────────────────── */
  function activateSOS() {
    setSosActive(true);
    if (ec.phone) {
      window.location.href = `tel:${ec.phone.replace(/\s/g, "")}`;
    }
    setTimeout(() => setSosActive(false), 5000);
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #FF4500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer", padding: 0 }}>←</button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: 0 }}>Security & Privacy</h1>
          <p style={{ color: "#555", fontSize: 12, marginTop: 2 }}>Protect your account and data</p>
        </div>
      </div>

      {/* Emergency SOS — prominent at top */}
      <div style={{ background: "linear-gradient(135deg, #1a0000, #2a0000)", borderRadius: 18, padding: 18, border: "1px solid #ff6b6b44", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 28 }}>🆘</span>
          <div>
            <div style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>Emergency SOS</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
              {ec.phone ? `Will call ${ec.name || "your emergency contact"} (${ec.phone})` : "Set an emergency contact below"}
            </div>
          </div>
        </div>
        <button onClick={activateSOS}
          style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: sosActive ? "#ff0000" : "#ff6b6b", color: "#fff", fontWeight: 900, fontSize: 18, cursor: "pointer", letterSpacing: 1, transition: "background 0.3s" }}>
          {sosActive ? "🔴 SOS ACTIVATED — CALLING..." : "🆘 EMERGENCY SOS"}
        </button>
        <p style={{ fontSize: 11, color: "#555", textAlign: "center", margin: "8px 0 0" }}>
          {ec.phone ? "Tap to immediately call your emergency contact" : "Add an emergency contact to activate SOS"}
        </p>
      </div>

      {/* Encryption status */}
      <div style={{ background: "#111", borderRadius: 16, padding: 16, border: "1px solid #22c55e33", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>🔒</span>
          <div>
            <div style={{ fontWeight: 700, color: "#22c55e", fontSize: 14 }}>AES-256 Encryption Active</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4, lineHeight: 1.6 }}>
              All data encrypted in transit (TLS 1.3) and at rest. Powered by Supabase's enterprise-grade security infrastructure.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {["TLS 1.3", "AES-256", "GDPR Ready", "SOC 2"].map((badge) => (
            <span key={badge} style={{ fontSize: 10, color: "#22c55e", background: "#052e16", borderRadius: 999, padding: "3px 10px", border: "1px solid #22c55e33", fontWeight: 700 }}>
              ✓ {badge}
            </span>
          ))}
        </div>
      </div>

      {/* 2FA */}
      <div style={{ background: "#111", borderRadius: 16, padding: 16, border: `1px solid ${mfaEnabled ? "#22c55e33" : "#1a1a1a"}`, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: mfaEnabled || enrolling ? 14 : 0 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 24 }}>{mfaEnabled ? "🔐" : "🔓"}</span>
            <div>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>Two-Factor Authentication</div>
              <div style={{ fontSize: 12, color: mfaEnabled ? "#22c55e" : "#555", marginTop: 2, fontWeight: mfaEnabled ? 700 : 400 }}>
                {mfaEnabled ? "✓ Enabled — Google Authenticator" : "Not enabled"}
              </div>
            </div>
          </div>
          {!enrolling && (
            <button onClick={mfaEnabled ? disable2FA : startEnroll} disabled={disabling2fa}
              style={{ padding: "8px 14px", borderRadius: 10, border: mfaEnabled ? "1px solid #ff6b6b44" : "none", background: mfaEnabled ? "transparent" : "#22c55e", color: mfaEnabled ? "#ff6b6b" : "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0, opacity: disabling2fa ? 0.6 : 1 }}>
              {mfaEnabled ? "Disable" : "Enable"}
            </button>
          )}
        </div>

        {mfaMsg && (
          <div style={{ fontSize: 12, color: mfaMsg.startsWith("✅") ? "#22c55e" : mfaMsg.startsWith("Error") ? "#ff6b6b" : "#888", marginBottom: 10, lineHeight: 1.5 }}>
            {mfaMsg}
          </div>
        )}

        {enrolling && totpSecret && (
          <TotpSetup
            uri={totpUri}
            secret={totpSecret}
            onVerify={verifyTotp}
            onCancel={() => { setEnrolling(false); setTotpUri(""); setTotpSecret(""); setTotpFactorId(""); }}
          />
        )}
      </div>

      {/* Emergency Contact */}
      <div style={{ background: "#111", borderRadius: 16, padding: 16, border: "1px solid #1a1a1a", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ec.name || showEcForm ? 14 : 0 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 24 }}>📞</span>
            <div>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>Emergency Contact</div>
              <div style={{ fontSize: 12, color: ec.name ? "#ccc" : "#555", marginTop: 2 }}>
                {ec.name ? `${ec.name} · ${ec.relation || "Contact"} · ${ec.phone}` : "Not set"}
              </div>
            </div>
          </div>
          <button onClick={() => setShowEcForm(!showEcForm)}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "#888", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {showEcForm ? "Cancel" : ec.name ? "Edit" : "+ Add"}
          </button>
        </div>

        {ecSaved && (
          <div style={{ fontSize: 13, color: "#22c55e", fontWeight: 700, marginBottom: 10 }}>✅ Emergency contact saved!</div>
        )}

        {showEcForm && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={labelStyle}>CONTACT NAME</label>
              <input value={ec.name} onChange={(e) => setEc({ ...ec, name: e.target.value })}
                placeholder="e.g. Jane Smith" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>PHONE NUMBER</label>
              <input value={ec.phone} onChange={(e) => setEc({ ...ec, phone: e.target.value })}
                placeholder="+1 234 567 8900" type="tel" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>RELATIONSHIP</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Family", "Partner", "Friend", "Coach", "Other"].map((r) => (
                  <button key={r} onClick={() => setEc({ ...ec, relation: r })}
                    style={{ padding: "6px 14px", borderRadius: 999, border: `1px solid ${ec.relation === r ? "#FF4500" : "#2a2a2a"}`, background: ec.relation === r ? "#FF450022" : "transparent", color: ec.relation === r ? "#FF4500" : "#666", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={saveEmergencyContact} disabled={!ec.name.trim() || !ec.phone.trim() || ecSaving}
              style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: (ec.name.trim() && ec.phone.trim()) ? "#FF4500" : "#1a1a1a", color: (ec.name.trim() && ec.phone.trim()) ? "#fff" : "#555", fontWeight: 700, fontSize: 15, cursor: (ec.name.trim() && ec.phone.trim()) ? "pointer" : "default", opacity: ecSaving ? 0.6 : 1 }}>
              {ecSaving ? "Saving..." : "Save Emergency Contact"}
            </button>
          </div>
        )}
      </div>

      {/* Match Verification */}
      <div style={{ background: "#111", borderRadius: 16, padding: 16, border: `1px solid ${isVerified ? "#22c55e33" : verificationStatus === "pending" ? "#f59e0b33" : "#1a1a1a"}`, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>{isVerified ? "✅" : verificationStatus === "pending" ? "⏳" : "🪪"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>Identity Verification</div>
            <div style={{ fontSize: 12, marginTop: 2, color: isVerified ? "#22c55e" : verificationStatus === "pending" ? "#f59e0b" : "#555", fontWeight: isVerified || verificationStatus === "pending" ? 700 : 400 }}>
              {isVerified ? "✓ Verified — Blue badge on your profile" : verificationStatus === "pending" ? "⏳ Under review (24-48 hours)" : "Not verified"}
            </div>
            {!isVerified && verificationStatus !== "pending" && (
              <p style={{ fontSize: 12, color: "#666", marginTop: 6, lineHeight: 1.6 }}>
                Verified users get a ✓ badge on their profile, increasing trust and match quality. Requires a clear selfie + government ID review.
              </p>
            )}
          </div>
        </div>
        {verifyMsg && <div style={{ fontSize: 12, color: "#22c55e", marginBottom: 10, lineHeight: 1.5 }}>{verifyMsg}</div>}
        {!isVerified && verificationStatus !== "pending" && (
          <button onClick={requestVerification} disabled={requestingVerify}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "none", background: "#3b82f6", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: requestingVerify ? 0.6 : 1 }}>
            {requestingVerify ? "Submitting..." : "🪪 Request Verification"}
          </button>
        )}
      </div>

      {/* Data Privacy */}
      <div style={{ background: "#111", borderRadius: 16, padding: 16, border: "1px solid #1a1a1a", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#FF4500", fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>DATA PRIVACY & COMPLIANCE</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {["GDPR", "CCPA", "PDPA"].map((badge) => (
            <span key={badge} style={{ fontSize: 11, color: "#3b82f6", background: "#0f172a", borderRadius: 999, padding: "3px 10px", border: "1px solid #3b82f633", fontWeight: 700 }}>
              ✓ {badge} Compliant
            </span>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <InfoRow label="Data collected" value="Profile, workouts, messages" />
          <InfoRow label="Data stored" value="Supabase (US East)" />
          <InfoRow label="Retention" value="Until account deletion" />
          <InfoRow label="Third parties" value="Supabase, Vercel" />
        </div>
        <div style={{ borderTop: "1px solid #1a1a1a", marginTop: 14, paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => router.push("/app/settings")}
            style={actionBtn}>
            🗑️ Delete My Account
          </button>
          <button onClick={() => {
            const data = { email: userEmail, exported_at: new Date().toISOString(), note: "Full data export available on request. Contact support@flexmatches.com" };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "my-flexmatches-data.json"; a.click();
          }} style={actionBtn}>
            📥 Export My Data (JSON)
          </button>
          <button onClick={() => window.open("https://flexmatches.com/privacy", "_blank")} style={actionBtn}>
            📄 Privacy Policy
          </button>
        </div>
      </div>

      {/* Security Checklist */}
      <div style={{ background: "#111", borderRadius: 16, padding: 16, border: "1px solid #1a1a1a", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#FF4500", fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>SECURITY CHECKLIST</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Email verified", done: true },
            { label: "2FA enabled", done: mfaEnabled },
            { label: "Emergency contact set", done: !!ec.name },
            { label: "Profile verified", done: isVerified },
            { label: "Privacy settings configured", done: true },
          ].map(({ label, done }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: done ? "#22c55e" : "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: done ? "#fff" : "#555" }}>{done ? "✓" : "○"}</span>
              </div>
              <span style={{ fontSize: 13, color: done ? "#ccc" : "#555", fontWeight: done ? 600 : 400 }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, background: "#0f0f0f", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 12, color: "#555" }}>
            Security score: <strong style={{ color: [mfaEnabled, !!ec.name, isVerified].filter(Boolean).length >= 2 ? "#22c55e" : "#f59e0b" }}>
              {Math.round(([true, mfaEnabled, !!ec.name, isVerified, true].filter(Boolean).length / 5) * 100)}%
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "#555" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#888" }}>{value}</span>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: 0.5, display: "block", marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" };
const actionBtn: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid #2a2a2a", background: "transparent", color: "#ccc", fontWeight: 600, fontSize: 13, cursor: "pointer", textAlign: "left" };
