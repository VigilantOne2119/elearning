import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await register(name.trim(), email.trim(), password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    toast.success(`Welcome, ${res.user.name.split(" ")[0]}!`);
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      <div className="flex flex-col p-8 lg:p-14 order-2 lg:order-1">
        <Link to="/" className="flex items-center gap-3 mb-12" data-testid="register-brand-link">
          <div className="w-9 h-9 rounded-lg bg-[var(--s2d-red)] grid place-items-center text-white font-display font-black text-lg">S</div>
          <div className="leading-tight">
            <div className="font-display font-extrabold text-[15px] tracking-tight">Safe2Drive</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--s2d-muted)]">Online BDE · Ontario</div>
          </div>
        </Link>

        <div className="max-w-md w-full mx-auto my-auto fade-up">
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-red)] mb-3">Get started</div>
          <h1 className="font-display font-black text-4xl md:text-5xl tracking-tight leading-[1.02]">Create your account.</h1>
          <p className="mt-3 text-[var(--s2d-muted)]">Begin your 20 hours of MTO-approved BDE in minutes.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" data-testid="register-form">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--s2d-muted)] mb-2">Full name</label>
              <input type="text" required className="input-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="Muhammad Mustafa" data-testid="register-name-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--s2d-muted)] mb-2">Email</label>
              <input type="email" required className="input-base" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" data-testid="register-email-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--s2d-muted)] mb-2">Password</label>
              <div className="relative">
                <input type={show ? "text" : "password"} required minLength={6} className="input-base pr-12" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" data-testid="register-password-input" />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-black/5" data-testid="register-toggle-password">
                  {show ? <EyeOff className="w-4 h-4 text-[var(--s2d-muted)]" /> : <Eye className="w-4 h-4 text-[var(--s2d-muted)]" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-[var(--s2d-red)] bg-red-50 border border-red-100 rounded-lg px-3 py-2" data-testid="register-error">{error}</div>
            )}

            <button type="submit" disabled={busy} className="btn-red w-full py-3.5 rounded-xl font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="register-submit-btn">
              {busy ? "Creating account…" : "Create account"} {!busy && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-6 text-sm text-[var(--s2d-muted)]">
            Already a student?{" "}
            <Link to="/login" className="text-[var(--s2d-ink)] underline underline-offset-4 hover:text-[var(--s2d-red)]" data-testid="register-go-login">Log in</Link>
          </p>
        </div>
      </div>

      <div className="relative hidden lg:block bg-[var(--s2d-ink)] grain overflow-hidden order-1 lg:order-2">
        <img
          src="https://images.unsplash.com/photo-1611448746128-7c39e03b71e4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxkcml2ZXIlMjBoYW5kcyUyMG9uJTIwc3RlZXJpbmclMjB3aGVlbCUyMHN1bnNldHxlbnwwfHx8fDE3ODA5MDM1MDJ8MA&ixlib=rb-4.1.0&q=85"
          alt="Driving"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="relative z-10 h-full flex flex-col justify-end p-14 text-white">
          <div className="text-xs uppercase tracking-[0.2em] opacity-80">8 modules · 20 hours</div>
          <h2 className="font-display font-black text-5xl tracking-tight mt-2 leading-[1]">Drive smart.<br />Save more.</h2>
          <p className="text-white/70 mt-3 max-w-md">MTO certification, insurance discount, and a faster G2 — all from your couch.</p>
        </div>
      </div>
    </div>
  );
}
