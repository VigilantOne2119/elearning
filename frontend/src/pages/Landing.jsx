import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ArrowRight, Car, Shield, Sparkles, Clock, Award, Phone } from "lucide-react";

const HERO_IMG =
  "https://images.unsplash.com/photo-1527593167147-e9c94a5883e6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwxfHxkcml2aW5nJTIwc2Nob29sJTIwY2FyJTIwc3RlZXJpbmclMjB3aGVlbCUyMG1vZGVybnxlbnwwfHx8fDE3ODA5MDM1MDJ8MA&ixlib=rb-4.1.0&q=85";

const tickerItems = [
  "MTO-APPROVED BDE",
  "4-MONTH G1 REDUCTION",
  "INSURANCE DISCOUNT",
  "20 HOURS ONLINE",
  "LIFETIME ACCESS",
  "CERTIFIED INSTRUCTORS",
  "PRICE MATCH GUARANTEE",
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-[var(--s2d-ink)]" data-testid="landing-page">
      {/* Top nav */}
      <header className="border-b border-black/5">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="landing-brand">
            <div className="w-9 h-9 rounded-lg bg-[var(--s2d-red)] grid place-items-center text-white font-display font-black text-lg">S</div>
            <div className="leading-tight">
              <div className="font-display font-extrabold text-[15px] tracking-tight">Safe2Drive</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--s2d-muted)]">Online BDE · Ontario</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--s2d-ink-soft)]">
            <a href="#features" className="hover:text-[var(--s2d-red)] transition">Features</a>
            <a href="#curriculum" className="hover:text-[var(--s2d-red)] transition">Curriculum</a>
            <a href="https://www.safe2driveontario.ca/markham" target="_blank" rel="noreferrer" className="hover:text-[var(--s2d-red)] transition">Driving School</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to={user.role === "admin" ? "/admin" : "/dashboard"} className="btn-red px-4 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2" data-testid="landing-go-dashboard">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--s2d-surface)] transition" data-testid="landing-login-btn">Login</Link>
                <Link to="/register" className="btn-red px-4 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2" data-testid="landing-register-btn">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-16 md:py-24 grid grid-cols-12 gap-8 items-center">
          <div className="col-span-12 lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--s2d-surface)] border border-black/5 text-xs font-mono uppercase tracking-wider mb-6 fade-up">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--s2d-red)] animate-pulse" />
              Ontario MTO-Approved · Beginner Driver Education
            </div>
            <h1 className="font-display font-black text-5xl md:text-7xl tracking-tight leading-[0.95] fade-up" style={{ animationDelay: '60ms' }}>
              Learn to drive.<br />
              <span className="text-[var(--s2d-red)]">Pass with confidence.</span>
            </h1>
            <p className="mt-6 text-lg text-[var(--s2d-muted)] max-w-xl fade-up" style={{ animationDelay: '120ms' }}>
              A premium online classroom built for the Safe2Drive Ontario student. Cinematic lessons, smart progress tracking, real MTO outcomes — without the dated UI.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 fade-up" style={{ animationDelay: '180ms' }}>
              <Link to="/register" className="btn-red px-6 py-3.5 rounded-2xl font-semibold inline-flex items-center gap-2" data-testid="hero-register-btn">
                Start your 20 hours <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="px-6 py-3.5 rounded-2xl font-semibold border border-black/10 hover:bg-[var(--s2d-surface)] transition" data-testid="hero-login-btn">
                I already have an account
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-[var(--s2d-muted)] fade-up" style={{ animationDelay: '240ms' }}>
              <div className="flex items-center gap-2"><Award className="w-4 h-4 text-[var(--s2d-red)]" /> 25+ yrs experience</div>
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-[var(--s2d-red)]" /> MTO-certified</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-[var(--s2d-red)]" /> 8-month G2 fast-track</div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 relative fade-up" style={{ animationDelay: '300ms' }}>
            <div className="relative rounded-[28px] overflow-hidden border border-black/10 shadow-[0_40px_80px_-32px_rgba(0,0,0,0.35)]">
              <img src={HERO_IMG} alt="Driving" className="w-full h-[460px] object-cover" />
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/60 to-transparent text-white">
                <div className="text-xs uppercase tracking-[0.2em] opacity-80">Module 03 · Vehicle Handling</div>
                <div className="font-display font-bold text-2xl mt-1">Smooth steering. Calm braking.</div>
              </div>
            </div>
            <div className="absolute -left-6 -bottom-6 ink-card px-5 py-4 hidden md:block">
              <div className="text-[10px] uppercase tracking-widest text-[var(--s2d-muted)]">Live progress</div>
              <div className="font-display font-extrabold text-2xl mt-1">12<span className="text-[var(--s2d-muted)]">/20 hrs</span></div>
            </div>
          </div>
        </div>

        {/* Ticker */}
        <div className="border-y border-black/5 bg-[var(--s2d-ink)] text-white overflow-hidden">
          <div className="flex whitespace-nowrap ticker-track">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <div key={i} className="flex items-center gap-4 px-8 py-4 text-sm font-mono tracking-wider">
                <Car className="w-4 h-4 text-[var(--s2d-red)]" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
          <div className="max-w-3xl">
            <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-red)] mb-3">Why this platform</div>
            <h2 className="font-display font-black text-4xl md:text-5xl tracking-tight">
              Built to mog the<br />outdated tools.
            </h2>
            <p className="mt-4 text-[var(--s2d-muted)] text-lg">A modern, focused learning experience for Ontario students — fast, beautiful, and MTO-compliant.</p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Sparkles, title: "Cinematic lessons", body: "Distraction-free slide viewer with audio narration, transcripts, and resume-from-anywhere." },
              { icon: Clock, title: "20-hr MTO tracker", body: "Automatic watched-time tracking with daily 5-hour caps to match MTO BDE requirements." },
              { icon: Award, title: "Quiz + final test", body: "Module quizzes, instant feedback, and a final test that unlocks your Certificate of Completion." },
            ].map((f, i) => (
              <div key={i} className="ink-card p-7">
                <div className="w-11 h-11 rounded-xl bg-[var(--s2d-red)]/10 text-[var(--s2d-red)] grid place-items-center mb-5">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-xl">{f.title}</h3>
                <p className="mt-2 text-sm text-[var(--s2d-muted)] leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curriculum preview */}
      <section id="curriculum" className="py-20 bg-[var(--s2d-surface)]">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-[var(--s2d-red)] mb-3">8 modules · 20 hours</div>
              <h2 className="font-display font-black text-4xl md:text-5xl tracking-tight">Ontario MTO curriculum.</h2>
            </div>
            <Link to="/register" className="btn-red px-5 py-3 rounded-xl text-sm font-semibold inline-flex items-center gap-2">Enroll now <ArrowRight className="w-4 h-4" /></Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Rules of the Road",
              "The Vehicle & Components",
              "Vehicle Handling",
              "Driver Behaviour",
              "Respect & Responsibility",
              "Sharing the Road",
              "Attention",
              "Perception & Risk",
            ].map((t, i) => (
              <div key={i} className="ink-card p-5">
                <div className="font-mono text-[11px] text-[var(--s2d-muted)] tracking-wider">MODULE 0{i + 1}</div>
                <div className="mt-1.5 font-display font-bold text-lg leading-tight">{t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
          <div className="rounded-[28px] bg-[var(--s2d-ink)] text-white p-10 md:p-16 relative overflow-hidden grain">
            <div className="relative z-10 max-w-2xl">
              <h2 className="font-display font-black text-4xl md:text-6xl tracking-tight leading-[0.95]">
                Your safety is our drive.
              </h2>
              <p className="mt-5 text-white/70 text-lg">Join Safe2Drive Ontario&apos;s online classroom and complete your MTO-approved BDE from anywhere.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="btn-red px-6 py-3.5 rounded-2xl font-semibold inline-flex items-center gap-2">
                  Create my account <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="tel:+16477863490" className="px-6 py-3.5 rounded-2xl font-semibold border border-white/20 hover:bg-white/10 transition inline-flex items-center gap-2">
                  <Phone className="w-4 h-4" /> (647) 786-3490
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5 py-10">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-[var(--s2d-muted)]">
          <div>© {new Date().getFullYear()} Safe2Drive Ontario · MTO-approved BDE</div>
          <div className="font-mono text-xs uppercase tracking-widest">Built to mog the rest.</div>
        </div>
      </footer>
    </div>
  );
}
