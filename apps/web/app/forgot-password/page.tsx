"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48 }}>🔑</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -1, marginTop: 8 }}>Reset Password</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Enter your email to get a reset link</p>
        </div>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
              We sent a reset link to <span style={{ color: "var(--accent)" }}>{email}</span>. Click the link to set a new password.
            </p>
            <Link href="/login" style={{ color: "var(--accent)", fontWeight: 700, fontSize: 15 }}>← Back to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="your@email.com"
                style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: "14px 16px", color: "var(--text-primary)", fontSize: 16, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {error && <p style={{ color: "#ef4444", fontSize: 14, textAlign: "center" }}>{error}</p>}

            <button type="submit" disabled={loading}
              style={{ padding: "16px 0", borderRadius: 16, border: "none", background: "var(--accent)", color: "var(--text-primary)", fontWeight: 700, fontSize: 18, cursor: "pointer", opacity: loading ? 0.6 : 1, marginTop: 8 }}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              Remember it?{" "}
              <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
