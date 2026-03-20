"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }

    // Auto login after signup
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) { setError(loginError.message); setLoading(false); return; }

    setLoading(false);
    router.replace("/onboarding");
  }

  return (
    <div style={{ background: "#0F0F0F", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48 }}>💪</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: -1, marginTop: 8 }}>Join FlexMatches</h1>
          <p style={{ color: "#888", marginTop: 8 }}>Find your fitness partner</p>
        </div>

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: "#888", fontWeight: 600, display: "block", marginBottom: 6 }}>Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: "#888", fontWeight: 600, display: "block", marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: "#888", fontWeight: 600, display: "block", marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box" }} />
          </div>

          {error && <p style={{ color: "#ef4444", fontSize: 14, textAlign: "center" }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ padding: "16px 0", borderRadius: 16, border: "none", background: "#FF4500", color: "#fff", fontWeight: 700, fontSize: 18, cursor: "pointer", opacity: loading ? 0.6 : 1, marginTop: 8 }}>
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p style={{ textAlign: "center", color: "#888", fontSize: 14 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#FF4500", fontWeight: 600 }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
