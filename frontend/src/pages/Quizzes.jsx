import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import ProgressRing from "@/components/ProgressRing";
import api from "@/lib/api";
import { Trophy, Lock, CheckCircle2 } from "lucide-react";

export default function Quizzes() {
  const [modules, setModules] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [m, s] = await Promise.all([api.get("/modules"), api.get("/dashboard")]);
        setModules(m.data);
        setStats(s.data);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
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
      <div className="space-y-8 fade-up" data-testid="quizzes-page">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-red)] mb-2">Module quizzes · Final test</div>
            <h1 className="font-display font-black text-4xl md:text-5xl tracking-tight">Quiz</h1>
            <p className="text-[var(--s2d-muted)] mt-2 max-w-xl">Each module includes a short quiz. Score 80% or higher to mark it complete. Your final test unlocks once all modules are passed.</p>
          </div>
        </header>

        <section className="grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-9">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {modules.map((m) => {
                const status = m.quiz_attempted ? (m.quiz_passed ? "passed" : "attempted") : "unattempted";
                const eligible = m.progress_pct >= 0; // always eligible in MVP framework
                return (
                  <div key={m.id} className="ink-card p-5 flex flex-col gap-3" data-testid={`quiz-card-${m.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--s2d-muted)]">Module {m.id}</div>
                      {!eligible && <Lock className="w-3.5 h-3.5 text-[var(--s2d-muted)]" />}
                      {m.quiz_passed && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div className="font-display font-bold text-base leading-tight">{m.title}</div>
                    <div className="flex items-center justify-center py-2">
                      <ProgressRing
                        value={m.quiz_score_pct || 0}
                        size={84}
                        stroke={8}
                        color={m.quiz_passed ? "#10B981" : "#E60000"}
                        label={m.quiz_attempted ? `${m.quiz_score_pct}%` : "-"}
                      />
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-center">
                      {status === "passed" && <span className="text-emerald-600">Passed</span>}
                      {status === "attempted" && <span className="text-[var(--s2d-red)]">Retake</span>}
                      {status === "unattempted" && <span className="text-[var(--s2d-muted)]">Unattempted</span>}
                    </div>
                    <Link to={`/modules/${m.id}`} className="mt-auto text-center text-sm font-semibold py-2 rounded-lg bg-[var(--s2d-ink)] text-white hover:bg-black transition" data-testid={`quiz-open-${m.id}`}>
                      Open
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="col-span-12 lg:col-span-3 space-y-4">
            <div className="ink-card p-6 flex flex-col items-center text-center" data-testid="final-test-card">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--s2d-muted)]">Final test</div>
              <h3 className="font-display font-bold text-xl mt-1">Certificate exam</h3>
              <div className="my-3">
                <ProgressRing value={stats?.final_test_pct || 0} size={120} stroke={10} color="#E60000" />
              </div>
              <p className="text-xs text-[var(--s2d-muted)]">Unlocks once all 8 modules are completed.</p>
              <button disabled className="mt-4 w-full text-sm py-2.5 rounded-xl bg-[var(--s2d-surface)] text-[var(--s2d-muted)] font-semibold cursor-not-allowed inline-flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5" /> Locked
              </button>
            </div>

            <div className="ink-card p-6" data-testid="total-score-card">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--s2d-muted)]">Total score</div>
              <div className="flex items-center gap-3 mt-2">
                <Trophy className="w-7 h-7 text-[var(--s2d-red)]" />
                <div className="font-display font-black text-4xl">{stats?.total_score_pct || 0}%</div>
              </div>
              <p className="text-xs text-[var(--s2d-muted)] mt-2">Average across all attempted module quizzes.</p>
            </div>
          </aside>
        </section>
      </div>
    </AppLayout>
  );
}
