import React, { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Users, GraduationCap, BookCheck, Clock, UserPlus, KeyRound, Trash2, Copy, X, Check, Mail, History, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function fmtHrs(seconds) {
  const h = seconds / 3600;
  return `${h.toFixed(1)} hrs`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);
  const [credModal, setCredModal] = useState(null); // { name, email, temp_password, intro }
  const [snapshotsFor, setSnapshotsFor] = useState(null); // student object

  const load = async () => {
    const [s, l] = await Promise.all([api.get("/admin/stats"), api.get("/admin/students")]);
    setStats(s.data);
    setStudents(l.data);
  };

  useEffect(() => {
    (async () => { await load(); setLoading(false); })();
  }, []);

  const resetPassword = async (student) => {
    if (!window.confirm(`Reset password for ${student.name}? They will be required to set a new one on next login.`)) return;
    try {
      const { data } = await api.post(`/admin/students/${student.id}/reset-password`);
      setCredModal({ name: data.name, email: data.email, temp_password: data.temp_password, intro: "New temporary password generated." });
      await load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Reset failed");
    }
  };

  const removeStudent = async (student) => {
    if (!window.confirm(`Permanently delete ${student.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/students/${student.id}`);
      toast.success(`${student.name} removed.`);
      await load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Delete failed");
    }
  };

  if (loading || !stats) {
    return (
      <AppLayout>
        <div className="h-[40vh] grid place-items-center">
          <div className="h-10 w-10 border-2 border-black/10 border-t-[var(--s2d-red)] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 fade-up" data-testid="admin-dashboard">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-red)] mb-2">Admin · Safe2Drive Ontario</div>
            <h1 className="font-display font-black text-4xl md:text-5xl tracking-tight">Operations console</h1>
            <p className="text-[var(--s2d-muted)] mt-2">Enroll new students and track progress across all 8 MTO modules.</p>
          </div>
          <button onClick={() => setShowEnroll(true)} className="btn-red px-5 py-3 rounded-xl font-semibold inline-flex items-center gap-2" data-testid="open-enroll-btn">
            <UserPlus className="w-4 h-4" /> Enroll student
          </button>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-5 gap-5">
          <div className="ink-card p-6" data-testid="admin-stat-students">
            <Users className="w-7 h-7 text-[var(--s2d-red)]" />
            <div className="font-display font-extrabold text-4xl mt-3">{stats.total_students}</div>
            <div className="text-xs uppercase tracking-widest text-[var(--s2d-muted)] mt-1">Active students</div>
          </div>
          <div className="ink-card p-6" data-testid="admin-stat-records">
            <GraduationCap className="w-7 h-7 text-[var(--s2d-red)]" />
            <div className="font-display font-extrabold text-4xl mt-3">{stats.total_progress_records}</div>
            <div className="text-xs uppercase tracking-widest text-[var(--s2d-muted)] mt-1">Progress records</div>
          </div>
          <div className="ink-card p-6" data-testid="admin-stat-completed">
            <BookCheck className="w-7 h-7 text-[var(--s2d-red)]" />
            <div className="font-display font-extrabold text-4xl mt-3">{stats.total_modules_completed}</div>
            <div className="text-xs uppercase tracking-widest text-[var(--s2d-muted)] mt-1">Modules completed</div>
          </div>
          <div className="ink-card p-6" data-testid="admin-stat-snapshots">
            <History className="w-7 h-7 text-[var(--s2d-red)]" />
            <div className="font-display font-extrabold text-4xl mt-3">{stats.total_snapshots ?? 0}</div>
            <div className="text-xs uppercase tracking-widest text-[var(--s2d-muted)] mt-1">Cloud snapshots</div>
          </div>
          <div className="ink-card p-6" data-testid="admin-stat-avg">
            <Clock className="w-7 h-7 text-[var(--s2d-red)]" />
            <div className="font-display font-extrabold text-4xl mt-3">
              {students.length ? fmtHrs(students.reduce((acc, s) => acc + s.watched_seconds, 0) / students.length) : "0.0 hrs"}
            </div>
            <div className="text-xs uppercase tracking-widest text-[var(--s2d-muted)] mt-1">Avg time / student</div>
          </div>
        </section>

        <section className="ink-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-black/5">
            <h2 className="font-display font-bold text-xl">Students</h2>
            <div className="text-xs font-mono text-[var(--s2d-muted)]">{students.length} total</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-students-table">
              <thead className="text-[10px] uppercase tracking-widest text-[var(--s2d-muted)] bg-[var(--s2d-surface)]">
                <tr>
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">Email</th>
                  <th className="text-left px-6 py-3">Joined</th>
                  <th className="text-left px-6 py-3">Watched</th>
                  <th className="text-left px-6 py-3">Modules</th>
                  <th className="text-left px-6 py-3">Progress</th>
                  <th className="text-right px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 && (
                  <tr><td colSpan="7" className="px-6 py-10 text-center text-[var(--s2d-muted)]">No students yet. Enroll one above.</td></tr>
                )}
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-black/5 hover:bg-[var(--s2d-surface)]/40" data-testid={`admin-student-row-${s.id}`}>
                    <td className="px-6 py-4 font-semibold flex items-center gap-2">
                      {s.name}
                      {s.must_change_password && <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">First login</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{s.email}</td>
                    <td className="px-6 py-4 text-xs text-[var(--s2d-muted)]">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-mono">{fmtHrs(s.watched_seconds)}</td>
                    <td className="px-6 py-4 font-mono">{s.modules_completed}/{s.total_modules}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <div className="flex-1 h-1.5 rounded-full bg-black/10 overflow-hidden">
                          <div className="h-full bg-[var(--s2d-red)]" style={{ width: `${s.course_progress_pct}%` }} />
                        </div>
                        <div className="text-xs font-mono w-9 text-right">{s.course_progress_pct}%</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSnapshotsFor(s)} className="p-2 rounded-lg hover:bg-black/5" title="View progress snapshots" data-testid={`snapshots-${s.id}`}>
                          <History className="w-4 h-4 text-[var(--s2d-muted)] hover:text-[var(--s2d-ink)]" />
                        </button>
                        <button onClick={() => resetPassword(s)} className="p-2 rounded-lg hover:bg-black/5" title="Reset password" data-testid={`reset-pw-${s.id}`}>
                          <KeyRound className="w-4 h-4 text-[var(--s2d-muted)] hover:text-[var(--s2d-ink)]" />
                        </button>
                        <button onClick={() => removeStudent(s)} className="p-2 rounded-lg hover:bg-red-50" title="Delete student" data-testid={`delete-${s.id}`}>
                          <Trash2 className="w-4 h-4 text-[var(--s2d-muted)] hover:text-[var(--s2d-red)]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showEnroll && (
        <EnrollModal
          onClose={() => setShowEnroll(false)}
          onEnrolled={(cred) => { setShowEnroll(false); setCredModal({ ...cred, intro: "Student enrolled. Share these credentials securely." }); load(); }}
        />
      )}

      {credModal && <CredentialsModal data={credModal} onClose={() => setCredModal(null)} />}
      {snapshotsFor && (
        <SnapshotsModal
          student={snapshotsFor}
          onClose={() => setSnapshotsFor(null)}
          onAfterRestore={load}
        />
      )}
    </AppLayout>
  );
}

function EnrollModal({ onClose, onEnrolled }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const { data } = await api.post("/admin/enroll", { name: name.trim(), email: email.trim() });
      toast.success(`${data.name} enrolled.`);
      onEnrolled(data);
    } catch (err) {
      const msg = formatApiErrorDetail(err.response?.data?.detail) || err.message;
      setError(msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-7 relative" onClick={(e) => e.stopPropagation()} data-testid="enroll-modal">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-black/5"><X className="w-4 h-4" /></button>
        <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-red)]">New enrollment</div>
        <h2 className="font-display font-black text-2xl tracking-tight mt-1">Enroll a student</h2>
        <p className="text-sm text-[var(--s2d-muted)] mt-1">A temporary password is generated automatically. Share it with the student, and they&apos;ll be required to change it on first login.</p>
        <form onSubmit={submit} className="mt-5 space-y-4" data-testid="enroll-form">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--s2d-muted)] mb-2">Full name</label>
            <input required className="input-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" data-testid="enroll-name-input" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--s2d-muted)] mb-2">Email</label>
            <input type="email" required className="input-base" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@email.com" data-testid="enroll-email-input" />
          </div>
          {error && <div className="text-sm text-[var(--s2d-red)] bg-red-50 border border-red-100 rounded-lg px-3 py-2" data-testid="enroll-error">{error}</div>}
          <button type="submit" disabled={busy} className="btn-red w-full py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="enroll-submit-btn">
            <UserPlus className="w-4 h-4" />
            {busy ? "Enrolling…" : "Enroll student"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CredentialsModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = `Login: ${data.email}\nTemporary password: ${data.temp_password}\n\nLog in at: ${window.location.origin}/login`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { toast.error("Copy failed"); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl max-w-md w-full p-7 relative" data-testid="credentials-modal">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-black/5"><X className="w-4 h-4" /></button>
        <div className="text-xs font-mono uppercase tracking-widest text-emerald-600 inline-flex items-center gap-1.5"><Check className="w-3 h-3" /> Success</div>
        <h2 className="font-display font-black text-2xl tracking-tight mt-1">{data.name}</h2>
        <p className="text-sm text-[var(--s2d-muted)] mt-1">{data.intro}</p>

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 inline-flex items-start gap-2">
          <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Email integration is not yet configured. Copy these credentials and send them to the student manually.</span>
        </div>

        <div className="mt-4 rounded-xl bg-[var(--s2d-ink)] text-white p-4 font-mono text-sm" data-testid="credentials-display">
          <div className="text-[10px] uppercase tracking-widest opacity-70">Email</div>
          <div className="break-all">{data.email}</div>
          <div className="text-[10px] uppercase tracking-widest opacity-70 mt-3">Temporary password</div>
          <div className="font-bold tracking-wider">{data.temp_password}</div>
        </div>

        <button onClick={copy} className="mt-4 btn-red w-full py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2" data-testid="copy-credentials-btn">
          {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy credentials</>}
        </button>
      </div>
    </div>
  );
}


function reasonBadge(reason) {
  const map = {
    login: { label: "Session login", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    quiz: { label: "Quiz submitted", cls: "bg-purple-50 text-purple-700 border-purple-200" },
    module_complete: { label: "Module complete", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    homework: { label: "Homework", cls: "bg-amber-50 text-amber-800 border-amber-200" },
    manual: { label: "Manual backup", cls: "bg-zinc-100 text-zinc-700 border-zinc-200" },
    pre_restore: { label: "Pre-restore safety", cls: "bg-red-50 text-[var(--s2d-red)] border-red-200" },
  };
  const r = map[reason] || { label: reason, cls: "bg-zinc-100 text-zinc-700 border-zinc-200" };
  return (
    <span className={`inline-flex items-center text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${r.cls}`}>
      {r.label}
    </span>
  );
}

function fmtWhen(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function SnapshotsModal({ student, onClose, onAfterRestore }) {
  const [snaps, setSnaps] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const load = async () => {
    const { data } = await api.get(`/admin/students/${student.id}/snapshots`);
    setSnaps(data.snapshots || []);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await api.get(`/admin/students/${student.id}/snapshots`);
      if (active) setSnaps(data.snapshots || []);
    })();
    return () => { active = false; };
  }, [student.id]);

  const createManual = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/students/${student.id}/snapshots`, { note: note.trim() });
      toast.success("Snapshot saved.");
      setNote("");
      await load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed to create snapshot");
    } finally { setBusy(false); }
  };

  const restore = async (snap) => {
    const when = fmtWhen(snap.taken_at);
    if (!window.confirm(`Restore ${student.name}'s progress to ${when}? A safety snapshot of their current state will be taken automatically.`)) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/students/${student.id}/restore/${snap.id}`);
      toast.success(`Restored ${data.modules_restored} progress record(s).`);
      await load();
      onAfterRestore?.();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Restore failed");
    } finally { setBusy(false); }
  };

  const removeSnap = async (snap) => {
    if (!window.confirm("Delete this snapshot? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/students/${student.id}/snapshots/${snap.id}`);
      await load();
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-5" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
        data-testid="snapshots-modal"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-black/5 z-10"><X className="w-4 h-4" /></button>

        <div className="p-7 pb-5 border-b border-black/5">
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-red)] inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" /> Cloud progress backups
          </div>
          <h2 className="font-display font-black text-2xl tracking-tight mt-1">{student.name}</h2>
          <p className="text-sm text-[var(--s2d-muted)] mt-1">
            Auto-backed on login (max once per 6 h), on every quiz, module completion, and homework. Manual backups always preserved. Last 10 kept; safety snapshots before a restore are never pruned.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (e.g. 'Before mid-term review')"
              className="input-base flex-1"
              data-testid="snapshot-note-input"
              maxLength={300}
            />
            <button
              onClick={createManual}
              disabled={busy}
              className="btn-red px-5 py-3 rounded-xl font-semibold inline-flex items-center gap-2 disabled:opacity-60"
              data-testid="create-snapshot-btn"
            >
              <Save className="w-4 h-4" /> Save snapshot
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-7 py-5">
          {snaps === null ? (
            <div className="h-32 grid place-items-center">
              <div className="h-8 w-8 border-2 border-black/10 border-t-[var(--s2d-red)] rounded-full animate-spin" />
            </div>
          ) : snaps.length === 0 ? (
            <div className="text-center text-sm text-[var(--s2d-muted)] py-8" data-testid="snapshots-empty">
              No snapshots yet. They&apos;ll appear here automatically as the student progresses.
            </div>
          ) : (
            <ol className="space-y-3" data-testid="snapshots-list">
              {snaps.map((s) => (
                <li key={s.id} className="rounded-xl border border-black/5 p-4 flex items-start gap-3 hover:border-black/15 transition" data-testid={`snapshot-row-${s.id}`}>
                  <div className="mt-1 w-8 h-8 rounded-lg bg-[var(--s2d-surface)] grid place-items-center shrink-0">
                    <History className="w-4 h-4 text-[var(--s2d-ink)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-sm">{fmtWhen(s.taken_at)}</div>
                      {reasonBadge(s.reason)}
                    </div>
                    <div className="text-xs text-[var(--s2d-muted)] mt-1 font-mono">
                      {s.modules_completed}/{s.total_modules} modules · {(s.total_watched_seconds / 3600).toFixed(1)} hrs · {s.course_progress_pct}% complete
                    </div>
                    {s.note && (
                      <div className="text-xs text-[var(--s2d-ink)] mt-2 italic">&ldquo;{s.note}&rdquo;</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => restore(s)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--s2d-ink)] text-white text-xs font-semibold hover:bg-[var(--s2d-ink-soft)] disabled:opacity-50"
                      data-testid={`restore-snapshot-${s.id}`}
                    >
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                    <button
                      onClick={() => removeSnap(s)}
                      className="p-2 rounded-lg hover:bg-red-50"
                      title="Delete snapshot"
                      data-testid={`delete-snapshot-${s.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[var(--s2d-muted)] hover:text-[var(--s2d-red)]" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
