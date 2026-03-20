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
    <div style={{ background: "#0F0F0F", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48 }}>🔑</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: -1, marginTop: 8 }}>Reset Password</h1>
          <p style={{ color: "#888", marginTop: 8 }}>Enter your email to get a reset link</p>
        </div>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
            <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: "#888", fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
              We sent a reset link to <span style={{ color: "#FF4500" }}>{email}</span>. Click the link to set a new password.
            </p>
            <Link href="/login" style={{ color: "#FF4500", fontWeight: 700, fontSize: 15 }}>← Back to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: "#888", fontWeight: 600, display: "block", marginBottom: 6 }}>Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="your@email.com"
                style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {error && <p style={{ color: "#ef4444", fontSize: 14, textAlign: "center" }}>{error}</p>}

            <button type="submit" disabled={loading}
              style={{ padding: "16px 0", borderRadius: 16, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 18, cursor: "pointer", opacity: loading ? 0.6 : 1, marginTop: 8 }}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <p style={{ textAlign: "center", color: "#888", fontSize: 14 }}>
              Remember it?{" "}
              <Link href="/login" style={{ color: "#FF4500", fontWeight: 600 }}>Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
