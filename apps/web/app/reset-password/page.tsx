"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Handle PKCE code in URL query params (Supabase v2 default)
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setError("Invalid or expired reset link. Please request a new one.");
        else setReady(true);
      });
      return;
    }

    // Fallback: listen for PASSWORD_RECOVERY event (hash-based flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });

    // Also check if session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else router.replace("/app/home");
  }

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48 }}>🔐</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -1, marginTop: 8 }}>New Password</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Choose a strong password</p>
        </div>

        {!ready && !error && (
          <p style={{ color: "var(--text-muted)", fontSize: 14, textAlign: "center", marginBottom: 16 }}>
            Verifying your reset link...
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>New Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: "14px 16px", color: "var(--text-primary)", fontSize: 16, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Confirm Password</label>
            <input
              type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
              style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: "14px 16px", color: "var(--text-primary)", fontSize: 16, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {error && <p style={{ color: "#ef4444", fontSize: 14, textAlign: "center" }}>{error}</p>}

          <button type="submit" disabled={loading || !ready}
            style={{ padding: "16px 0", borderRadius: 16, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 18, cursor: "pointer", opacity: loading ? 0.6 : 1, marginTop: 8 }}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
