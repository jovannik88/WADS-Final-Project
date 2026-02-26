"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const FEATURES = [
  {
    icon: "✦",
    title: "AI-Powered Insights",
    desc: "Smart task prioritization and personalized study recommendations based on your unique patterns.",
    accent: "#14b8a6",
  },
  {
    icon: "⏱",
    title: "Pomodoro Focus Timer",
    desc: "Build consistent study habits with streak tracking and customizable focus sessions.",
    accent: "#6366f1",
  },
  {
    icon: "📋",
    title: "Task Management",
    desc: "Organize assignments by subject, priority, and deadline — never miss a due date again.",
    accent: "#f59e0b",
  },
  {
    icon: "📅",
    title: "Smart Calendar",
    desc: "Visual schedule overview that seamlessly integrates your tasks and study sessions.",
    accent: "#ec4899",
  },
  {
    icon: "📊",
    title: "Progress Analytics",
    desc: "Visualize your productivity trends, completion rates, and study streaks over time.",
    accent: "#22c55e",
  },
  {
    icon: "🤖",
    title: "AI Assistant",
    desc: "Your personal study companion — available anytime for help, planning, and motivation.",
    accent: "#14b8a6",
  },
];

const TESTIMONIALS = [
  {
    name: "Aria Chen",
    role: "CS Major, Stanford",
    initial: "A",
    color: "#14b8a6",
    text: "StudyFlow completely changed how I approach exam season. The AI suggestions are actually useful — it knew I needed to start my CS project 3 days before I did.",
  },
  {
    name: "Marcus Webb",
    role: "Pre-Med, UCLA",
    initial: "M",
    color: "#6366f1",
    text: "The focus timer and streak system kept me consistent through my hardest semester. I went from barely passing to dean's list.",
  },
  {
    name: "Priya Sharma",
    role: "Law Student, NYU",
    initial: "P",
    color: "#f59e0b",
    text: "I love how everything connects — tasks, calendar, timers. It's like having a personal academic coach in my pocket.",
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#080d12] text-white">
      {/* ── Background ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div
        className="pointer-events-none fixed -top-40 -left-40 z-0 h-[600px] w-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(20,184,166,0.10) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none fixed -bottom-40 -right-20 z-0 h-[500px] w-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)" }}
      />

      {/* ── Navbar ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#080d12]/80 backdrop-blur-xl border-b border-white/[0.06] py-3"
            : "py-5"
        }`}
      >
        <div className="mx-auto max-w-6xl px-6 flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)", boxShadow: "0 0 20px rgba(20,184,166,0.35)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="white" strokeWidth="2" />
              </svg>
            </div>
            <span className="font-bold text-[17px] tracking-tight">StudyFlow</span>
          </div>

          <div className="hidden md:flex items-center gap-1 ml-auto">
            {["Features", "Reviews", "Pricing"].map((l) => (
              <button
                key={l}
                onClick={() => {
                  document.getElementById(l.toLowerCase())?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="px-4 py-2 text-[14px] text-white/50 hover:text-white/80 rounded-lg hover:bg-white/[0.04] transition-all cursor-pointer"
              >
                {l}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 md:ml-0 ml-auto">
            <Link href="/login" className="hidden sm:block px-4 py-2 text-[13px] text-white/50 hover:text-white/80 border border-white/[0.08] rounded-lg hover:border-white/[0.14] transition-all">
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-[13px] font-semibold text-white rounded-[9px] transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)", boxShadow: "0 0 20px rgba(20,184,166,0.25)" }}
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-44 pb-24 text-center">
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] mb-10 border transition-all cursor-default"
          style={{ background: "rgba(20,184,166,0.07)", borderColor: "rgba(20,184,166,0.22)", color: "#2dd4bf" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#14b8a6", boxShadow: "0 0 8px #14b8a6" }} />
          New: AI Study Assistant is now available
          <span className="opacity-60">→</span>
        </div>

        <h1 className="text-[clamp(52px,8vw,86px)] font-extrabold leading-[1.04] tracking-[-3px] mb-6">
          Study smarter,{" "}
          <span style={{ background: "linear-gradient(135deg, #2dd4bf, #14b8a6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            not harder.
          </span>
        </h1>

        <p className="mx-auto max-w-[580px] text-[18px] leading-relaxed text-white/50 mb-12">
          The all-in-one academic companion that organizes your tasks, tracks your focus, and delivers AI-powered insights — so you can hit your goals every semester.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-[15px] font-bold text-white transition-all hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)", boxShadow: "0 0 40px rgba(20,184,166,0.30), 0 4px 20px rgba(0,0,0,0.3)" }}
          >
            Start for Free
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-4 rounded-xl text-[14px] text-white/50 hover:text-white/75 border border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.03] transition-all">
            Sign in to dashboard
          </Link>
        </div>

        <div className="flex justify-center overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-md divide-x divide-white/[0.07]">
          {[
            { value: "50K+", label: "Active Students" },
            { value: "4.9★", label: "Average Rating" },
            { value: "2.4M", label: "Tasks Completed" },
            { value: "78%", label: "Grade Improvement" },
          ].map((s) => (
            <div key={s.label} className="flex-1 py-5 px-4 text-center">
              <div className="text-[22px] font-bold text-[#2dd4bf] mb-0.5">{s.value}</div>
              <div className="text-[12px] text-white/30">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Dashboard Mockup ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-28">
        <div
          className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-[70%] h-24"
          style={{ background: "radial-gradient(ellipse, rgba(20,184,166,0.22), transparent 70%)" }}
        />
        <div className="rounded-2xl overflow-hidden border border-white/[0.08]" style={{ boxShadow: "0 40px 120px rgba(0,0,0,0.65)" }}>
          {/* Browser bar */}
          <div className="flex items-center gap-4 bg-white/[0.03] border-b border-white/[0.06] px-5 py-3">
            <div className="flex gap-1.5">
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <span key={c} className="block h-3 w-3 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <div className="mx-auto flex-1 max-w-[220px] text-center text-[11px] text-white/25 bg-white/[0.04] border border-white/[0.06] rounded-md py-1">
              studyflow.app/dashboard
            </div>
          </div>

          {/* App */}
          <div className="flex h-[400px] bg-[#f8fafc]">
            {/* Sidebar */}
            <div className="w-[190px] shrink-0 bg-[#0a1220] border-r border-white/[0.06] py-5">
              <div className="flex items-center gap-2 px-4 pb-4 mb-2 border-b border-white/[0.06]">
                <div className="h-6 w-6 rounded-md shrink-0" style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }} />
                <span className="text-[13px] font-bold text-white">StudyFlow</span>
              </div>
              {[
                { label: "Dashboard", active: true },
                { label: "Tasks" },
                { label: "Calendar" },
                { label: "Study Timer" },
                { label: "AI Assistant" },
                { label: "Analytics" },
              ].map(({ label, active }) => (
                <div key={label} className={`flex items-center gap-2.5 px-4 py-2 text-[11px] ${active ? "text-[#2dd4bf] bg-[#14b8a6]/10 border-l-2 border-[#14b8a6]" : "text-white/30"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#14b8a6]" : "bg-current opacity-40"}`} />
                  {label}
                </div>
              ))}
            </div>

            {/* Main */}
            <div className="flex-1 overflow-hidden p-5">
              <div className="mb-4">
                <p className="text-[17px] font-bold text-slate-800">Good evening, Jean 👋</p>
                <p className="text-[11px] text-slate-400">You have 3 urgent tasks due soon.</p>
              </div>
              <div className="grid grid-cols-4 gap-2.5 mb-4">
                {[
                  { label: "Tasks Done", value: "1/6", sub: "+2 today", color: "#0f172a" },
                  { label: "Study Streak", value: "5 days", sub: "Keep going!", color: "#f97316" },
                  { label: "Focus Time", value: "3h 20m", sub: "today", color: "#14b8a6" },
                  { label: "Completion", value: "78%", sub: "+2% this week", color: "#6366f1" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className="text-[9px] text-slate-400 mb-1">{s.label}</p>
                    <p className="text-[16px] font-bold mb-0.5" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[9px] text-slate-300">{s.sub}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_250px] gap-2.5">
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-700 mb-2">Upcoming Tasks</p>
                  {[
                    { name: "CS Project Milestone", sub: "Computer Science · 150 min", p: "high" },
                    { name: "Calculus Problem Set", sub: "Mathematics · 90 min", p: "high" },
                    { name: "English Essay Draft", sub: "English · 60 min", p: "medium" },
                  ].map((t) => (
                    <div key={t.name} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                      <span className="h-7 w-0.5 rounded shrink-0" style={{ background: t.p === "high" ? "#ef4444" : "#f59e0b" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-slate-700 truncate">{t.name}</p>
                        <p className="text-[9px] text-slate-400">{t.sub}</p>
                      </div>
                      <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: t.p === "high" ? "#fef2f2" : "#fffbeb", color: t.p === "high" ? "#ef4444" : "#d97706" }}>
                        {t.p}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-700 mb-2">✦ AI Suggestions</p>
                  {[
                    { icon: "⚠", title: "Priority Alert", sub: "CS Project is due tomorrow! Start first." },
                    { icon: "⏰", title: "Optimal Study Time", sub: "7–9 PM is your peak focus window." },
                  ].map((a) => (
                    <div key={a.title} className="flex gap-2 py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-sm shrink-0">{a.icon}</span>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-700">{a.title}</p>
                        <p className="text-[9px] text-slate-400">{a.sub}</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 text-center text-[10px] font-bold text-white py-2 rounded-lg" style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}>
                    Open AI Assistant
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 pb-28 text-center scroll-mt-24">
        <p className="text-[11px] font-semibold tracking-[2px] uppercase text-[#14b8a6] mb-4">Everything you need</p>
        <h2 className="text-[clamp(30px,5vw,50px)] font-extrabold tracking-tight mb-4">Built for serious students</h2>
        <p className="mx-auto max-w-[520px] text-[16px] text-white/45 mb-14 leading-relaxed">
          Six powerful tools, one seamless experience. StudyFlow brings together everything a student needs to excel academically.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111b27] p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.12]"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `radial-gradient(circle at 50% 100%, ${f.accent}14, transparent 70%)` }}
              />
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-xl" style={{ background: `${f.accent}15`, color: f.accent }}>
                {f.icon}
              </div>
              <h3 className="mb-2 text-[16px] font-bold tracking-tight text-white">{f.title}</h3>
              <p className="text-[13px] leading-relaxed text-white/45">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="reviews" className="relative z-10 mx-auto max-w-6xl px-6 pb-28 text-center scroll-mt-24">
        <p className="text-[11px] font-semibold tracking-[2px] uppercase text-[#14b8a6] mb-4">Student love</p>
        <h2 className="text-[clamp(30px,5vw,50px)] font-extrabold tracking-tight mb-14">Real students. Real results.</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-white/[0.06] bg-[#111b27] p-7 text-left transition-all hover:-translate-y-1 hover:border-white/[0.10] duration-300">
              <p className="text-5xl font-serif leading-none mb-5 opacity-25" style={{ color: "#14b8a6" }}>"</p>
              <p className="text-[14px] leading-[1.72] text-white/50 mb-6">{t.text}</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold shrink-0" style={{ background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}35` }}>
                  {t.initial}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{t.name}</p>
                  <p className="text-[11px] text-white/30">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative z-10 mx-auto max-w-3xl px-6 pb-28 text-center scroll-mt-24">
        <p className="text-[11px] font-semibold tracking-[2px] uppercase text-[#14b8a6] mb-4">Simple pricing</p>
        <h2 className="text-[clamp(30px,5vw,50px)] font-extrabold tracking-tight mb-14">Start free, scale when ready</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Free */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#111b27] p-9 text-left">
            <p className="text-[11px] uppercase tracking-widest text-white/35 font-semibold mb-4">Free</p>
            <div className="flex items-baseline gap-1 mb-7">
              <span className="text-[46px] font-extrabold tracking-tight">$0</span>
              <span className="text-[14px] text-white/30">/month</span>
            </div>
            <ul className="space-y-3 text-[13px] text-white/50 mb-8">
              {["Up to 20 tasks", "Focus timer", "Basic analytics", "Calendar view"].map((i) => (
                <li key={i} className="flex items-center gap-2"><span className="text-[#14b8a6]">✓</span> {i}</li>
              ))}
              {["AI suggestions", "AI assistant"].map((i) => (
                <li key={i} className="flex items-center gap-2 opacity-30"><span>✗</span> {i}</li>
              ))}
            </ul>
            <Link href="/register" className="block text-center py-3 rounded-xl text-[13px] font-semibold text-white/50 border border-white/[0.08] hover:border-white/[0.15] hover:text-white/75 transition-all">
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div className="relative rounded-2xl p-9 text-left" style={{ background: "linear-gradient(135deg, rgba(20,184,166,0.07), #111b27)", border: "1px solid rgba(20,184,166,0.28)", boxShadow: "0 0 60px rgba(20,184,166,0.10)" }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-[10px] font-bold text-white whitespace-nowrap" style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}>
              Most Popular
            </div>
            <p className="text-[11px] uppercase tracking-widest text-white/35 font-semibold mb-4">Pro</p>
            <div className="flex items-baseline gap-1 mb-7">
              <span className="text-[46px] font-extrabold tracking-tight">$9</span>
              <span className="text-[14px] text-white/30">/month</span>
            </div>
            <ul className="space-y-3 text-[13px] text-white/50 mb-8">
              {["Unlimited tasks", "Advanced focus timer", "Full analytics suite", "Calendar integrations", "AI-powered suggestions", "Unlimited AI assistant"].map((i) => (
                <li key={i} className="flex items-center gap-2"><span className="text-[#14b8a6]">✓</span> {i}</li>
              ))}
            </ul>
            <Link href="/register" className="block text-center py-3 rounded-xl text-[13px] font-bold text-white transition-all hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)", boxShadow: "0 0 30px rgba(20,184,166,0.30)" }}>
              Start Pro — 14 days free
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 mx-auto max-w-2xl px-6 pb-28 text-center">
        <div className="relative overflow-hidden rounded-3xl border p-14" style={{ background: "#111b27", borderColor: "rgba(20,184,166,0.22)" }}>
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(20,184,166,0.12), transparent 70%)" }} />
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border relative" style={{ background: "rgba(20,184,166,0.10)", borderColor: "rgba(20,184,166,0.25)", color: "#14b8a6" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <h2 className="text-[clamp(24px,4vw,36px)] font-extrabold tracking-tight mb-3 relative">Ready to transform your study game?</h2>
          <p className="text-[15px] text-white/40 mb-8 relative">Join 50,000+ students already using StudyFlow to reach their academic goals.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-[15px] font-bold text-white mb-4 relative transition-all hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)", boxShadow: "0 0 40px rgba(20,184,166,0.30)" }}
          >
            Get Started — It&apos;s Free
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <p className="text-[12px] text-white/25 relative">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="white" strokeWidth="2" />
              </svg>
            </div>
            <span className="font-bold text-[14px]">StudyFlow</span>
          </div>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Contact", "Blog"].map((l) => (
              <a key={l} href="#" className="text-[13px] text-white/25 hover:text-white/50 transition-colors">{l}</a>
            ))}
          </div>
          <p className="text-[12px] text-white/20">© 2026 StudyFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}