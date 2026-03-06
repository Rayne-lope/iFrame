import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { getRemainingAttempts } from "@/lib/rateLimit";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  function startCountdown(seconds: number) {
    let s = seconds;
    setError(lockMsg(s));
    setRemaining(s);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      s -= 1;
      if (s <= 0) {
        clearInterval(timerRef.current!);
        setError(null);
        setRemaining(null);
      } else {
        setError(lockMsg(s));
        setRemaining(s);
      }
    }, 1000);
  }

  function lockMsg(s: number) {
    const m = Math.floor(s / 60),
      sec = s % 60;
    return `Terlalu banyak percobaan. Coba lagi dalam ${m > 0 ? `${m}m ` : ""}${sec}s.`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    const result = await login(username.trim().toLowerCase(), password);
    setLoading(false);
    if (result.ok) {
      navigate(from, { replace: true });
    } else if (result.reason === "rate_limited") {
      startCountdown(result.retryAfter ?? 900);
    } else {
      const left = getRemainingAttempts(username.trim().toLowerCase());
      setError(
        left <= 2 && left > 0
          ? `Username atau password salah. ${left} percobaan tersisa.`
          : "Username atau password salah.",
      );
    }
  }

  const locked = remaining !== null;
  const disabled = loading || locked || !username.trim() || !password;

  return (
    <div className="login-page">
      <div className="login-glow login-glow-1" />
      <div className="login-glow login-glow-2" />

      <div className="login-card">
        <div className="login-logo">
          i<em>Frame</em>
        </div>
        <h1 className="login-title">Selamat datang</h1>
        <p className="login-subtitle">
          Masuk dengan akun yang telah diberikan.
        </p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* Username */}
          <div className="login-field">
            <label className="login-label" htmlFor="lun">
              Username
            </label>
            <div className="login-input-wrap">
              <svg
                className="login-input-icon"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                strokeWidth="1.8"
                stroke="currentColor"
                fill="none"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id="lun"
                type="text"
                className="login-input"
                placeholder="Masukkan username"
                autoComplete="username"
                autoFocus
                value={username}
                disabled={loading || locked}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label className="login-label" htmlFor="lpw">
              Password
            </label>
            <div className="login-input-wrap">
              <svg
                className="login-input-icon"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                strokeWidth="1.8"
                stroke="currentColor"
                fill="none"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="lpw"
                type={showPass ? "text" : "password"}
                className="login-input"
                placeholder="Masukkan password"
                autoComplete="current-password"
                value={password}
                disabled={loading || locked}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
              />
              <button
                type="button"
                className="login-eye"
                tabIndex={-1}
                onClick={() => setShowPass((v) => !v)}
                aria-label={
                  showPass ? "Sembunyikan password" : "Tampilkan password"
                }
              >
                {showPass ? (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    strokeWidth="1.8"
                    stroke="currentColor"
                    fill="none"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    strokeWidth="1.8"
                    stroke="currentColor"
                    fill="none"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={`login-error${locked ? " login-error-lock" : ""}`}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                className="login-error-icon"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="login-submit" disabled={disabled}>
            {loading ? (
              <span className="login-spinner" />
            ) : locked ? (
              "Dikunci sementara"
            ) : (
              "Masuk"
            )}
          </button>
        </form>

        <p className="login-footer">Tidak punya akun? Hubungi admin.</p>
      </div>
    </div>
  );
}
