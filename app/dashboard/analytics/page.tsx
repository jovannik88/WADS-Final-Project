"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

type Range = "week" | "month" | "all";

interface AnalyticsData {
  completedTasksCount: number;
  completedTasksDiff: number;
  avgDailyFocusHours: number;
  avgDailyFocusDiff: number;
  totalFocusHours: number;
  subjectCount: number;
  studyStreak: number;
  weeklyStudyHours: { day: string; hours: number }[];
  subjectBreakdown: { subject: string; hours: number; color: string }[];
  tasksByPriority: { priority: string; completed: number; pending: number }[];
  scheduledVsActual: { subject: string; scheduled: number; actual: number }[];
  peakHours: { hour: string; sessions: number }[];
  aiSummary: {
    peakFocusWindow: string;
    completionRate: number;
    completionRateDiff: number;
    accuracyGap: string;
    totalSessions: number;
    avgFocusScore: number;
  };
  recentSessions: {
    subject: string;
    duration: string;
    focusScore: number | null;
    date: string;
    startedAt: string;
  }[];
}

const SUBJECT_COLORS: Record<string, string> = {
  Math: "#3b82f6", English: "#8b5cf6",
  Physics: "#10b981", "Computer Science": "#0d9488",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3 py-2.5 rounded-xl text-xs shadow-xl border border-gray-800">
      <p className="font-semibold mb-1.5 text-gray-300">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color ?? p.fill }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-bold text-white">{p.value}{p.unit ?? ""}</span>
        </div>
      ))}
    </div>
  );
};

const SectionHeader = ({ title, sub }: { title: string; sub: string }) => (
  <div className="mb-5">
    <h2 className="font-bold text-gray-900 text-base">{title}</h2>
    <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
  </div>
);

function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
      <span className="text-3xl">📭</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [range, setRange] = useState<Range>("week");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (r: Range) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?range=${r}`);
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) throw new Error("Failed to load analytics");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Could not load analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchAnalytics(range); }, [range, fetchAnalytics]);

  const statCards = data ? [
    {
      label: "Tasks Completed",
      value: String(data.completedTasksCount),
      sub: data.completedTasksDiff >= 0
        ? `+${data.completedTasksDiff} vs previous period`
        : `${data.completedTasksDiff} vs previous period`,
      icon: "✓",
      accent: "bg-white",
      iconBg: "bg-teal-50 text-teal-600",
    },
    {
      label: "Avg. Daily Study",
      value: `${data.avgDailyFocusHours}h`,
      sub: data.avgDailyFocusDiff >= 0
        ? `+${data.avgDailyFocusDiff}h vs previous period`
        : `${data.avgDailyFocusDiff}h vs previous period`,
      icon: "🔥",
      accent: "bg-orange-50",
      iconBg: "bg-orange-100 text-orange-500",
    },
    {
      label: "Total Study Time",
      value: `${data.totalFocusHours}h`,
      sub: `${data.aiSummary.totalSessions} sessions`,
      icon: "⏱",
      accent: "bg-teal-50",
      iconBg: "bg-teal-100 text-teal-600",
    },
    {
      label: "Study Streak",
      value: `${data.studyStreak}d`,
      sub: `${data.subjectCount} active subject${data.subjectCount !== 1 ? "s" : ""}`,
      icon: "🔁",
      accent: "bg-white",
      iconBg: "bg-gray-100 text-gray-600",
    },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-7">

        {/* ── Header ── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Analytics</h1>
            <p className="text-gray-400 mt-1.5 text-sm">Track your study productivity and patterns</p>
          </div>
          <div className="flex items-center bg-white border border-gray-200 rounded-2xl p-1 gap-1 shadow-sm">
            {(["week", "month", "all"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                disabled={loading}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize disabled:opacity-50 ${
                  range === r ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {r === "all" ? "All time" : `This ${r}`}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl px-5 py-4 text-sm flex items-center gap-3">
            <span>⚠️</span> {error}
            <button onClick={() => fetchAnalytics(range)} className="ml-auto underline text-red-500 hover:text-red-700">Retry</button>
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-28 animate-pulse">
                  <div className="h-3 bg-gray-100 rounded w-2/3 mb-4" />
                  <div className="h-8 bg-gray-100 rounded w-1/2 mb-2" />
                  <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                </div>
              ))
            : statCards.map((card) => (
                <div key={card.label} className={`${card.accent} rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 font-medium leading-tight">{card.label}</p>
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${card.iconBg}`}>
                      {card.icon}
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">{card.value}</p>
                    <p className={`text-xs mt-1 ${
                      card.sub.startsWith("+") ? "text-teal-600" :
                      card.sub.startsWith("-") ? "text-red-400" : "text-gray-400"
                    }`}>{card.sub}</p>
                  </div>
                </div>
              ))
          }
        </div>

        {/* ── Row 1: Daily hours + Subject pie ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <SectionHeader title="Daily Study Hours" sub="Study sessions grouped by day of week" />
            {loading ? <Spinner /> : !data?.weeklyStudyHours.length ? (
              <EmptyState message="No sessions logged in this period" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.weeklyStudyHours} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="h" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="hours" fill="#0d9488" radius={[6, 6, 0, 0]} name="Hours" unit="h" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <SectionHeader title="Subject Breakdown" sub="Study time split by subject" />
            {loading ? <Spinner /> : !data?.subjectBreakdown.length ? (
              <EmptyState message="Log sessions with subjects to see breakdown" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={data.subjectBreakdown} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="hours">
                      {data.subjectBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} formatter={(v: any) => [`${v}h`, "Hours"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 mt-3">
                  {data.subjectBreakdown.map((s) => (
                    <div key={s.subject} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-gray-600 font-medium">{s.subject}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-700">{s.hours}h</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Row 2: Tasks by Priority ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <SectionHeader title="Scheduled vs Actual Duration" sub="Avg. estimated time vs avg. actual session time per subject (minutes)" />
            {loading ? <Spinner /> : !data?.scheduledVsActual.length ? (
              <EmptyState message="Add tasks with estimated durations and log sessions to compare" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.scheduledVsActual} barGap={4} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="subject" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="m" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                  <Bar dataKey="scheduled" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Estimated" unit="m" />
                  <Bar dataKey="actual"    fill="#0d9488" radius={[4, 4, 0, 0]} name="Actual"    unit="m" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <SectionHeader title="Tasks by Priority" sub="Completed vs pending per priority level" />
            {loading ? <Spinner /> : !data?.tasksByPriority.length ? (
              <EmptyState message="No tasks yet" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.tasksByPriority} layout="vertical" barSize={13}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="priority" type="category" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} width={52} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="completed" fill="#0d9488" name="Completed" stackId="a" />
                    <Bar dataKey="pending"   fill="#e5e7eb" radius={[0, 4, 4, 0]} name="Pending" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 justify-center mt-3">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-teal-500 inline-block" />Completed</span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200 inline-block" />Pending</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Row 3: Peak hours + AI summary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <SectionHeader title="Peak Study Hours" sub="Number of sessions started per hour of day" />
            {loading ? <Spinner /> : !data?.peakHours.some(h => h.sessions > 0) ? (
              <EmptyState message="Log study sessions to discover your peak hours" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.peakHours} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={1} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="sessions" name="Sessions" radius={[4, 4, 0, 0]}>
                      {data.peakHours.map((e, i) => (
                        <Cell key={i} fill={e.sessions >= 7 ? "#0d9488" : e.sessions >= 3 ? "#5eead4" : e.sessions > 0 ? "#99f6e4" : "#e2e8f0"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-end gap-4 mt-3">
                  {[["bg-gray-200","None"], ["bg-teal-200","Low"], ["bg-teal-300","Medium"], ["bg-teal-600","Peak"]].map(([bg, label]) => (
                    <span key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span className={`w-2.5 h-2.5 rounded-sm ${bg} inline-block`} />{label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* AI Summary */}
          <div className="bg-gray-900 rounded-3xl p-6 text-white flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">✦</span>
              <h2 className="font-bold text-sm">AI Summary</h2>
              {loading && <div className="ml-auto w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
            </div>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 bg-white/5 rounded-2xl animate-pulse">
                  <div className="h-2.5 bg-white/10 rounded w-1/2 mb-2" />
                  <div className="h-5 bg-white/10 rounded w-2/3 mb-1.5" />
                  <div className="h-2 bg-white/10 rounded w-3/4" />
                </div>
              ))
            ) : data ? [
              {
                label: "Peak Focus Window",
                value: data.aiSummary.peakFocusWindow,
                sub: `Based on ${data.aiSummary.totalSessions} session${data.aiSummary.totalSessions !== 1 ? "s" : ""}`,
              },
              {
                label: "Completion Rate",
                value: `${data.aiSummary.completionRate}%`,
                sub: data.aiSummary.completionRateDiff >= 0
                  ? `↑ ${data.aiSummary.completionRateDiff}% vs previous period`
                  : `↓ ${Math.abs(data.aiSummary.completionRateDiff)}% vs previous period`,
              },
              {
                label: "Accuracy Gap",
                value: data.aiSummary.accuracyGap,
                sub: data.aiSummary.accuracyGap === "On schedule" ? "Great estimation!" : "Consistently over-running",
              },
              {
                label: "Avg Focus Score",
                value: data.aiSummary.avgFocusScore > 0 ? `${data.aiSummary.avgFocusScore}/100` : "—",
                sub: data.aiSummary.avgFocusScore >= 80 ? "Excellent focus" : data.aiSummary.avgFocusScore >= 60 ? "Good focus" : "Track sessions to improve",
              },
            ].map((item) => (
              <div key={item.label} className="p-3 bg-white/5 rounded-2xl">
                <p className="text-xs text-teal-400 font-semibold uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-white font-bold text-base">{item.value}</p>
                <p className="text-gray-400 text-xs mt-0.5">{item.sub}</p>
              </div>
            )) : null}
          </div>
        </div>

        {/* ── Recent Sessions ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <SectionHeader title="Recent Study Sessions" sub="Last 5 logged sessions" />
          {loading ? <Spinner /> : !data?.recentSessions.length ? (
            <EmptyState message="No study sessions logged yet. Start a Pomodoro session to track your time!" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Subject", "Duration", "Focus Score", "Date"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest pb-3 pr-6">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recentSessions.map((s, i) => {
                    const color = SUBJECT_COLORS[s.subject] ?? "#6b7280";
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3.5 pr-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                            style={{ backgroundColor: color + "15", color }}>
                            {s.subject}
                          </span>
                        </td>
                        <td className="py-3.5 pr-6 font-mono text-gray-700 text-sm">{s.duration}</td>
                        <td className="py-3.5 pr-6">
                          {s.focusScore != null ? (
                            <div className="flex items-center gap-2.5">
                              <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${s.focusScore}%`, backgroundColor: s.focusScore >= 80 ? "#0d9488" : "#5eead4" }}
                                />
                              </div>
                              <span className={`text-xs font-bold ${s.focusScore >= 80 ? "text-teal-600" : "text-gray-600"}`}>
                                {s.focusScore}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 text-gray-400 text-xs">{s.date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}