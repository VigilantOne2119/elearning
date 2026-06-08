import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import api from "@/lib/api";
import { PlayCircle, CheckCircle2, Clock } from "lucide-react";

export default function Courses() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/modules");
        setModules(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-8 fade-up" data-testid="courses-page">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-red)] mb-2">8 modules · 20 hours · MTO BDE</div>
            <h1 className="font-display font-black text-4xl md:text-5xl tracking-tight">Course</h1>
            <p className="text-[var(--s2d-muted)] mt-2 max-w-xl">Work through the curriculum at your own pace. Each module unlocks a quiz, and an 80% passing score is required to complete it.</p>
          </div>
          <div className="text-sm text-[var(--s2d-muted)] font-mono">{modules.filter(m => m.module_complete).length}/{modules.length} complete</div>
        </header>

        {loading ? (
          <div className="h-[40vh] grid place-items-center">
            <div className="h-10 w-10 border-2 border-black/10 border-t-[var(--s2d-red)] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {modules.map((m) => (
              <Link key={m.id} to={`/modules/${m.id}`} className="module-card block" data-testid={`course-card-${m.id}`}>
                <div className="aspect-[3/4] relative">
                  <img src={m.image_url} alt={m.title} className="absolute inset-0 w-full h-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-mono tracking-widest text-white uppercase">
                    Module 0{m.id}
                  </div>
                  {m.module_complete && (
                    <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-3 h-3" /> Complete
                    </div>
                  )}
                  <div className="absolute inset-x-4 bottom-4 text-white">
                    <div className="font-display font-bold text-lg leading-tight">{m.title}</div>
                    <p className="text-[12px] text-white/70 mt-1 line-clamp-2">{m.subtitle}</p>
                    <div className="mt-3 h-1 rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full bg-[var(--s2d-red)] progress-fill" style={{ width: `${m.progress_pct}%` }} />
                    </div>
                    <div className="mt-1.5 text-[11px] font-mono opacity-90 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {m.duration_minutes} min</span>
                      <span className="inline-flex items-center gap-1">{m.progress_pct}% <PlayCircle className="w-3.5 h-3.5" /></span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
