import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { LOGO_URL } from "@/components/AppLayout";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await login(email.trim(), password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    toast.success(`Welcome back, ${res.user.name.split(" ")[0]}`);
    // First-login forced password change
    if (res.user.must_change_password) {
      navigate("/account/password", { replace: true });
      return;
    }
    const next = location.state?.from?.pathname || (res.user.role === "admin" ? "/admin" : "/dashboard");
    navigate(next, { replace: true });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* Left: form */}
      <div className="flex flex-col p-8 lg:p-14">
        <Link to="/" className="flex items-center gap-3 mb-12" data-testid="login-brand-link">
          <div className="w-11 h-11 rounded-lg bg-[var(--s2d-red)]/10 grid place-items-center overflow-hidden">
            <img src={LOGO_URL} alt="Safe2Drive" className="w-9 h-9 object-contain" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-extrabold text-[15px] tracking-tight">Safe2Drive</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--s2d-muted)]">Online BDE · Ontario</div>
          </div>
        </Link>

        <div className="max-w-md w-full mx-auto my-auto fade-up">
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-red)] mb-3">Welcome back</div>
          <h1 className="font-display font-black text-4xl md:text-5xl tracking-tight leading-[1.02]">Log in.</h1>
          <p className="mt-3 text-[var(--s2d-muted)]">Pick up right where you left off.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" data-testid="login-form">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--s2d-muted)] mb-2">Email</label>
              <input
                type="email"
                required
                className="input-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@safe2drive.ca"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--s2d-muted)] mb-2">Password</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  required
                  className="input-base pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  data-testid="login-password-input"
                />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-black/5" data-testid="login-toggle-password">
                  {show ? <EyeOff className="w-4 h-4 text-[var(--s2d-muted)]" /> : <Eye className="w-4 h-4 text-[var(--s2d-muted)]" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-[var(--s2d-red)] bg-red-50 border border-red-100 rounded-lg px-3 py-2" data-testid="login-error">{error}</div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-red w-full py-3.5 rounded-xl font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              data-testid="login-submit-btn"
            >
              {busy ? "Signing in…" : "Log in"} {!busy && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-6 text-sm text-[var(--s2d-muted)]">
            Need an account? Contact Safe2Drive Ontario and your instructor will enroll you and email your login.
          </p>

          <div className="mt-10 ink-card p-4 text-xs text-[var(--s2d-muted)]" data-testid="login-demo-hint">
            <div className="font-semibold text-[var(--s2d-ink)] mb-1 font-mono uppercase tracking-wider">Demo</div>
            Student: <span className="font-mono">student@safe2drive.ca / Student@2026</span><br />
            Admin: <span className="font-mono">admin@safe2drive.ca / Admin@2026</span>
          </div>
        </div>
      </div>

      {/* Right: visual */}
      <div className="relative hidden lg:block bg-[var(--s2d-ink)] grain overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1527593167147-e9c94a5883e6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwxfHxkcml2aW5nJTIwc2Nob29sJTIwY2FyJTIwc3RlZXJpbmclMjB3aGVlbCUyMG1vZGVybnxlbnwwfHx8fDE3ODA5MDM1MDJ8MA&ixlib=rb-4.1.0&q=85"
          alt="Driving"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="absolute top-10 right-10 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--s2d-red)] animate-pulse" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-white/90 font-mono">MTO-Approved BDE</span>
        </div>
        <div className="relative z-10 h-full flex flex-col justify-end p-14 text-white">
          <div className="text-xs uppercase tracking-[0.2em] opacity-80">MTO-Approved BDE</div>
          <h2 className="font-display font-black text-5xl tracking-tight mt-2 leading-[1]">Your safety<br />is our drive.</h2>
          <p className="text-white/70 mt-3 max-w-md">Built for the modern Ontario learner. Cinematic, focused, ready when you are.</p>
        </div>
      </div>
    </div>
  );
}
