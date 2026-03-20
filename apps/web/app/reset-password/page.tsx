"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else router.replace("/app/discover");
  }

  return (
    <div style={{ background: "#0F0F0F", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48 }}>🔐</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: -1, marginTop: 8 }}>New Password</h1>
          <p style={{ color: "#888", marginTop: 8 }}>Choose a strong password</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: "#888", fontWeight: 600, display: "block", marginBottom: 6 }}>New Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, color: "#888", fontWeight: 600, display: "block", marginBottom: 6 }}>Confirm Password</label>
            <input
              type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {error && <p style={{ color: "#ef4444", fontSize: 14, textAlign: "center" }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ padding: "16px 0", borderRadius: 16, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 18, cursor: "pointer", opacity: loading ? 0.6 : 1, marginTop: 8 }}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
