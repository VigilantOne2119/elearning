import React, { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import api from "@/lib/api";
import { Users, GraduationCap, BookCheck, Clock } from "lucide-react";

function fmtHrs(seconds) {
  const h = seconds / 3600;
  return `${h.toFixed(1)} hrs`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, l] = await Promise.all([api.get("/admin/stats"), api.get("/admin/students")]);
        setStats(s.data);
        setStudents(l.data);
      } finally { setLoading(false); }
    })();
  }, []);

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
        <header>
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-red)] mb-2">Admin · Safe2Drive Ontario</div>
          <h1 className="font-display font-black text-4xl md:text-5xl tracking-tight">Operations console</h1>
          <p className="text-[var(--s2d-muted)] mt-2">Track student progress across all 8 MTO modules.</p>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
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
                </tr>
              </thead>
              <tbody>
                {students.length === 0 && (
                  <tr><td colSpan="6" className="px-6 py-10 text-center text-[var(--s2d-muted)]">No students yet.</td></tr>
                )}
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-black/5 hover:bg-[var(--s2d-surface)]/40" data-testid={`admin-student-row-${s.id}`}>
                    <td className="px-6 py-4 font-semibold">{s.name}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
