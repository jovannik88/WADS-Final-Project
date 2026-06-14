"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAiSync } from "@/lib/ai-sync-context";

interface Task {
  id: number;
  title: string;
  subject: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  dueDate: string | null;
  aiScore: number | null;
  aiReason: string | null;
}

interface Analytics {
  completedTasksCount: number;
  studyStreak: number;
  totalFocusHours: number;
  aiSummary: { completionRate: number };
  // total tasks derived from task list
}

interface AIPrioritized {
  taskId: number;
  aiScore: number;
  aiReason: string;
  suggestedOrder: number;
}

interface ScheduleBlock {
  startHour: number;
  endHour: number;
  taskTitle: string;
  blockType: "focus" | "break" | "buffer";
  durationMin: number;
}

const PRIORITY_BAR: Record<string, string> = {
  HIGH: "bg-red-400",
  MEDIUM: "bg-amber-400",
  LOW: "bg-slate-300",
};

const PRIORITY_BADGE: Record<string, string> = {
  HIGH: "bg-red-50 text-red-500 ring-1 ring-inset ring-red-200",
  MEDIUM: "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200",
  LOW: "bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200",
};

function formatHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function formatFocusTime(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const { prioritized, scheduleBlocks, analysedAt, refreshing: loadingAI, refreshFromDB } = useAiSync();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [userName, setUserName] = useState("there");
  const [loadingData, setLoadingData] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, analyticsRes] = await Promise.all([
        fetch("/api/tasks"),          // all tasks so we can count completed vs total
        fetch("/api/analytics?range=week"),
      ]);

      if (tasksRes.status === 401 || analyticsRes.status === 401) {
        router.push("/login");
        return;
      }

      const tasksData = await tasksRes.json();
      const analyticsData = await analyticsRes.json();

      const allFetched: Task[] = tasksData.tasks ?? [];
      // Dashboard pending list shows only non-completed tasks
      setTasks(allFetched.filter((t: Task) => t.status !== "COMPLETED"));
      setAnalytics({ ...analyticsData, _totalTasks: allFetched.length, _completedTasks: allFetched.filter((t: Task) => t.status === "COMPLETED").length });
      return allFetched.filter((t: Task) => t.status !== "COMPLETED");
    } catch {
      toast.error("Failed to load dashboard data");
      return [];
    } finally {
      setLoadingData(false);
    }
  }, [router]);

  // On mount: load current AI state from DB (read-only, no generation)
  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const orderedTasks = [...tasks].sort((a, b) => {
    const scoreA = prioritized.find((p) => p.taskId === a.id)?.aiScore ?? (a.aiScore ?? 0);
    const scoreB = prioritized.find((p) => p.taskId === b.id)?.aiScore ?? (b.aiScore ?? 0);
    return scoreB - scoreA;
  });

  const pendingCount = tasks.filter((t) => t.status === "PENDING").length;
  const focusBlocks = scheduleBlocks.filter((b) => b.blockType === "focus");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {mounted ? greeting() : "Good day"}, {userName} 👋
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              {loadingData
                ? "Loading your workspace..."
                : pendingCount > 0
                  ? `You have ${pendingCount} pending task${pendingCount > 1 ? "s" : ""}. Let's stay on track!`
                  : "All caught up! Great work today."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {mounted && analysedAt && !loadingAI && (
              <span className="text-xs text-gray-400">
                Analysed {analysedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              id="run-ai-btn"
              onClick={refreshFromDB}
              disabled={loadingAI}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-lg shadow-teal-100 transition-all active:scale-[0.97]"
            >
              {loadingAI ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <span>✦</span>
              )}
              {loadingAI ? "Analysing..." : "Run AI Analysis"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            {
              label: "Tasks Done",
              value: analytics
                ? `${(analytics as any)._completedTasks ?? analytics.completedTasksCount}/${(analytics as any)._totalTasks ?? "?"}`
                : "—",
              icon: "🕐",
              accent: "bg-white border-gray-100",
            },
            {
              label: "Study Streak",
              value: analytics ? `${analytics.studyStreak} days` : "—",
              icon: "🔥",
              accent: "bg-orange-50 border-orange-100",
            },
            {
              label: "Focus Time",
              value: analytics ? `${analytics.totalFocusHours}h` : "—",
              icon: "⏱️",
              accent: "bg-cyan-50 border-cyan-100",
            },
            {
              label: "Completion",
              value: analytics ? `${analytics.aiSummary?.completionRate ?? 0}%` : "—",
              icon: "📊",
              accent: "bg-white border-gray-100",
            },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border p-4 shadow-sm ${s.accent}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">{s.label}</p>
                <span className="text-lg">{s.icon}</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Task list */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Tasks
                {prioritized.length > 0 && (
                  <span className="ml-2 text-xs font-medium bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
                    AI sorted
                  </span>
                )}
              </h2>
              <Link href="/dashboard/tasks" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
                View all →
              </Link>
            </div>

            {loadingData ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl h-16 animate-pulse border border-gray-100" />
                ))}
              </div>
            ) : orderedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
                <span className="text-4xl mb-3">🎉</span>
                <p className="font-semibold text-gray-700">No pending tasks</p>
                <p className="text-sm text-gray-400 mt-1">Add tasks to get AI-powered suggestions</p>
                <Link href="/dashboard/tasks" className="mt-4 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors">
                  Add Task
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {orderedTasks.slice(0, 5).map((task) => {
                  const aiEntry = prioritized.find((p) => p.taskId === task.id);
                  return (
                    <div
                      key={task.id}
                      className="relative flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${PRIORITY_BAR[task.priority]}`} />
                      <div className="flex-1 min-w-0 pl-2">
                        <p className="font-semibold text-gray-900 text-sm truncate">{task.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {task.subject ?? "General"}
                          {aiEntry && <span className="ml-2 text-teal-600">· AI score {aiEntry.aiScore.toFixed(0)}</span>}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-xl capitalize ${PRIORITY_BADGE[task.priority]}`}>
                        {task.priority.toLowerCase()}
                      </span>
                      {task.dueDate && (
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI panel */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">✦ AI Suggestions</h2>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex flex-col gap-4">
              {prioritized.length === 0 && scheduleBlocks.length === 0 ? (
                <div className="text-center py-6">
                  {loadingAI ? (
                    <>
                      <svg className="w-6 h-6 animate-spin text-teal-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-gray-400 text-sm">Analysing your tasks...</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-400 text-sm mb-3">Run AI analysis to get personalised suggestions</p>
                      <button
                        onClick={() => notifyChange("tasks")}
                        disabled={loadingAI}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors"
                      >
                        Analyse Now
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {prioritized[0] && (
                    <div className="border-b border-gray-50 pb-4">
                      <div className="flex items-start gap-2">
                        <span>⚠️</span>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Priority Alert</p>
                          <p className="text-gray-500 text-xs mt-1">
                            Start with &quot;{tasks.find((t) => t.id === prioritized[0].taskId)?.title}&quot; — {prioritized[0].aiReason}.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {prioritized.length > 0 && (
                    <div className="border-b border-gray-50 pb-4">
                      <div className="flex items-start gap-2">
                        <span>✨</span>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Recommended Order</p>
                          <ol className="text-gray-500 text-xs mt-1 space-y-0.5">
                            {prioritized.slice(0, 3).map((p, i) => (
                              <li key={p.taskId}>
                                {i + 1}. {tasks.find((t) => t.id === p.taskId)?.title ?? `Task #${p.taskId}`}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}

                  {focusBlocks.length > 0 && (
                    <div>
                      <div className="flex items-start gap-2">
                        <span>🕐</span>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Study Schedule</p>
                          <div className="text-gray-500 text-xs mt-1 space-y-0.5">
                            {focusBlocks.slice(0, 3).map((b, i) => (
                              <p key={i}>
                                {formatHour(b.startHour)}–{formatHour(b.endHour)} · {b.taskTitle}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Link
                href="/dashboard/ai"
                className="mt-1 block text-center text-sm font-bold text-white py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors"
              >
                Open AI Assistant
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}