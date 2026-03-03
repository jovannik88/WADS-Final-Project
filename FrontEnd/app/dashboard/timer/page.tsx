"use client";

import { useState, useEffect, useRef } from "react";

type TimerStatus = "idle" | "running" | "paused";

interface ScheduledTask {
  id: number;
  title: string;
  subject: string;
  estimatedMinutes: number;
  progress: number;
  scheduledStart: string;
  scheduledEnd: string;
  priority: "high" | "medium" | "low";
}

// Mock: In production this comes from the AI schedule API
const aiScheduledTask: ScheduledTask = {
  id: 3,
  title: "Calculus Problem Set",
  subject: "Math",
  estimatedMinutes: 90,
  progress: 30,
  scheduledStart: "07:00 PM",
  scheduledEnd: "08:30 PM",
  priority: "high",
};

const upcomingTasks: ScheduledTask[] = [
  {
    id: 4,
    title: "English Essay Draft",
    subject: "English",
    estimatedMinutes: 60,
    progress: 0,
    scheduledStart: "08:30 PM",
    scheduledEnd: "09:30 PM",
    priority: "high",
  },
  {
    id: 5,
    title: "Physics Lab Report",
    subject: "Physics",
    estimatedMinutes: 45,
    progress: 0,
    scheduledStart: "09:30 PM",
    scheduledEnd: "10:15 PM",
    priority: "medium",
  },
];

const subjectColors: Record<string, { bg: string; text: string }> = {
  Math:               { bg: "bg-blue-50",    text: "text-blue-600" },
  English:            { bg: "bg-violet-50",  text: "text-violet-600" },
  Physics:            { bg: "bg-emerald-50", text: "text-emerald-600" },
  "Computer Science": { bg: "bg-teal-50",    text: "text-teal-600" },
};
const defaultColor = { bg: "bg-gray-100", text: "text-gray-600" };

const priorityConfig = {
  high:   { badge: "bg-red-50 text-red-500 ring-1 ring-red-200",    dot: "bg-red-400" },
  medium: { badge: "bg-amber-50 text-amber-600 ring-1 ring-amber-200", dot: "bg-amber-400" },
  low:    { badge: "bg-gray-50 text-gray-500 ring-1 ring-gray-200",  dot: "bg-gray-300" },
};

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return {
    hours: String(h).padStart(2, "0"),
    minutes: String(m).padStart(2, "0"),
    seconds: String(s).padStart(2, "0"),
  };
}

function CircularProgress({ progress, size = 260 }: { progress: number; size?: number }) {
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth="10" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="#0d9488" strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}

export default function StudyTimerPage() {
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [task] = useState<ScheduledTask>(aiScheduledTask);
  const [progress, setProgress] = useState(aiScheduledTask.progress);
  const [sessionNote, setSessionNote] = useState("");
  const [completedSessions, setCompletedSessions] = useState<
    { task: string; subject: string; duration: number; progress: number; note: string }[]
  >([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "running") {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [status]);

  const handleStart = () => setStatus("running");
  const handlePause = () => setStatus("paused");
  const handleResume = () => setStatus("running");

  const handleStop = () => {
    if (elapsed === 0) return;
    setCompletedSessions((prev) => [
      { task: task.title, subject: task.subject, duration: elapsed, progress, note: sessionNote },
      ...prev,
    ]);
    setStatus("idle");
    setElapsed(0);
    setSessionNote("");
  };

  const { hours, minutes, seconds } = formatTime(elapsed);
  const estimatedProgress = Math.min(100, Math.round((elapsed / (task.estimatedMinutes * 60)) * 100));
  const sc = subjectColors[task.subject] ?? defaultColor;
  const pc = priorityConfig[task.priority];
  const totalStudyTime = completedSessions.reduce((a, s) => a + s.duration, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Study Timer</h1>
          <p className="text-gray-400 mt-1.5 text-sm">Track your sessions — AI uses this data to optimize your schedule</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left col: Timer + Progress ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* AI assigned task banner */}
            <div className="bg-gray-900 rounded-3xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-lg">✦</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-0.5">
                  AI Scheduled for now
                </p>
                <p className="text-white font-bold text-base truncate">{task.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {task.scheduledStart} – {task.scheduledEnd} · ~{task.estimatedMinutes} min
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${pc.badge}`}>
                  {task.priority}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${sc.bg} ${sc.text}`}>
                  {task.subject}
                </span>
              </div>
            </div>

            {/* Timer card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center gap-6">

              {/* Circular ring + clock */}
              <div className="relative flex items-center justify-center">
                <CircularProgress progress={estimatedProgress} size={260} />
                <div className="absolute flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    {[hours, minutes, seconds].map((unit, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="bg-gray-900 rounded-2xl w-[68px] h-[68px] flex items-center justify-center shadow-sm">
                          <span className="text-3xl font-bold text-white font-mono tracking-tight">{unit}</span>
                        </div>
                        {i < 2 && <span className="text-2xl font-bold text-gray-200">:</span>}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 font-medium mt-1">
                    {estimatedProgress}% of {task.estimatedMinutes} min estimated
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {status === "idle" && (
                  <button
                    onClick={handleStart}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-8 py-3 rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-teal-200"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Start Session
                  </button>
                )}
                {status === "running" && (
                  <>
                    <button
                      onClick={handlePause}
                      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-6 py-3 rounded-2xl font-semibold text-sm transition-all"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                      Pause
                    </button>
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 active:scale-95 text-white px-6 py-3 rounded-2xl font-semibold text-sm transition-all"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h12v12H6z" />
                      </svg>
                      End Session
                    </button>
                  </>
                )}
                {status === "paused" && (
                  <>
                    <button
                      onClick={handleResume}
                      className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-6 py-3 rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-teal-200"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Resume
                    </button>
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 active:scale-95 text-white px-6 py-3 rounded-2xl font-semibold text-sm transition-all"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h12v12H6z" />
                      </svg>
                      End Session
                    </button>
                  </>
                )}
              </div>

              {/* Status pill */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  status === "running" ? "bg-teal-500 animate-pulse" :
                  status === "paused"  ? "bg-amber-400" : "bg-gray-300"
                }`} />
                <span className="text-xs text-gray-500 font-medium">
                  {status === "idle"    ? "Ready to start" :
                   status === "running" ? "Session in progress" : "Session paused"}
                </span>
              </div>
            </div>

            {/* Progress + note — only during active session */}
            {(status === "running" || status === "paused") && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
                <h3 className="font-bold text-gray-900 text-base">Update Your Progress</h3>

                {/* Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                      Task Completion
                    </label>
                    <span className="text-sm font-bold text-teal-600">{progress}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-teal-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-300 mt-1.5">
                    <span>Not started</span>
                    <span>Halfway</span>
                    <span>Done</span>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">
                    Session Note
                    <span className="text-gray-300 normal-case font-normal ml-1">
                      — helps AI understand your pace
                    </span>
                  </label>
                  <textarea
                    value={sessionNote}
                    onChange={(e) => setSessionNote(e.target.value)}
                    placeholder="e.g. Got stuck on problem 4, took a break after 30 mins..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all placeholder:text-gray-300 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Past sessions */}
            {completedSessions.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 text-base mb-4">Completed Sessions</h3>
                <div className="flex flex-col gap-3">
                  {completedSessions.map((s, i) => {
                    const { hours: h, minutes: m, seconds: sc2 } = formatTime(s.duration);
                    const ssc = subjectColors[s.subject] ?? defaultColor;
                    return (
                      <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                        <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{s.task}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${ssc.bg} ${ssc.text}`}>
                              {s.subject}
                            </span>
                            {s.note && <p className="text-xs text-gray-400 truncate">{s.note}</p>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-700 font-mono">{h}:{m}:{sc2}</p>
                          <p className="text-xs text-teal-600 font-semibold mt-0.5">{s.progress}% complete</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right col: Schedule + AI ── */}
          <div className="flex flex-col gap-4">

            {/* Up next */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 text-base mb-1">Up Next</h3>
              <p className="text-gray-400 text-xs mb-4">AI-scheduled sessions after this one</p>
              <div className="flex flex-col gap-3">
                {upcomingTasks.map((t, i) => {
                  const usc = subjectColors[t.subject] ?? defaultColor;
                  const upc = priorityConfig[t.priority];
                  return (
                    <div key={t.id} className="flex items-start gap-3 p-3.5 rounded-2xl border border-gray-100 bg-gray-50/50">
                      <div className="flex flex-col items-center gap-1 pt-0.5">
                        <span className="text-xs font-bold text-gray-300">{i + 2}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${upc.dot}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm leading-tight">{t.title}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${usc.bg} ${usc.text}`}>
                            {t.subject}
                          </span>
                          <span className="text-xs text-gray-400">{t.scheduledStart}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{t.estimatedMinutes}m</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI insight card */}
            <div className="bg-gray-900 rounded-3xl p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✦</span>
                <h3 className="font-bold text-sm">AI Insights</h3>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed mb-4">
                Time spent, progress updates, and your notes are used to refine your future schedule and detect peak focus hours.
              </p>

              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-xs text-gray-400">Sessions today</span>
                  <span className="text-sm font-bold text-teal-400">{completedSessions.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-xs text-gray-400">Total study time</span>
                  <span className="text-sm font-bold text-teal-400 font-mono">
                    {(() => {
                      const t = formatTime(totalStudyTime + elapsed);
                      return `${t.hours}:${t.minutes}:${t.seconds}`;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-gray-400">Current task</span>
                  <span className="text-sm font-bold text-teal-400">{progress}% done</span>
                </div>
              </div>

              {completedSessions.length === 0 && status === "idle" && (
                <p className="text-xs text-gray-600 mt-3 text-center">Start a session to begin tracking</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}