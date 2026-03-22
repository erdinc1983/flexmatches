"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (m.includes("invalid email")) return "Please enter a valid email address.";
  if (m.includes("password should be at least"))
    return "Password must be at least 6 characters.";
  if (m.includes("invalid login credentials") || m.includes("invalid credentials"))
    return "Incorrect email or password. Please check and try again.";
  if (m.includes("email not confirmed"))
    return "Please check your email and click the confirmation link before signing in.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("network") || m.includes("fetch"))
    return "Connection error. Please check your internet and try again.";
  return msg;
}

function validatePassword(pw: string) {
  return {
    length:  pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    lower:   /[a-z]/.test(pw),
    number:  /[0-9]/.test(pw),
  };
}

function validateUsername(u: string) {
  return {
    length:  u.length >= 3,
    chars:   /^[a-zA-Z0-9_]+$/.test(u),
  };
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]       = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [unFocused, setUnFocused] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) localStorage.setItem("referral_code", ref);
  }, [searchParams]);

  const pw   = validatePassword(password);
  const un   = validateUsername(username);
  const pwOk = pw.length && pw.upper && pw.lower && pw.number;
  const unOk = un.length && un.chars;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!unOk) { setError("Please fix your username before continuing."); return; }
    if (!pwOk)  { setError("Please meet all password requirements before continuing."); return; }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (signUpError) { setError(friendlyError(signUpError.message)); setLoading(false); return; }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) { setError(friendlyError(loginError.message)); setLoading(false); return; }

    setLoading(false);
    router.replace("/onboarding");
  }

  async function handleGoogleRegister() {
    setGoogleLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app/discover` },
    });
    if (error) { setError(friendlyError(error.message)); setGoogleLoading(false); }
  }

  const Rule = ({ ok, label }: { ok: boolean; label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: ok ? "#22c55e" : "#888" }}>
      <span style={{ fontSize: 11, fontWeight: 800 }}>{ok ? "✓" : "○"}</span>
      {label}
    </div>
  );

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%", background: "var(--bg-card-alt)",
    border: `1px solid ${hasError ? "#ef4444" : "var(--border-medium)"}`,
    borderRadius: 12, padding: "14px 16px", color: "var(--text-primary)",
    fontSize: 16, outline: "none", boxSizing: "border-box",
  });

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48 }}>💪</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -1, marginTop: 8, fontFamily: "var(--font-display)" }}>Join FlexMatches</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Find your fitness partner</p>
        </div>

        <button onClick={handleGoogleRegister} disabled={googleLoading}
          style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "1px solid var(--border-medium)", background: "var(--bg-card-alt)", color: "var(--text-primary)", fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20, opacity: googleLoading ? 0.6 : 1 }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border-medium)" }} />
          <span style={{ color: "var(--text-faint)", fontSize: 13, fontWeight: 600 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--border-medium)" }} />
        </div>

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Username */}
          <div>
            <label style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Username</label>
            <input
              type="text" value={username} required autoComplete="username"
              onChange={(e) => { setUsername(e.target.value.trim()); setError(""); }}
              onFocus={() => setUnFocused(true)}
              style={inputStyle(unFocused && username.length > 0 && !unOk)}
            />
            {unFocused && username.length > 0 && !unOk && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                <Rule ok={un.length} label="At least 3 characters" />
                <Rule ok={un.chars}  label="Only letters, numbers and underscores (_)" />
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} required autoComplete="email"
              style={inputStyle()} />
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                value={password} required autoComplete="new-password"
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onFocus={() => setPwFocused(true)}
                style={{ ...inputStyle(!pwOk && pwFocused && password.length > 0), paddingRight: 48 }}
              />
              <button type="button" onClick={() => setShowPw(s => !s)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 18, padding: 0, lineHeight: 1 }}>
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>

            {/* Live password rules */}
            {pwFocused && password.length > 0 && (
              <div style={{ marginTop: 10, background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>Password requirements</div>
                <Rule ok={pw.length} label="At least 8 characters" />
                <Rule ok={pw.upper}  label="One uppercase letter (A–Z)" />
                <Rule ok={pw.lower}  label="One lowercase letter (a–z)" />
                <Rule ok={pw.number} label="One number (0–9)" />
              </div>
            )}

            {/* Strength bar */}
            {password.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 4, borderRadius: 99, background: "var(--border-medium)", overflow: "hidden" }}>
                  {(() => {
                    const score = [pw.length, pw.upper, pw.lower, pw.number].filter(Boolean).length;
                    const color = score <= 1 ? "#ef4444" : score === 2 ? "#f59e0b" : score === 3 ? "#3b82f6" : "#22c55e";
                    return <div style={{ height: "100%", width: `${score * 25}%`, background: color, borderRadius: 99, transition: "width 0.3s, background 0.3s" }} />;
                  })()}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 3 }}>
                  {(() => {
                    const score = [pw.length, pw.upper, pw.lower, pw.number].filter(Boolean).length;
                    return score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong ✓";
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "#3a0000", border: "1px solid #ef444466", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <span style={{ color: "#fca5a5", fontSize: 14, lineHeight: 1.5 }}>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ padding: "16px 0", borderRadius: 16, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 18, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: 4 }}>
            {loading ? "Creating account…" : "Create Account"}
          </button>

          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>Sign in</Link>
          </p>

          <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 12, marginTop: 4 }}>
            By signing up, you agree to our{" "}
            <Link href="/terms" style={{ color: "var(--text-faint)", textDecoration: "underline" }}>Terms</Link>
            {" "}and{" "}
            <Link href="/privacy-policy" style={{ color: "var(--text-faint)", textDecoration: "underline" }}>Privacy Policy</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
