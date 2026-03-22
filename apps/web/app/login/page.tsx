"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  // 2FA step
  const [needs2FA, setNeeds2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }

    // Check if 2FA required
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (totp) { setMfaFactorId(totp.id); setNeeds2FA(true); return; }
    }
    router.replace("/app/discover");
  }

  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    setTotpLoading(true);
    setError("");
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
    if (cErr || !challenge) { setError(cErr?.message ?? "Challenge failed"); setTotpLoading(false); return; }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge.id, code: totpCode });
    setTotpLoading(false);
    if (vErr) { setError("Invalid code. Please try again."); setTotpCode(""); return; }
    router.replace("/app/discover");
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app/discover` },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  }

  if (needs2FA) {
    return (
      <div style={{ background: "var(--bg-page)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 48 }}>🔐</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -1, marginTop: 8 }}>Two-Factor Auth</h1>
            <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: 14 }}>Enter the 6-digit code from your authenticator app</p>
          </div>

          <form onSubmit={handleVerify2FA} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              autoFocus
              style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: "18px 16px", color: "var(--text-primary)", fontSize: 32, fontFamily: "monospace", textAlign: "center", outline: "none", boxSizing: "border-box", letterSpacing: 12 }}
            />

            {error && <p style={{ color: "#ef4444", fontSize: 14, textAlign: "center" }}>{error}</p>}

            <button type="submit" disabled={totpLoading || totpCode.length !== 6}
              style={{ padding: "16px 0", borderRadius: 16, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 18, cursor: totpCode.length === 6 ? "pointer" : "not-allowed", opacity: (totpLoading || totpCode.length !== 6) ? 0.5 : 1, marginTop: 8 }}>
              {totpLoading ? "Verifying..." : "Verify"}
            </button>

            <button type="button" onClick={async () => { await supabase.auth.signOut(); setNeeds2FA(false); setTotpCode(""); setError(""); }}
              style={{ padding: "12px 0", borderRadius: 16, border: "1px solid var(--border-medium)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48 }}>💪</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -1, marginTop: 8, fontFamily: "var(--font-display)" }}>FlexMatches</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Welcome back</p>
        </div>

        {/* Google Login */}
        <button onClick={handleGoogleLogin} disabled={googleLoading}
          style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "1px solid var(--border-medium)", background: "var(--bg-card-alt)", color: "var(--text-primary)", fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20, opacity: googleLoading ? 0.6 : 1 }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border-medium)" }} />
          <span style={{ color: "var(--text-faint)", fontSize: 13, fontWeight: 600 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--border-medium)" }} />
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: "14px 16px", color: "var(--text-primary)", fontSize: 16, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Password</label>
            <div style={{ position: "relative" }}>
              <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: "14px 48px 14px 16px", color: "var(--text-primary)", fontSize: 16, outline: "none", boxSizing: "border-box" }} />
              <button type="button" onClick={() => setShowPw(s => !s)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 18, padding: 0, lineHeight: 1 }}>
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div style={{ textAlign: "right", marginTop: -8 }}>
            <Link href="/forgot-password" style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>Forgot password?</Link>
          </div>

          {error && <p style={{ color: "#ef4444", fontSize: 14, textAlign: "center" }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ padding: "16px 0", borderRadius: 16, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 18, cursor: "pointer", opacity: loading ? 0.6 : 1, marginTop: 8 }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "var(--accent)", fontWeight: 600 }}>Sign up</Link>
          </p>

          <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 12, marginTop: 8 }}>
            By continuing, you agree to our{" "}
            <Link href="/terms" style={{ color: "var(--text-faint)", textDecoration: "underline" }}>Terms</Link>
            {" "}and{" "}
            <Link href="/privacy-policy" style={{ color: "var(--text-faint)", textDecoration: "underline" }}>Privacy Policy</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
