"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAiSync } from "@/lib/ai-sync-context";

const TKEY = "studyflow_timer";
function saveTimer(d: object) { if (typeof window === "undefined") return; localStorage.setItem(TKEY, JSON.stringify(d)); }
function clearTimer() { if (typeof window === "undefined") return; localStorage.removeItem(TKEY); }
function loadTimer() { try { const v = typeof window === "undefined" ? null : localStorage.getItem(TKEY); return v ? JSON.parse(v) : null; } catch { return null; } }

type Status = "idle" | "running" | "paused";
interface AiEvent { id: number; title: string; description: string | null; startTime: string; endTime: string; aiGenerated: boolean; taskId: number | null; }
interface Done { subject: string; duration: number; pct: number; }
interface AiResult { message: string; newEvent: { title: string; startTime: string; endTime: string } | null; }

const SC: Record<string, { bg: string; text: string }> = {
  Math: { bg: "bg-blue-50", text: "text-blue-600" },
  English: { bg: "bg-violet-50", text: "text-violet-600" },
  Physics: { bg: "bg-emerald-50", text: "text-emerald-600" },
  "Computer Science": { bg: "bg-teal-50", text: "text-teal-600" },
};
const DC = { bg: "bg-gray-100", text: "text-gray-600" };

function fmt(s: number) { return { h: String(Math.floor(s / 3600)).padStart(2, "0"), m: String(Math.floor((s % 3600) / 60)).padStart(2, "0"), s: String(s % 60).padStart(2, "0") }; }

function Ring({ pct, size = 260 }: { pct: number; size?: number }) {
  const r = (size - 24) / 2, c = 2 * Math.PI * r;
  return <svg width={size} height={size} className="rotate-[-90deg]">
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#0d9488" strokeWidth="10"
      strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} strokeLinecap="round"
      style={{ transition: "stroke-dashoffset 0.5s ease" }} />
  </svg>;
}

function subj(ev: AiEvent) {
  const m = ev.title.match(/Study:\s*(.+?)(?:\s*[—\-]|$)/i);
  return m?.[1]?.trim() ?? ev.description ?? "Study";
}

function fmtCd(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${ss}s` : `${ss}s`;
}

function timeFmt(iso: string) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function dur(a: AiEvent) { return Math.round((new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) / 60000); }

export default function TimerPage() {
  const router = useRouter();
  const { notifyChange } = useAiSync();
  const [events, setEvents] = useState<AiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<AiEvent | null>(null);
  const [next, setNext] = useState<AiEvent | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [total, setTotal] = useState(0);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [cd, setCd] = useState(0);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState("");
  const [modal, setModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [done, setDone] = useState<Done[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cdRef = useRef<NodeJS.Timeout | null>(null);
  const wallRef = useRef<number | null>(null); // wall-clock ms when timer last "started" (adjusted for pauses)

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = new Date(); s.setHours(0, 0, 0, 0);
      const e = new Date(); e.setHours(23, 59, 59, 999);
      const res = await fetch(`/api/events?from=${s.toISOString()}&to=${e.toISOString()}`);
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      const ai: AiEvent[] = (data.events ?? []).filter((e: any) => e.aiGenerated);
      ai.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setEvents(ai);
      const now = new Date();
      const act = ai.find(e => new Date(e.startTime) <= now && new Date(e.endTime) > now) ?? null;
      const nxt = ai.filter(e => new Date(e.startTime) > now)[0] ?? null;
      setActive(act); setNext(nxt);
      const focusEv = act ?? nxt;
      if (act) {
        const remaining = Math.max(0, Math.round((new Date(act.endTime).getTime() - Date.now()) / 1000));
        setTotal(remaining);
      } else if (nxt) {
        setTotal(Math.round((new Date(nxt.endTime).getTime() - new Date(nxt.startTime).getTime()) / 1000));
      }
      // Pre-fill progress from DB if linked task exists
      if (focusEv?.taskId) {
        try {
          const tr = await fetch(`/api/tasks/${focusEv.taskId}`);
          if (tr.ok) { const td = await tr.json(); setProgress(td.task?.progress ?? 0); }
        } catch { }
      }
    } catch { }
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (next && status === "idle" && !active) {
      const tick = () => {
        const s = Math.max(0, Math.floor((new Date(next.startTime).getTime() - Date.now()) / 1000));
        setCd(s); if (s === 0) load();
      };
      tick(); cdRef.current = setInterval(tick, 1000);
    }
    return () => { if (cdRef.current) clearInterval(cdRef.current); };
  }, [next, status, active, load]);

  useEffect(() => {
    if (status === "running") {
      // Wall-clock based: elapsed = now - wallStart, immune to tab throttling
      if (wallRef.current === null) wallRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => {
        if (wallRef.current === null) return;
        const e = Math.floor((Date.now() - wallRef.current) / 1000);
        if (e >= total) { clearInterval(timerRef.current!); setElapsed(total); setStatus("idle"); setModal(true); clearTimer(); }
        else setElapsed(e);
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (status === "paused") wallRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, total]);

  // Restore timer on mount/after events load
  useEffect(() => {
    if (loading) return;
    const s = loadTimer();
    if (!s) return;
    if (s.status === "running" && s.wallStart) {
      const rec = Math.floor((Date.now() - s.wallStart) / 1000);
      const tot = s.totalSecs ?? 0;
      if (rec >= tot) {
        // Session window passed while away — show completion modal
        setElapsed(tot); setTotal(tot);
        if (s.sessionStart) setSessionStart(new Date(s.sessionStart));
        setProgress(s.progress ?? 0); setNote(s.note ?? "");
        clearTimer(); setModal(true);
      } else {
        wallRef.current = s.wallStart;
        setElapsed(rec); setTotal(tot);
        if (s.sessionStart) setSessionStart(new Date(s.sessionStart));
        setProgress(s.progress ?? 0); setNote(s.note ?? "");
        setStatus("running");
      }
    } else if (s.status === "paused") {
      setElapsed(s.elapsed ?? 0); setTotal(s.totalSecs ?? 0);
      if (s.sessionStart) setSessionStart(new Date(s.sessionStart));
      setProgress(s.progress ?? 0); setNote(s.note ?? "");
      setStatus("paused");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Save paused state on page unload/close
  useEffect(() => {
    const onUnload = () => {
      if (status === "running" && wallRef.current) {
        const e = Math.floor((Date.now() - wallRef.current) / 1000);
        saveTimer({ status: "paused", elapsed: e, wallStart: null, totalSecs: total, sessionStart: sessionStart?.toISOString(), progress, note });
      } else if (status === "paused") {
        saveTimer({ status: "paused", elapsed, wallStart: null, totalSecs: total, sessionStart: sessionStart?.toISOString(), progress, note });
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [status, elapsed, total, sessionStart, progress, note]);

  // Correct elapsed immediately when user switches back to this tab
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && status === "running" && wallRef.current) {
        const e = Math.floor((Date.now() - wallRef.current) / 1000);
        if (e >= total) { setElapsed(total); setStatus("idle"); setModal(true); clearTimer(); }
        else setElapsed(e);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [status, total]);

  // Idle tick — forces a re-render every second so the remaining-time countdown moves
  const [, setIdleTick] = useState(0);
  useEffect(() => {
    if (status === "idle" && active) {
      const id = setInterval(() => setIdleTick(t => t + 1), 1000);
      return () => clearInterval(id);
    }
  }, [status, active]);

  const focus = active ?? next;
  const canStart = !!active && status === "idle";
  // Idle: compute remaining from wall clock so it ticks every second.
  // Running: countdown = total - elapsed (elapsed counts up from Start press).
  const displaySecs = status === "idle"
    ? active
      ? Math.max(0, Math.floor((new Date(active.endTime).getTime() - Date.now()) / 1000))
      : total
    : Math.max(0, total - elapsed);
  const { h, m, s } = fmt(displaySecs);
  // Ring fills as the user's active study time fills the remaining window
  const pct = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;
  const sc = focus ? SC[subj(focus)] ?? DC : DC;
  // How many minutes are left in the session window (for the banner)
  const remainingMins = active ? Math.max(0, Math.ceil((new Date(active.endTime).getTime() - Date.now()) / 60000)) : null;

  const handleStart = () => {
    if (!canStart) return;
    const now = new Date();
    wallRef.current = Date.now();
    // Keep existing progress (from DB) — don't reset to 0
    setSessionStart(now); setElapsed(0); setNote(""); setAiResult(null);
    setStatus("running");
    saveTimer({ status: "running", wallStart: Date.now(), totalSecs: total, sessionStart: now.toISOString(), progress, note: "" });
  };
  const handleEnd = () => { setStatus("idle"); setModal(true); };

  const handleSubmit = async () => {
    if (!focus || submitting) return;
    setSubmitting(true);
    const endedAt = new Date();
    const startedAt = sessionStart ?? new Date(focus.startTime);
    try {
      const res = await fetch("/api/timer/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subj(focus), taskId: focus.taskId ?? undefined, taskTitle: focus.title,
          scheduledDurationMin: Math.round(total / 60),
          actualDurationMin: Math.max(1, Math.round(elapsed / 60)),
          completionPct: progress, note,
          startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(),
        }),
      });
      const data = await res.json();
      setAiResult({ message: data.aiMessage ?? "Session saved!", newEvent: data.newEvent ?? null });
      setDone(p => [{ subject: subj(focus), duration: elapsed, pct: progress }, ...p]);
      setElapsed(0); setNote(""); clearTimer();
      if (data.taskCompleted) {
        // Task is 100% done — AI events deleted server-side.
        // Trigger full AI refresh so dashboard suggestions, schedule, and timer all update.
        setProgress(0);
        notifyChange("tasks");
      } else {
        // Partial session: keep progress value, just reload events
        setProgress(progress); // retain for next session
      }
      await load();
    } catch { setAiResult({ message: "Session saved! Could not reach AI.", newEvent: null }); }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Study Timer</h1>
          <p className="text-gray-400 mt-1.5 text-sm">AI-scheduled sessions — tracked automatically for analytics</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No sessions scheduled today</h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">Add tasks and generate an AI schedule from the dashboard or AI assistant to unlock study sessions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              {focus && (
                <div className="bg-gray-900 rounded-3xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-lg">✦</span></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-0.5">{active ? "Active Now" : "Up Next"}</p>
                    <p className="text-white font-bold text-base truncate">{focus.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{timeFmt(focus.startTime)} – {timeFmt(focus.endTime)} · ~{dur(focus)}m</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-lg flex-shrink-0 ${sc.bg} ${sc.text}`}>{subj(focus)}</span>
                </div>
              )}

              {next && !active && (
                <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl py-3 px-5">
                  <span className="text-amber-500 text-lg">⏳</span>
                  <span className="text-amber-700 font-semibold text-sm">Starts in <span className="font-mono">{fmtCd(cd)}</span></span>
                </div>
              )}

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center gap-6">
                <div className="relative flex items-center justify-center">
                  <Ring pct={pct} size={260} />
                  <div className="absolute flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      {[h, m, s].map((u, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="bg-gray-900 rounded-2xl w-[68px] h-[68px] flex items-center justify-center shadow-sm">
                            <span className="text-3xl font-bold text-white font-mono tracking-tight">{u}</span>
                          </div>
                          {i < 2 && <span className="text-2xl font-bold text-gray-200">:</span>}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 font-medium mt-1">{status === "idle" && elapsed === 0 ? "Session duration" : `${pct}% elapsed`}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {status === "idle" && !modal && (
                    <button onClick={handleStart} disabled={!canStart}
                      className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-semibold text-sm transition-all shadow-lg ${canStart ? "bg-teal-600 hover:bg-teal-700 active:scale-95 text-white shadow-teal-200" : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"}`}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      {canStart ? "Start Session" : "Waiting for session time"}
                    </button>
                  )}
                  {status === "running" && <>
                    <button onClick={() => { wallRef.current = null; setStatus("paused"); saveTimer({ status: "paused", elapsed, wallStart: null, totalSecs: total, sessionStart: sessionStart?.toISOString(), progress, note }); }} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-6 py-3 rounded-2xl font-semibold text-sm transition-all">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>Pause
                    </button>
                    <button onClick={handleEnd} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 active:scale-95 text-white px-6 py-3 rounded-2xl font-semibold text-sm transition-all">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>End Session
                    </button>
                  </>}
                  {status === "paused" && <>
                    <button onClick={() => { wallRef.current = Date.now() - elapsed * 1000; setStatus("running"); saveTimer({ status: "running", wallStart: wallRef.current, totalSecs: total, sessionStart: sessionStart?.toISOString(), progress, note }); }} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-6 py-3 rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-teal-200">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>Resume
                    </button>
                    <button onClick={handleEnd} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 active:scale-95 text-white px-6 py-3 rounded-2xl font-semibold text-sm transition-all">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>End Session
                    </button>
                  </>}
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status === "running" ? "bg-teal-500 animate-pulse" : status === "paused" ? "bg-amber-400" : "bg-gray-300"}`} />
                  <span className="text-xs text-gray-500 font-medium">{status === "idle" ? "Ready to start" : status === "running" ? "Session in progress" : "Session paused"}</span>
                </div>
              </div>

              {(status === "running" || status === "paused") && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
                  <h3 className="font-bold text-gray-900 text-base">Update Your Progress</h3>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Task Completion</label>
                      <span className="text-sm font-bold text-teal-600">{progress}%</span>
                    </div>
                    <input type="range" min={0} max={100} step={5} value={progress} onChange={e => setProgress(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-teal-600 cursor-pointer" />
                    <div className="flex justify-between text-xs text-gray-300 mt-1.5"><span>Not started</span><span>Halfway</span><span>Done</span></div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Session Note <span className="text-gray-300 normal-case font-normal ml-1">— helps AI understand your pace</span></label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Got stuck on problem 4..." rows={2}
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder:text-gray-300 resize-none" />
                  </div>
                </div>
              )}

              {done.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 text-base mb-4">Completed Today</h3>
                  <div className="flex flex-col gap-3">
                    {done.map((d, i) => {
                      const { h: dh, m: dm, s: ds } = fmt(d.duration);
                      const c = SC[d.subject] ?? DC;
                      return (
                        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                          <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div className="flex-1 min-w-0"><span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${c.bg} ${c.text}`}>{d.subject}</span></div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-gray-700 font-mono">{dh}:{dm}:{ds}</p>
                            <p className="text-xs text-teal-600 font-semibold mt-0.5">{d.pct}% complete</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 text-base mb-1">Today&apos;s Schedule</h3>
                <p className="text-gray-400 text-xs mb-4">AI-generated sessions for today</p>
                <div className="flex flex-col gap-3">
                  {events.map(ev => {
                    const now = new Date();
                    const isPast = new Date(ev.endTime) < now;
                    const isNow = new Date(ev.startTime) <= now && new Date(ev.endTime) > now;
                    const ec = SC[subj(ev)] ?? DC;
                    return (
                      <div key={ev.id} className={`p-3.5 rounded-2xl border transition-all ${isNow ? "border-teal-300 bg-teal-50" : isPast ? "border-gray-100 bg-gray-50/50 opacity-50" : "border-gray-100 bg-gray-50/50"}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${ec.bg} ${ec.text}`}>{subj(ev)}</span>
                          {isPast && <span className="text-xs text-gray-400">✓</span>}
                          {isNow && <span className="text-xs text-teal-600 font-semibold animate-pulse">● Now</span>}
                        </div>
                        <p className="text-sm font-semibold text-gray-800 truncate">{ev.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{timeFmt(ev.startTime)} – {timeFmt(ev.endTime)} · {dur(ev)}m</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-900 rounded-3xl p-6 text-white">
                <div className="flex items-center gap-2 mb-3"><span className="text-lg">✦</span><h3 className="font-bold text-sm">AI Insights</h3></div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-xs text-gray-400">Sessions today</span>
                    <span className="text-sm font-bold text-teal-400">{done.length}/{events.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-xs text-gray-400">Total studied</span>
                    <span className="text-sm font-bold text-teal-400 font-mono">{(() => { const t = fmt(done.reduce((a, d) => a + d.duration, 0) + elapsed); return `${t.h}:${t.m}:${t.s}`; })()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-gray-400">Current task</span>
                    <span className="text-sm font-bold text-teal-400">{progress}%</span>
                  </div>
                </div>
                {done.length === 0 && status === "idle" && <p className="text-xs text-gray-600 mt-3 text-center">Start a session to begin tracking</p>}
              </div>
            </div>
          </div>
        )}

        {modal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
              {!aiResult ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center"><span className="text-2xl">🎯</span></div>
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">Session Complete!</h2>
                      <p className="text-gray-400 text-xs">{(() => { const t = fmt(elapsed); return `${t.h}:${t.m}:${t.s}`; })()}{" studied · "}{focus && subj(focus)}</p>
                    </div>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700">How much did you complete?</label>
                      <span className="text-lg font-bold text-teal-600">{progress}%</span>
                    </div>
                    <input type="range" min={0} max={100} step={5} value={progress} onChange={e => setProgress(Number(e.target.value))}
                      className="w-full h-3 rounded-full appearance-none bg-gray-200 accent-teal-600 cursor-pointer" />
                    <div className="flex justify-between text-xs text-gray-400 mt-1.5"><span>Not started</span><span>Halfway</span><span>Complete</span></div>
                    <div className="h-2 w-full bg-gray-100 rounded-full mt-3 overflow-hidden">
                      <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Any notes? <span className="font-normal text-gray-400">(helps AI plan next steps)</span></label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Finished problems 1–3, stuck on proof in section 4..." rows={3}
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder:text-gray-300 resize-none" />
                  </div>
                  <button onClick={handleSubmit} disabled={submitting}
                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2">
                    {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving &amp; asking AI...</> : "Submit & Get AI Feedback"}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center"><span className="text-xl">✦</span></div>
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">AI Feedback</h2>
                      <p className="text-gray-400 text-xs">Based on your session data</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                    <p className="text-gray-700 text-sm leading-relaxed">{aiResult.message}</p>
                  </div>
                  {aiResult.newEvent && (
                    <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-teal-600 text-sm">📅</span>
                        <p className="text-teal-700 font-semibold text-sm">Follow-up session added to calendar</p>
                      </div>
                      <p className="text-teal-600 text-xs font-medium">{aiResult.newEvent.title}</p>
                      <p className="text-teal-500 text-xs mt-0.5">
                        {new Date(aiResult.newEvent.startTime).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(aiResult.newEvent.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  )}
                  <button onClick={() => { setModal(false); setAiResult(null); }}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3.5 rounded-2xl font-semibold text-sm transition-all">
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}