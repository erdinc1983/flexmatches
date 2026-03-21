"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type AdminUser = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  city: string | null;
  sports: string[] | null;
  fitness_level: string | null;
  is_admin: boolean;
  banned_at: string | null;
  created_at: string;
  avatar_url: string | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "banned" | "admins">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    userId: string;
    name: string;
    action: "ban" | "unban" | "delete" | "promote" | "demote";
  } | null>(null);
  const [editModal, setEditModal] = useState<{
    userId: string;
    full_name: string;
    username: string;
    city: string;
    fitness_level: string;
    sports: string;
  } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const loadUsers = useCallback(async () => {
    const token = await getToken();
    if (!token) { router.push("/login"); return; }
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 403) { router.push("/app/home"); return; }
    const json = await res.json();
    setUsers(json.users ?? []);
    setLoading(false);
  }, [getToken, router]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const execAction = async (
    userId: string,
    action: "ban" | "unban" | "delete" | "promote" | "demote"
  ) => {
    setActionLoading(userId + action);
    const token = await getToken();
    if (!token) return;

    if (action === "delete") {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (json.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        showToast("User deleted permanently.");
      } else showToast(json.error ?? "Error", false);
    } else {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const json = await res.json();
      if (json.ok) {
        await loadUsers();
        showToast(
          action === "ban" ? "User banned." :
          action === "unban" ? "User unbanned." :
          action === "promote" ? "User promoted to admin." : "Admin access removed."
        );
      } else showToast(json.error ?? "Error", false);
    }
    setActionLoading(null);
    setConfirmModal(null);
  };

  const saveEdit = async () => {
    if (!editModal) return;
    setEditSaving(true);
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: editModal.userId,
        action: "edit",
        full_name: editModal.full_name || null,
        username: editModal.username || null,
        city: editModal.city || null,
        fitness_level: editModal.fitness_level || null,
        sports: editModal.sports ? editModal.sports.split(",").map(s => s.trim()).filter(Boolean) : [],
      }),
    });
    const json = await res.json();
    setEditSaving(false);
    if (json.ok) {
      await loadUsers();
      setEditModal(null);
      showToast("Profile updated.");
    } else {
      showToast(json.error ?? "Error", false);
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.username ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.city ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "banned" && !!u.banned_at) ||
      (filter === "admins" && u.is_admin);
    return matchSearch && matchFilter;
  });

  const actionLabel = (a: string) =>
    a === "ban" ? "Ban" : a === "unban" ? "Unban" :
    a === "delete" ? "Delete" : a === "promote" ? "Promote to Admin" : "Remove Admin";

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#888", fontSize: 15 }}>Loading admin panel…</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e8e8", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#111", borderBottom: "1px solid #222", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => router.push("/app/home")} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>←</button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Admin Panel</div>
          <div style={{ fontSize: 12, color: "#888" }}>{users.length} total users</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <span style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#aaa" }}>
            {users.filter(u => u.banned_at).length} banned
          </span>
          <span style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#aaa" }}>
            {users.filter(u => u.is_admin).length} admins
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {/* Controls */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, username, email, city…"
            style={{ flex: 1, minWidth: 220, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px", color: "#e8e8e8", fontSize: 14, outline: "none" }}
          />
          {(["all", "banned", "admins"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: filter === f ? "#FF4500" : "#1a1a1a",
                border: `1px solid ${filter === f ? "#FF4500" : "#2a2a2a"}`,
                color: filter === f ? "#fff" : "#aaa",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* User count */}
        <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
          Showing {filtered.length} of {users.length} users
        </div>

        {/* Table */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", color: "#555", padding: "40px 0", fontSize: 14 }}>No users found.</div>
          )}
          {filtered.map((u) => (
            <div
              key={u.id}
              style={{
                background: u.banned_at ? "rgba(255,0,0,0.04)" : "#111",
                border: `1px solid ${u.banned_at ? "#3a1a1a" : u.is_admin ? "#2a1a00" : "#1e1e1e"}`,
                borderRadius: 10,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: u.avatar_url ? `url(${u.avatar_url}) center/cover` : "#1e1e1e",
                border: "2px solid #2a2a2a", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#555", fontSize: 18,
              }}>
                {!u.avatar_url && "👤"}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{u.full_name || "No name"}</span>
                  {u.username && <span style={{ fontSize: 12, color: "#888" }}>@{u.username}</span>}
                  {u.is_admin && (
                    <span style={{ background: "#FF4500", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>ADMIN</span>
                  )}
                  {u.banned_at && (
                    <span style={{ background: "#3a0000", color: "#ff6b6b", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>BANNED</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                  {u.email && <span>{u.email}</span>}
                  {u.city && <span> · {u.city}</span>}
                  {u.fitness_level && <span> · {u.fitness_level}</span>}
                  {u.sports && u.sports.length > 0 && <span> · {u.sports.slice(0, 3).join(", ")}</span>}
                </div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 3 }}>
                  Joined {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {u.banned_at && ` · Banned ${new Date(u.banned_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <ActionBtn
                  label="Edit"
                  color="#60a5fa"
                  loading={false}
                  onClick={() => setEditModal({
                    userId: u.id,
                    full_name: u.full_name ?? "",
                    username: u.username ?? "",
                    city: u.city ?? "",
                    fitness_level: u.fitness_level ?? "",
                    sports: (u.sports ?? []).join(", "),
                  })}
                />
                {u.banned_at ? (
                  <ActionBtn
                    label="Unban"
                    color="#22c55e"
                    loading={actionLoading === u.id + "unban"}
                    onClick={() => setConfirmModal({ userId: u.id, name: u.full_name ?? u.username ?? "this user", action: "unban" })}
                  />
                ) : (
                  <ActionBtn
                    label="Ban"
                    color="#f59e0b"
                    loading={actionLoading === u.id + "ban"}
                    onClick={() => setConfirmModal({ userId: u.id, name: u.full_name ?? u.username ?? "this user", action: "ban" })}
                  />
                )}
                {u.is_admin ? (
                  <ActionBtn
                    label="Demote"
                    color="#888"
                    loading={actionLoading === u.id + "demote"}
                    onClick={() => setConfirmModal({ userId: u.id, name: u.full_name ?? u.username ?? "this user", action: "demote" })}
                  />
                ) : (
                  <ActionBtn
                    label="Make Admin"
                    color="#FF4500"
                    loading={actionLoading === u.id + "promote"}
                    onClick={() => setConfirmModal({ userId: u.id, name: u.full_name ?? u.username ?? "this user", action: "promote" })}
                  />
                )}
                <ActionBtn
                  label="Delete"
                  color="#ef4444"
                  loading={actionLoading === u.id + "delete"}
                  onClick={() => setConfirmModal({ userId: u.id, name: u.full_name ?? u.username ?? "this user", action: "delete" })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 14, padding: 28, maxWidth: 360, width: "100%" }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>
              {actionLabel(confirmModal.action)} user?
            </div>
            <div style={{ fontSize: 14, color: "#aaa", marginBottom: 20, lineHeight: 1.6 }}>
              {confirmModal.action === "delete"
                ? `This will permanently delete ${confirmModal.name} and all their data. This cannot be undone.`
                : confirmModal.action === "ban"
                ? `${confirmModal.name} will be blocked from logging in.`
                : confirmModal.action === "unban"
                ? `${confirmModal.name} will regain access to their account.`
                : confirmModal.action === "promote"
                ? `${confirmModal.name} will get full admin access.`
                : `${confirmModal.name} will lose admin access.`}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: "11px 0", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#aaa", fontSize: 14, cursor: "pointer", fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={() => execAction(confirmModal.userId, confirmModal.action)}
                disabled={!!actionLoading}
                style={{
                  flex: 1, padding: "11px 0", borderRadius: 8, fontSize: 14, cursor: "pointer", fontWeight: 700, border: "none",
                  background: confirmModal.action === "delete" ? "#ef4444" : confirmModal.action === "ban" ? "#f59e0b" : confirmModal.action === "unban" ? "#22c55e" : "#FF4500",
                  color: "#fff",
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                {actionLoading ? "…" : actionLabel(confirmModal.action)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 14, padding: 28, maxWidth: 420, width: "100%" }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 20 }}>Edit User Profile</div>
            {(["full_name", "username", "city", "fitness_level", "sports"] as const).map((field) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#888", fontWeight: 600, display: "block", marginBottom: 5 }}>
                  {field === "full_name" ? "Full Name" : field === "fitness_level" ? "Fitness Level (beginner/intermediate/advanced)" : field === "sports" ? "Sports (comma-separated)" : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  value={editModal[field]}
                  onChange={(e) => setEditModal({ ...editModal, [field]: e.target.value })}
                  style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#e8e8e8", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => setEditModal(null)}
                style={{ flex: 1, padding: "11px 0", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#aaa", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={editSaving}
                style={{ flex: 1, padding: "11px 0", background: "#60a5fa", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 700, opacity: editSaving ? 0.6 : 1 }}>
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: toast.ok ? "#1a3a1a" : "#3a1a1a",
          border: `1px solid ${toast.ok ? "#22c55e" : "#ef4444"}`,
          color: toast.ok ? "#86efac" : "#fca5a5",
          padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
          zIndex: 1000, whiteSpace: "nowrap",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, color, loading, onClick }: { label: string; color: string; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: "7px 13px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
        background: "transparent", border: `1px solid ${color}`, color,
        opacity: loading ? 0.5 : 1, transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {loading ? "…" : label}
    </button>
  );
}
