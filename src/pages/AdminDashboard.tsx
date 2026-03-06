import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { getUsers, saveUsers, hashPassword, type StoredUser } from "@/lib/auth";
import "./admin.css";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const currentUser = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<StoredUser[]>(() => getUsers());
  const [showCreate, setShowCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Create form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Reset form state
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  function refresh() {
    setUsers(getUsers());
  }

  // ── Create User ──────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const uname = newUsername.trim().toLowerCase();
    if (!uname || !newPassword) return;
    if (uname.length < 3) {
      setCreateError("Username minimal 3 karakter.");
      return;
    }
    if (newPassword.length < 6) {
      setCreateError("Password minimal 6 karakter.");
      return;
    }
    if (users.some((u) => u.username === uname)) {
      setCreateError("Username sudah digunakan.");
      return;
    }
    setCreateLoading(true);
    const hash = await hashPassword(newPassword);
    const all = getUsers();
    saveUsers([
      ...all,
      {
        username: uname,
        passwordHash: hash,
        role: newRole,
        createdAt: Date.now(),
      },
    ]);
    setCreateLoading(false);
    setNewUsername("");
    setNewPassword("");
    setNewRole("user");
    setShowCreate(false);
    refresh();
  }

  // ── Delete User ──────────────────────────────────────────────────────────────
  function handleDelete(username: string) {
    if (username === currentUser?.username) return;
    saveUsers(getUsers().filter((u) => u.username !== username));
    setDeleteTarget(null);
    refresh();
  }

  // ── Reset Password ───────────────────────────────────────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError(null);
    setResetSuccess(false);
    if (resetPassword.length < 6) {
      setResetError("Password minimal 6 karakter.");
      return;
    }
    setResetLoading(true);
    const hash = await hashPassword(resetPassword);
    saveUsers(
      getUsers().map((u) =>
        u.username === resetTarget ? { ...u, passwordHash: hash } : u,
      ),
    );
    setResetLoading(false);
    setResetSuccess(true);
    setTimeout(() => {
      setResetTarget(null);
      setResetPassword("");
      setResetSuccess(false);
      refresh();
    }, 1200);
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="adm-page">
      {/* Background glow */}
      <div className="adm-glow adm-glow-1" />
      <div className="adm-glow adm-glow-2" />

      {/* Header */}
      <header className="adm-header">
        <Link to="/" className="adm-logo">
          i<em>Frame</em>
        </Link>
        <div className="adm-header-right">
          <span className="adm-badge">Admin</span>
          <span className="adm-username">{currentUser?.username}</span>
          <button className="adm-logout" onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </header>

      <main className="adm-main">
        {/* Page title */}
        <div className="adm-page-head">
          <div>
            <h1 className="adm-page-title">Manajemen Pengguna</h1>
            <p className="adm-page-sub">{users.length} akun terdaftar</p>
          </div>
          <button
            className="adm-btn-primary"
            onClick={() => {
              setShowCreate(true);
              setCreateError(null);
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              fill="none"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Buat Akun
          </button>
        </div>

        {/* User table */}
        <div className="adm-card">
          {users.length === 0 ? (
            <div className="adm-empty">Belum ada pengguna.</div>
          ) : (
            <>
              <div className="adm-desktop-table">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Dibuat</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.username}
                        className={
                          u.username === currentUser?.username ? "adm-row-self" : ""
                        }
                      >
                        <td>
                          <div className="adm-user-cell">
                            <div className="adm-avatar">
                              {u.username[0].toUpperCase()}
                            </div>
                            <span>{u.username}</span>
                            {u.username === currentUser?.username && (
                              <span className="adm-you">Kamu</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`adm-role-badge ${u.role}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="adm-date">{formatDate(u.createdAt)}</td>
                        <td>
                          <div className="adm-actions">
                            <button
                              className="adm-btn-ghost"
                              onClick={() => {
                                setResetTarget(u.username);
                                setResetPassword("");
                                setResetError(null);
                                setResetSuccess(false);
                              }}
                            >
                              Reset PW
                            </button>
                            {u.username !== currentUser?.username && (
                              <button
                                className="adm-btn-danger"
                                onClick={() => setDeleteTarget(u.username)}
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="adm-mobile-list">
                {users.map((u) => (
                  <article
                    key={`mobile-${u.username}`}
                    className={`adm-user-card${
                      u.username === currentUser?.username ? " adm-user-card-self" : ""
                    }`}
                  >
                    <div className="adm-user-card-head">
                      <div className="adm-user-cell">
                        <div className="adm-avatar">{u.username[0].toUpperCase()}</div>
                        <div className="adm-user-copy">
                          <span>{u.username}</span>
                          {u.username === currentUser?.username && (
                            <span className="adm-you">Kamu</span>
                          )}
                        </div>
                      </div>
                      <span className={`adm-role-badge ${u.role}`}>{u.role}</span>
                    </div>

                    <p className="adm-date">Dibuat {formatDate(u.createdAt)}</p>

                    <div className="adm-actions">
                      <button
                        className="adm-btn-ghost"
                        onClick={() => {
                          setResetTarget(u.username);
                          setResetPassword("");
                          setResetError(null);
                          setResetSuccess(false);
                        }}
                      >
                        Reset PW
                      </button>
                      {u.username !== currentUser?.username && (
                        <button
                          className="adm-btn-danger"
                          onClick={() => setDeleteTarget(u.username)}
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── Modal: Create User ── */}
      {showCreate && (
        <div className="adm-overlay" onClick={() => setShowCreate(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2>Buat Akun Baru</h2>
              <button
                className="adm-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="none"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form className="adm-modal-form" onSubmit={handleCreate} noValidate>
              <div className="adm-field">
                <label className="adm-label" htmlFor="adm-uname">
                  Username
                </label>
                <input
                  id="adm-uname"
                  type="text"
                  className="adm-input"
                  placeholder="min. 3 karakter"
                  autoFocus
                  value={newUsername}
                  onChange={(e) => {
                    setNewUsername(e.target.value);
                    setCreateError(null);
                  }}
                />
              </div>
              <div className="adm-field">
                <label className="adm-label" htmlFor="adm-pw">
                  Password
                </label>
                <input
                  id="adm-pw"
                  type="password"
                  className="adm-input"
                  placeholder="min. 6 karakter"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setCreateError(null);
                  }}
                />
              </div>
              <div className="adm-field">
                <label className="adm-label" htmlFor="adm-role">
                  Role
                </label>
                <select
                  id="adm-role"
                  className="adm-select"
                  value={newRole}
                  onChange={(e) =>
                    setNewRole(e.target.value as "user" | "admin")
                  }
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              {createError && <p className="adm-form-error">{createError}</p>}
              <div className="adm-modal-foot">
                <button
                  type="button"
                  className="adm-btn-outline"
                  onClick={() => setShowCreate(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="adm-btn-primary"
                  disabled={createLoading}
                >
                  {createLoading ? (
                    <span className="adm-spinner" />
                  ) : (
                    "Buat Akun"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Confirm ── */}
      {deleteTarget && (
        <div className="adm-overlay" onClick={() => setDeleteTarget(null)}>
          <div
            className="adm-modal adm-modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="adm-modal-head">
              <h2>Hapus Akun</h2>
              <button
                className="adm-modal-close"
                onClick={() => setDeleteTarget(null)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="none"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="adm-confirm-text">
              Yakin ingin menghapus akun <strong>{deleteTarget}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="adm-modal-foot">
              <button
                className="adm-btn-outline"
                onClick={() => setDeleteTarget(null)}
              >
                Batal
              </button>
              <button
                className="adm-btn-danger-solid"
                onClick={() => handleDelete(deleteTarget)}
              >
                Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Reset Password ── */}
      {resetTarget && (
        <div className="adm-overlay" onClick={() => setResetTarget(null)}>
          <div
            className="adm-modal adm-modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="adm-modal-head">
              <h2>Reset Password</h2>
              <button
                className="adm-modal-close"
                onClick={() => setResetTarget(null)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="none"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="adm-confirm-sub">
              Atur password baru untuk <strong>{resetTarget}</strong>
            </p>
            {resetSuccess ? (
              <div className="adm-success">✓ Password berhasil direset!</div>
            ) : (
              <form
                className="adm-modal-form"
                onSubmit={handleReset}
                noValidate
              >
                <div className="adm-field">
                  <label className="adm-label" htmlFor="adm-rpw">
                    Password Baru
                  </label>
                  <input
                    id="adm-rpw"
                    type="password"
                    className="adm-input"
                    placeholder="min. 6 karakter"
                    autoFocus
                    value={resetPassword}
                    onChange={(e) => {
                      setResetPassword(e.target.value);
                      setResetError(null);
                    }}
                  />
                </div>
                {resetError && <p className="adm-form-error">{resetError}</p>}
                <div className="adm-modal-foot">
                  <button
                    type="button"
                    className="adm-btn-outline"
                    onClick={() => setResetTarget(null)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="adm-btn-primary"
                    disabled={resetLoading}
                  >
                    {resetLoading ? <span className="adm-spinner" /> : "Simpan"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
