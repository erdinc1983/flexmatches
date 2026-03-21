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
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else router.replace("/app/discover");
  }

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48 }}>💪</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -1, marginTop: 8 }}>FlexMatches</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Welcome back</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: "14px 16px", color: "var(--text-primary)", fontSize: 16, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ width: "100%", background: "var(--bg-card-alt)", border: "1px solid var(--border-medium)", borderRadius: 12, padding: "14px 16px", color: "var(--text-primary)", fontSize: 16, outline: "none", boxSizing: "border-box" }} />
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
        </form>
      </div>
    </div>
  );
}
