import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff, KeyRound, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function ChangePassword() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [curr, setCurr] = useState("");
  const [next, setNext] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (next.length < 6) { setError("New password must be at least 6 characters."); return; }
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/change-password", { current_password: curr, new_password: next });
      toast.success("Password updated.");
      await refresh();
      navigate("/dashboard");
    } catch (e) {
      const msg = formatApiErrorDetail(e.response?.data?.detail) || e.message;
      setError(msg);
      toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <AppLayout>
      <div className="max-w-xl fade-up" data-testid="change-password-page">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--s2d-surface)] text-[10px] font-mono uppercase tracking-widest text-[var(--s2d-red)] mb-3">
          <ShieldCheck className="w-3 h-3" /> Account security
        </div>
        <h1 className="font-display font-black text-4xl tracking-tight">Change your password</h1>
        <p className="text-[var(--s2d-muted)] mt-2">If this is your first login, set a strong new password before continuing.</p>

        <form onSubmit={submit} className="mt-8 space-y-4" data-testid="change-password-form">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--s2d-muted)] mb-2">Current password</label>
            <input type={show ? "text" : "password"} required className="input-base" value={curr} onChange={(e) => setCurr(e.target.value)} data-testid="curr-password-input" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--s2d-muted)] mb-2">New password</label>
            <div className="relative">
              <input type={show ? "text" : "password"} required minLength={6} className="input-base pr-12" value={next} onChange={(e) => setNext(e.target.value)} data-testid="new-password-input" />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-black/5">
                {show ? <EyeOff className="w-4 h-4 text-[var(--s2d-muted)]" /> : <Eye className="w-4 h-4 text-[var(--s2d-muted)]" />}
              </button>
            </div>
          </div>

          {error && <div className="text-sm text-[var(--s2d-red)] bg-red-50 border border-red-100 rounded-lg px-3 py-2" data-testid="change-password-error">{error}</div>}

          <button type="submit" disabled={busy} className="btn-red px-5 py-3 rounded-xl font-semibold inline-flex items-center gap-2 disabled:opacity-60" data-testid="change-password-submit">
            <KeyRound className="w-4 h-4" />
            {busy ? "Updating…" : "Update password"} {!busy && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
