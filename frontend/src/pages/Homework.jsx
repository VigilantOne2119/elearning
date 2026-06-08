import React, { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import api from "@/lib/api";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function Homework() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    const { data } = await api.get("/modules");
    setModules(data);
  };

  useEffect(() => {
    (async () => { await load(); setLoading(false); })();
  }, []);

  const toggleComplete = async (m) => {
    setBusyId(m.id);
    try {
      await api.post(`/homework/${m.id}/complete`);
      toast.success(`Homework marked complete. ${m.title}`);
      await load();
    } catch (e) {
      toast.error("Could not update homework");
    } finally { setBusyId(null); }
  };

  return (
    <AppLayout>
      <div className="space-y-8 fade-up" data-testid="homework-page">
        <header>
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-red)] mb-2">Homelink · 10 hours</div>
          <h1 className="font-display font-black text-4xl md:text-5xl tracking-tight">Home work</h1>
          <p className="text-[var(--s2d-muted)] mt-2 max-w-xl">Reinforce module concepts at home. Mark each assignment complete once you&apos;ve finished. Your instructor can verify completion.</p>
        </header>

        {loading ? (
          <div className="h-[40vh] grid place-items-center">
            <div className="h-10 w-10 border-2 border-black/10 border-t-[var(--s2d-red)] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((m) => (
              <div key={m.id} className="dark-card p-5 grain group" data-testid={`homework-card-${m.id}`}>
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] opacity-70">
                  <span>Module {m.id}</span>
                  {m.homework_complete && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <div className="font-display font-bold text-lg mt-2 leading-tight">{m.title}</div>
                <div className="mt-2 text-xs opacity-60">Status: {m.homework_complete ? "Complete" : "Incomplete"}</div>
                <button
                  onClick={() => toggleComplete(m)}
                  disabled={busyId === m.id || m.homework_complete}
                  className={`mt-4 w-full text-sm py-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 font-semibold transition ${m.homework_complete ? "bg-emerald-500 text-white cursor-default" : "bg-white text-[var(--s2d-ink)] hover:bg-white/90"}`}
                  data-testid={`homework-complete-btn-${m.id}`}
                >
                  {m.homework_complete ? "Completed" : busyId === m.id ? "Saving…" : "Mark complete"} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
