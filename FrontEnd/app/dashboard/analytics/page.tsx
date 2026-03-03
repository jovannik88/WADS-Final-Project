"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — replace each block with a fetch() / useEffect in production.
// Table sources are noted per block so the backend dev knows exactly what to query.
// ─────────────────────────────────────────────────────────────────────────────

// Source: Task (status=completed) COUNT, StudySession SUM(actual_duration_minutes),
//         Task DISTINCT(subject) COUNT, User(peak_study_start_time / peak_study_end_time)
const statCards = [
  { label: "Tasks Completed",   value: "12",    sub: "+3 this week",        icon: "✓",  accent: "bg-white",       iconBg: "bg-teal-50 text-teal-600" },
  { label: "Avg. Daily Study",  value: "2.8h",  sub: "+0.3h vs last week",  icon: "🔥", accent: "bg-orange-50",   iconBg: "bg-orange-100 text-orange-500" },
  { label: "Total Study Time",  value: "19.4h", sub: "This week",           icon: "⏱",  accent: "bg-teal-50",     iconBg: "bg-teal-100 text-teal-600" },
  { label: "Subjects Tracked",  value: "4",     sub: "Active subjects",     icon: "📚", accent: "bg-white",       iconBg: "bg-gray-100 text-gray-600" },
];

// Source: StudySession GROUP BY DATE(scheduled_date), SUM(actual_duration_minutes)/60
const weeklyStudyHours = [
  { day: "Mon", hours: 2.5 }, { day: "Tue", hours: 3.1 },
  { day: "Wed", hours: 1.8 }, { day: "Thu", hours: 3.5 },
  { day: "Fri", hours: 2.9 }, { day: "Sat", hours: 3.8 },
  { day: "Sun", hours: 1.8 },
];

// Source: Task JOIN StudySession ON task_id, GROUP BY Task.subject, SUM(actual_duration_minutes)/60
const subjectBreakdown = [
  { subject: "Math",             hours: 7.2,  color: "#3b82f6" },
  { subject: "English",          hours: 4.5,  color: "#8b5cf6" },
  { subject: "Physics",          hours: 3.8,  color: "#10b981" },
  { subject: "Computer Science", hours: 5.9,  color: "#0d9488" },
];

// Source: StudySession GROUP BY WEEK,
//         AVG(completion_percentage), SUM(actual_duration_minutes), SUM(scheduled_end_time - scheduled_start_time)
const completionTrend = [
  { week: "W1", scheduled: 90, actual: 72, completion: 65 },
  { week: "W2", scheduled: 95, actual: 80, completion: 74 },
  { week: "W3", scheduled: 85, actual: 78, completion: 79 },
  { week: "W4", scheduled: 100, actual: 88, completion: 83 },
  { week: "W5", scheduled: 90, actual: 85, completion: 86 },
];

// Source: Task GROUP BY priority_level,
//         COUNT WHERE status='completed' and status='pending'
const tasksByPriority = [
  { priority: "High",   completed: 5, pending: 3 },
  { priority: "Medium", completed: 4, pending: 4 },
  { priority: "Low",    completed: 3, pending: 2 },
];

// Source: Task JOIN StudySession,
//         AVG(estimated_duration_minutes) vs AVG(actual_duration_minutes) GROUP BY subject
const scheduledVsActual = [
  { subject: "Math",    scheduled: 90,  actual: 108 },
  { subject: "English", scheduled: 60,  actual: 52  },
  { subject: "Physics", scheduled: 45,  actual: 48  },
  { subject: "CS",      scheduled: 120, actual: 115 },
];

// Source: StudySession — COUNT sessions, check if actual_start_time falls within
//         AISuggestion scheduled window (suggestion followed = yes/no per month)
const aiAccuracy = [
  { month: "Nov", followed: 72, ignored: 28 },
  { month: "Dec", followed: 78, ignored: 22 },
  { month: "Jan", followed: 81, ignored: 19 },
  { month: "Feb", followed: 86, ignored: 14 },
];

// Source: StudySession GROUP BY HOUR(actual_start_time), COUNT(session_id)
const peakHours = [
  { hour: "6AM",  sessions: 1 }, { hour: "7AM",  sessions: 2 },
  { hour: "8AM",  sessions: 3 }, { hour: "9AM",  sessions: 4 },
  { hour: "10AM", sessions: 3 }, { hour: "11AM", sessions: 2 },
  { hour: "12PM", sessions: 2 }, { hour: "1PM",  sessions: 1 },
  { hour: "2PM",  sessions: 2 }, { hour: "3PM",  sessions: 3 },
  { hour: "4PM",  sessions: 4 }, { hour: "5PM",  sessions: 5 },
  { hour: "6PM",  sessions: 6 }, { hour: "7PM",  sessions: 9 },
  { hour: "8PM",  sessions: 8 }, { hour: "9PM",  sessions: 6 },
  { hour: "10PM", sessions: 3 }, { hour: "11PM", sessions: 1 },
];

// Source: StudySession WHERE completion_status='completed', most recent 5
const recentSessions = [
  { task: "CS Project Milestone",  subject: "Computer Science", duration: "2h 15m", completion: 85, date: "Today, 7PM" },
  { task: "Calculus Problem Set",  subject: "Math",             duration: "1h 48m", completion: 100, date: "Today, 5PM" },
  { task: "English Essay Draft",   subject: "English",          duration: "58m",    completion: 70,  date: "Yesterday" },
  { task: "Physics Lab Report",    subject: "Physics",          duration: "45m",    completion: 100, date: "Yesterday" },
  { task: "Calculus Problem Set",  subject: "Math",             duration: "2h 05m", completion: 90,  date: "Mon" },
];

// ─────────────────────────────────────────────────────────────────────────────

type Range = "week" | "month" | "all";

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

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("week");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-7">

        {/* ── Header ── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Analytics</h1>
            <p className="text-gray-400 mt-1.5 text-sm">Track your study productivity and patterns</p>
          </div>
          <div className="flex items-center bg-white border border-gray-200 rounded-2xl p-1 gap-1 shadow-sm">
            {(["week", "month", "all"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                  range === r ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {r === "all" ? "All time" : `This ${r}`}
              </button>
            ))}
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className={`${card.accent} rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3`}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 font-medium leading-tight">{card.label}</p>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${card.iconBg}`}>
                  {card.icon}
                </span>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 tracking-tight">{card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Row 1: Daily hours + Subject pie ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <SectionHeader title="Daily Study Hours" sub="StudySession · actual_duration_minutes grouped by day" />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyStudyHours} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="hours" fill="#0d9488" radius={[6, 6, 0, 0]} name="Hours" unit="h" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <SectionHeader title="Subject Breakdown" sub="Task JOIN StudySession · grouped by subject" />
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={subjectBreakdown} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="hours">
                  {subjectBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} formatter={(v: any) => [`${v}h`, "Hours"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 mt-3">
              {subjectBreakdown.map((s) => (
                <div key={s.subject} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-gray-600 font-medium">{s.subject}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-700">{s.hours}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 2: Progress trend + Task priority ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <SectionHeader title="Progress Trend" sub="StudySession · scheduled vs actual time vs completion_percentage by week" />
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                <Line type="monotone" dataKey="scheduled" stroke="#e5e7eb" strokeWidth={2} dot={false} name="Scheduled" unit="%" />
                <Line type="monotone" dataKey="actual" stroke="#0d9488" strokeWidth={2.5} dot={{ fill: "#0d9488", r: 4 }} name="Actual Time" unit="%" />
                <Line type="monotone" dataKey="completion" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="5 3" dot={{ fill: "#6366f1", r: 4 }} name="Completion" unit="%" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <SectionHeader title="Tasks by Priority" sub="Task · priority_level — completed vs pending" />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={tasksByPriority} layout="vertical" barSize={13}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="priority" type="category" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="completed" fill="#0d9488" radius={[0, 0, 0, 0]} name="Completed" stackId="a" />
                <Bar dataKey="pending"   fill="#e5e7eb" radius={[0, 4, 4, 0]} name="Pending"   stackId="a" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-3">
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-teal-500 inline-block" />Completed</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200 inline-block" />Pending</span>
            </div>
          </div>
        </div>

        {/* ── Row 3: Scheduled vs Actual + AI adherence ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <SectionHeader title="Scheduled vs Actual Duration" sub="Task.estimated_duration_minutes vs StudySession.actual_duration_minutes (avg, in min)" />
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={scheduledVsActual} barGap={4} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="subject" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="m" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                <Bar dataKey="scheduled" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Scheduled" unit="m" />
                <Bar dataKey="actual"    fill="#0d9488" radius={[4, 4, 0, 0]} name="Actual"    unit="m" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <SectionHeader title="AI Schedule Adherence" sub="AISuggestion — how often sessions matched AI-suggested schedule by month" />
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={aiAccuracy} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="followed" fill="#0d9488" radius={[0, 0, 0, 0]} name="Followed" unit="%" stackId="a" />
                <Bar dataKey="ignored"  fill="#fde68a" radius={[6, 6, 0, 0]} name="Ignored"  unit="%" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-3">
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-teal-500 inline-block" />Followed</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-200 inline-block" />Skipped</span>
            </div>
          </div>
        </div>

        {/* ── Row 4: Peak hours + AI summary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <SectionHeader title="Peak Study Hours" sub="StudySession · HOUR(actual_start_time) — updates User.peak_study_start_time / end_time" />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={peakHours} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={1} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="sessions" name="Sessions" radius={[4, 4, 0, 0]}>
                  {peakHours.map((e, i) => (
                    <Cell key={i} fill={e.sessions >= 7 ? "#0d9488" : e.sessions >= 4 ? "#5eead4" : "#e2e8f0"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-end gap-4 mt-3">
              {[["bg-gray-200", "Low"], ["bg-teal-300", "Medium"], ["bg-teal-600", "Peak"]].map(([bg, label]) => (
                <span key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className={`w-2.5 h-2.5 rounded-sm ${bg} inline-block`} />{label}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-3xl p-6 text-white flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <span className="text-lg">✦</span>
              <h2 className="font-bold text-sm">AI Summary</h2>
            </div>
            {[
              { label: "Peak Focus Window",   value: "7:00 – 9:00 PM",  sub: "Based on last 30 sessions" },
              { label: "Schedule Adherence",  value: "86%",             sub: "↑ 14% improvement over 4 months" },
              { label: "Accuracy Gap",        value: "Math +18 min",    sub: "Consistently over-estimated" },
              { label: "Completion Rate",     value: "78%",             sub: "+2% vs last week" },
            ].map((item) => (
              <div key={item.label} className="p-3 bg-white/5 rounded-2xl">
                <p className="text-xs text-teal-400 font-semibold uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-white font-bold text-base">{item.value}</p>
                <p className="text-gray-400 text-xs mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Row 5: Recent sessions ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <SectionHeader title="Recent Study Sessions" sub="StudySession · last 5 completed — actual_duration_minutes, completion_percentage, notes" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Task", "Subject", "Duration", "Completion", "Date"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest pb-3 pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentSessions.map((s, i) => {
                  const color = SUBJECT_COLORS[s.subject] ?? "#6b7280";
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3.5 pr-6 font-semibold text-gray-900">{s.task}</td>
                      <td className="py-3.5 pr-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: color + "15", color }}>
                          {s.subject}
                        </span>
                      </td>
                      <td className="py-3.5 pr-6 font-mono text-gray-700 text-sm">{s.duration}</td>
                      <td className="py-3.5 pr-6">
                        <div className="flex items-center gap-2.5">
                          <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${s.completion}%`, backgroundColor: s.completion === 100 ? "#0d9488" : "#5eead4" }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${s.completion === 100 ? "text-teal-600" : "text-gray-600"}`}>
                            {s.completion}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 text-gray-400 text-xs">{s.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}