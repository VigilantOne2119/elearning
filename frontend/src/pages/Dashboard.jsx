import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import ProgressRing from "@/components/ProgressRing";
import api from "@/lib/api";
import { ArrowRight, Clock, BookOpen, GraduationCap, Trophy, PlayCircle } from "lucide-react";

function fmtHrs(seconds) {
  const h = seconds / 3600;
  if (h < 1) return `${(h).toFixed(2)} hrs`;
  return `${h.toFixed(1)} hrs`;
}
function fmtMMSS(seconds) {
  const totalMin = Math.floor(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = (totalMin % 60).toString().padStart(2, "0");
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, m] = await Promise.all([api.get("/dashboard"), api.get("/modules")]);
        setStats(s.data);
        setModules(m.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !stats) {
    return (
      <AppLayout>
        <div className="h-[60vh] grid place-items-center">
          <div className="h-10 w-10 border-2 border-black/10 border-t-[var(--s2d-red)] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const remainingPct = Math.round((stats.remaining_today_seconds / stats.daily_max_seconds) * 100);
  const mtoPct = Math.round((stats.total_watched_seconds / stats.mto_required_seconds) * 100);

  return (
    <AppLayout>
      <div className="space-y-8 fade-up" data-testid="student-dashboard">
        {/* Hero greeting */}
        <section className="relative overflow-hidden rounded-[26px] bg-[var(--s2d-ink)] text-white p-8 md:p-12 grain">
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.2em] opacity-80">Welcome back</div>
              <h1 className="font-display font-black text-4xl md:text-6xl tracking-tight leading-[0.95] mt-1" data-testid="dashboard-greeting">
                Hello, <span className="text-[var(--s2d-red)]">{stats.user.name.split(" ")[0]}.</span>
              </h1>
              <p className="text-white/70 mt-3 max-w-md">You&apos;re {stats.course_progress_pct}% through your MTO-approved BDE. Keep the streak going.</p>
            </div>
            <div className="flex items-center gap-3">
              {stats.last_activity ? (
                <Link to={`/modules/${stats.last_activity.module_id}`} className="btn-red px-5 py-3 rounded-xl font-semibold inline-flex items-center gap-2" data-testid="dashboard-continue-btn">
                  Continue learning <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link to="/courses" className="btn-red px-5 py-3 rounded-xl font-semibold inline-flex items-center gap-2" data-testid="dashboard-start-btn">
                  Start your course <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Stat grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="ink-card p-6 flex items-center justify-between" data-testid="stat-course-progress">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-muted)]">Course progress</div>
              <div className="font-display font-extrabold text-4xl mt-2">{stats.course_progress_pct}%</div>
              <div className="text-xs text-[var(--s2d-muted)] mt-1">{stats.modules_completed}/{stats.total_modules} modules complete</div>
            </div>
            <ProgressRing value={stats.course_progress_pct} size={96} stroke={9} />
          </div>

          <div className="ink-card p-6 flex items-center justify-between" data-testid="stat-remaining-today">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-muted)]">Remaining today</div>
              <div className="font-display font-extrabold text-4xl mt-2 font-mono">{fmtMMSS(stats.remaining_today_seconds)}</div>
              <div className="text-xs text-[var(--s2d-muted)] mt-1">Max 5 hrs / day</div>
            </div>
            <ProgressRing value={remainingPct} size={96} stroke={9} color="#111111" label="" sublabel="" />
          </div>

          <div className="ink-card p-6 flex items-center justify-between" data-testid="stat-watched-time">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-muted)]">Total watched</div>
              <div className="font-display font-extrabold text-4xl mt-2">{fmtHrs(stats.total_watched_seconds)}</div>
              <div className="text-xs text-[var(--s2d-muted)] mt-1">of 20 hrs MTO requirement</div>
            </div>
            <ProgressRing value={Math.min(100, mtoPct)} size={96} stroke={9} color="#10B981" />
          </div>

          <div className="ink-card p-6 flex items-center justify-between" data-testid="stat-total-score">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-muted)]">Total score</div>
              <div className="font-display font-extrabold text-4xl mt-2">{stats.total_score_pct}%</div>
              <div className="text-xs text-[var(--s2d-muted)] mt-1">Avg across quizzes</div>
            </div>
            <Trophy className="w-9 h-9 text-[var(--s2d-red)]" />
          </div>
        </section>

        {/* Quick access cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link to="/courses" className="ink-card p-7 group" data-testid="quick-link-course">
            <BookOpen className="w-8 h-8 text-[var(--s2d-red)]" />
            <div className="mt-4 font-display font-bold text-xl">Continue Course</div>
            <p className="text-sm text-[var(--s2d-muted)] mt-1">Jump into the 8-module Ontario MTO BDE curriculum.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold group-hover:text-[var(--s2d-red)] transition">Open course <ArrowRight className="w-4 h-4" /></span>
          </Link>
          <Link to="/quizzes" className="ink-card p-7 group" data-testid="quick-link-quizzes">
            <GraduationCap className="w-8 h-8 text-[var(--s2d-red)]" />
            <div className="mt-4 font-display font-bold text-xl">Quizzes & Final Test</div>
            <p className="text-sm text-[var(--s2d-muted)] mt-1">Test what you&apos;ve learned. Pass at 80% to unlock the next module.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold group-hover:text-[var(--s2d-red)] transition">Go to quizzes <ArrowRight className="w-4 h-4" /></span>
          </Link>
          <Link to="/homework" className="ink-card p-7 group" data-testid="quick-link-homework">
            <Clock className="w-8 h-8 text-[var(--s2d-red)]" />
            <div className="mt-4 font-display font-bold text-xl">Homework</div>
            <p className="text-sm text-[var(--s2d-muted)] mt-1">Reinforce module concepts with optional Homelink assignments.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold group-hover:text-[var(--s2d-red)] transition">View homework <ArrowRight className="w-4 h-4" /></span>
          </Link>
        </section>

        {/* Recent modules */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-black text-2xl tracking-tight">Pick up a module</h2>
            <Link to="/courses" className="text-sm font-semibold hover:text-[var(--s2d-red)] transition inline-flex items-center gap-1" data-testid="see-all-modules-link">
              See all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {modules.slice(0, 4).map((m) => (
              <Link to={`/modules/${m.id}`} key={m.id} className="module-card block" data-testid={`recent-module-${m.id}`}>
                <div className="aspect-[3/4] relative">
                  <img src={m.image_url} alt={m.title} className="absolute inset-0 w-full h-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-mono tracking-widest text-white uppercase">
                    Module 0{m.id}
                  </div>
                  <div className="absolute inset-x-4 bottom-4 text-white">
                    <div className="font-display font-bold text-lg leading-tight">{m.title}</div>
                    <div className="mt-2 h-1 rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full bg-[var(--s2d-red)] progress-fill" style={{ width: `${m.progress_pct}%` }} />
                    </div>
                    <div className="mt-1.5 text-[11px] font-mono opacity-90 flex items-center justify-between">
                      <span>{m.progress_pct}% complete</span>
                      <PlayCircle className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
