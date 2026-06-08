import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import api from "@/lib/api";
import { ChevronLeft, ChevronRight, RotateCcw, Volume2, VolumeX, Play, Pause, ArrowLeft, BookOpen, ListChecks, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ModuleViewer() {
  const { id } = useParams();
  const moduleId = parseInt(id, 10);
  const navigate = useNavigate();
  const [moduleData, setModuleData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [savingProgress, setSavingProgress] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const tickRef = useRef(null);

  const load = async () => {
    const { data } = await api.get(`/modules/${moduleId}`);
    setModuleData(data);
    if (data.progress?.last_slide_id) {
      const i = data.slides.findIndex((s) => s.id === data.progress.last_slide_id);
      if (i >= 0) setIdx(i);
    }
  };

  useEffect(() => {
    load();
  }, [moduleId]);

  useEffect(() => {
    if (!playing) return;
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(tickRef.current);
  }, [playing, idx]);

  const saveSlideProgress = async () => {
    if (!moduleData) return;
    setSavingProgress(true);
    try {
      await api.post("/progress/slide", {
        module_id: moduleId,
        slide_id: moduleData.slides[idx].id,
        seconds: seconds,
      });
      setSeconds(0);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingProgress(false);
    }
  };

  const next = async () => {
    await saveSlideProgress();
    if (idx < (moduleData?.slides.length || 0) - 1) setIdx(idx + 1);
    else { await load(); setShowQuiz(true); }
  };
  const prev = async () => {
    await saveSlideProgress();
    if (idx > 0) setIdx(idx - 1);
  };

  if (!moduleData) {
    return (
      <AppLayout>
        <div className="h-[60vh] grid place-items-center">
          <div className="h-10 w-10 border-2 border-black/10 border-t-[var(--s2d-red)] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const slide = moduleData.slides[idx];
  const totalSlides = moduleData.slides.length;
  const progressPct = Math.round(((idx + 1) / totalSlides) * 100);

  return (
    <AppLayout>
      <div className="space-y-6 fade-up" data-testid="module-viewer">
        <div className="flex items-center justify-between">
          <Link to="/courses" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-[var(--s2d-red)] transition" data-testid="back-to-courses-link">
            <ArrowLeft className="w-4 h-4" /> Back to course
          </Link>
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-muted)]">
            Module {moduleData.id} · Slide {idx + 1}/{totalSlides}
          </div>
        </div>

        <header>
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-red)]">Module 0{moduleData.id}</div>
          <h1 className="font-display font-black text-4xl md:text-5xl tracking-tight mt-1">{moduleData.title}</h1>
          <p className="text-[var(--s2d-muted)] mt-1">{moduleData.subtitle}</p>
        </header>

        {/* Slide stage */}
        <div className="relative rounded-[24px] overflow-hidden border border-black/10 slide-stage" data-testid="slide-stage">
          {/* Top progress bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-white/10 z-20">
            <div className="h-full bg-[var(--s2d-red)] transition-all" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Slide content (white card on dark stage) */}
          <div className="px-6 md:px-12 py-10 md:py-16 min-h-[420px] flex">
            <div className="bg-white text-[var(--s2d-ink)] rounded-2xl w-full p-8 md:p-12 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-[var(--s2d-red)] grid place-items-center text-white font-display font-black text-sm">S</div>
                  <div className="leading-tight">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--s2d-muted)]">Safe2Drive Ontario</div>
                    <div className="text-[11px] font-mono">Module {moduleData.id} · Slide {idx + 1}</div>
                  </div>
                </div>
                <button className="text-xs text-[var(--s2d-muted)] hover:text-[var(--s2d-red)] inline-flex items-center gap-1.5" data-testid="resources-btn">
                  <BookOpen className="w-3.5 h-3.5" /> Resources
                </button>
              </div>
              <h2 className="font-display font-black text-3xl md:text-4xl tracking-tight">{slide.title}</h2>
              <p className="mt-5 text-[var(--s2d-ink-soft)] leading-relaxed text-[1.02rem] md:text-lg max-w-3xl">
                {slide.body}
              </p>
              <div className="mt-8 inline-flex items-center gap-2 text-xs text-[var(--s2d-muted)] font-mono uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--s2d-red)]" />
                Content placeholder. Your instructor will replace this with the full MTO lesson.
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-black/40 backdrop-blur border-t border-white/10 px-4 md:px-6 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <button onClick={() => setMuted((v) => !v)} className="p-2 rounded-lg hover:bg-white/10" data-testid="audio-toggle-btn" aria-label="Toggle audio">
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button onClick={() => setPlaying((v) => !v)} className="p-2 rounded-lg hover:bg-white/10" data-testid="play-toggle-btn" aria-label="Play / Pause">
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={() => setSeconds(0)} className="p-2 rounded-lg hover:bg-white/10" data-testid="restart-btn" aria-label="Restart">
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="ml-3 text-xs font-mono tracking-wider opacity-80">
                {Math.floor(seconds / 60).toString().padStart(2, "0")}:{(seconds % 60).toString().padStart(2, "0")} on this slide
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={prev} disabled={idx === 0 || savingProgress} className="px-3 py-2 rounded-lg hover:bg-white/10 disabled:opacity-40 inline-flex items-center gap-1.5 text-sm" data-testid="prev-slide-btn">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button onClick={next} disabled={savingProgress} className="btn-red px-4 py-2 rounded-lg inline-flex items-center gap-1.5 text-sm font-semibold" data-testid="next-slide-btn">
                {idx === totalSlides - 1 ? "Take Quiz" : "Next"} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Slide list */}
        <section className="ink-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Module contents</h3>
            <div className="text-xs font-mono text-[var(--s2d-muted)]">{moduleData.progress?.watched_slide_ids?.length || 0}/{totalSlides} watched</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="slide-list">
            {moduleData.slides.map((s, i) => {
              const watched = moduleData.progress?.watched_slide_ids?.includes(s.id);
              const active = i === idx;
              return (
                <button
                  key={s.id}
                  onClick={async () => { await saveSlideProgress(); setIdx(i); }}
                  className={`text-left p-3 rounded-xl border transition ${active ? "border-[var(--s2d-red)] bg-red-50/40" : "border-black/10 hover:bg-[var(--s2d-surface)]"}`}
                  data-testid={`slide-thumb-${i}`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--s2d-muted)]">
                    <span>Slide {i + 1}</span>
                    {watched && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                  <div className="mt-1 text-sm font-semibold leading-snug line-clamp-2">{s.title}</div>
                </button>
              );
            })}
          </div>
        </section>

        {showQuiz && (
          <QuizPanel module={moduleData} onClose={() => setShowQuiz(false)} onSubmitted={load} />
        )}

        {!showQuiz && (
          <button onClick={() => setShowQuiz(true)} className="ink-card p-5 w-full flex items-center justify-between text-left hover:border-[var(--s2d-red)]" data-testid="open-quiz-btn">
            <div className="flex items-center gap-3">
              <ListChecks className="w-5 h-5 text-[var(--s2d-red)]" />
              <div>
                <div className="font-display font-bold">Module {moduleData.id} Quiz</div>
                <div className="text-xs text-[var(--s2d-muted)]">{moduleData.quiz.length} questions · 80% to pass</div>
              </div>
            </div>
            <div className="text-sm font-semibold text-[var(--s2d-red)]">Open quiz →</div>
          </button>
        )}
      </div>
    </AppLayout>
  );
}

function QuizPanel({ module, onClose, onSubmitted }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (Object.keys(answers).length !== module.quiz.length) {
      toast.error("Please answer every question.");
      return;
    }
    setSubmitting(true);
    try {
      const ordered = module.quiz.map((q) => answers[q.id]);
      const { data } = await api.post("/progress/quiz", {
        module_id: module.id,
        answers: ordered,
      });
      setResult(data);
      if (data.passed) toast.success(`Passed! ${data.score_pct}%`);
      else toast.error(`Score: ${data.score_pct}%. 80% required to pass.`);
      onSubmitted?.();
    } catch (e) {
      toast.error("Could not submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="ink-card p-7" data-testid="quiz-panel">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-red)]">Module {module.id} · Quiz</div>
          <h3 className="font-display font-black text-2xl tracking-tight mt-1">Test what you&apos;ve learned</h3>
        </div>
        <button onClick={onClose} className="text-sm text-[var(--s2d-muted)] hover:text-[var(--s2d-red)]" data-testid="close-quiz-btn">Close</button>
      </div>

      <div className="space-y-5">
        {module.quiz.map((q, qi) => (
          <div key={q.id} data-testid={`quiz-q-${qi}`}>
            <div className="text-xs font-mono text-[var(--s2d-muted)] mb-2">Q{qi + 1}</div>
            <div className="font-semibold mb-3">{q.question}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() => !result && setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className={`text-left px-4 py-3 rounded-xl border text-sm transition ${selected ? "border-[var(--s2d-red)] bg-red-50/40" : "border-black/10 hover:bg-[var(--s2d-surface)]"}`}
                    data-testid={`quiz-q-${qi}-opt-${oi}`}
                  >
                    <span className="font-mono text-[11px] text-[var(--s2d-muted)] mr-2">{String.fromCharCode(65 + oi)}</span>{opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {result ? (
        <div className={`mt-6 p-5 rounded-xl border ${result.passed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`} data-testid="quiz-result">
          <div className="text-sm font-mono uppercase tracking-wider opacity-70">Result</div>
          <div className="font-display font-black text-3xl mt-1">{result.score_pct}% · {result.passed ? "Passed" : "Try again"}</div>
          <div className="text-sm text-[var(--s2d-muted)] mt-1">{result.correct} / {result.total} correct</div>
          <button onClick={onClose} className="mt-4 btn-red px-4 py-2.5 rounded-xl font-semibold text-sm">Done</button>
        </div>
      ) : (
        <button onClick={submit} disabled={submitting} className="mt-6 btn-red px-5 py-3 rounded-xl font-semibold inline-flex items-center gap-2 disabled:opacity-60" data-testid="submit-quiz-btn">
          {submitting ? "Submitting…" : "Submit answers"}
        </button>
      )}
    </section>
  );
}
