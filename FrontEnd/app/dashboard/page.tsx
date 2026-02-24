"use client";

import { useState } from "react";

const tasks = [
  { title: "CS Project Milestone", subject: "Computer Science", duration: "150 min", priority: "high", date: "Feb 24" },
  { title: "CS Project Milestone", subject: "Computer Science", duration: "150 min", priority: "high", date: "Feb 24" },
  { title: "CS Project Milestone", subject: "Computer Science", duration: "150 min", priority: "high", date: "Feb 24" },
  { title: "English Essay Draft", subject: "English", duration: "60 min", priority: "medium", date: "Feb 24" },
];

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-500",
  medium: "bg-orange-100 text-orange-400",
  low: "bg-green-100 text-green-500",
};

const priorityBar: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-orange-400",
  low: "bg-green-500",
};

export default function DashboardPage() {
  const [greeting] = useState("Good evening");

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{greeting}, Jean</h1>
        <p className="text-gray-500 mt-1">You have 3 urgent tasks due soon. Let&apos;s stay on track!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Tasks Done" value="1/6" sub="+2 today" icon="🕐" />
        <StatCard label="Study streak" value="5 days" sub="" icon="🔥" accent="bg-orange-50 border-orange-100" />
        <StatCard label="Focus Time" value="3h 20min" sub="today" icon="⏱️" accent="bg-cyan-50 border-cyan-100" />
        <StatCard label="Completion Rate" value="78%" sub="+2% this week" icon="📊" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Upcoming Tasks */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Upcoming Tasks</h2>
            <button className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-700">
              View all →
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {tasks.map((task, i) => (
              <div key={i} className="bg-white rounded-xl flex items-center gap-4 px-4 py-3 shadow-sm border border-gray-100">
                <div className={`w-1 h-10 rounded-full ${priorityBar[task.priority]}`} />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{task.title}</p>
                  <p className="text-sm text-gray-400">{task.subject} · {task.duration}</p>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${priorityColors[task.priority]}`}>
                  {task.priority}
                </span>
                <span className="text-sm text-gray-400 ml-2">{task.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Suggestions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">✨ AI Suggestions</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-4">
            <div className="border-b pb-4">
              <div className="flex items-start gap-2">
                <span>⚠️</span>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Priority Alert</p>
                  <p className="text-gray-500 text-xs mt-1">CS Project is due tomorrow! Consider starting with that first</p>
                </div>
              </div>
            </div>
            <div className="border-b pb-4">
              <div className="flex items-start gap-2">
                <span>✨</span>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Recommended Order</p>
                  <p className="text-gray-500 text-xs mt-1">
                    1. CS Project Milestone<br />
                    2. Calculus Problem Set 5<br />
                    3. Physics Lab Report
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start gap-2">
                <span>🕐</span>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Optimal Study Time</p>
                  <p className="text-gray-500 text-xs mt-1">Based on your patterns, 7-9 PM is your peak focus window.</p>
                </div>
              </div>
            </div>
            <button className="mt-2 w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
              Open AI Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "bg-white border-gray-100",
}: {
  label: string;
  value: string;
  sub: string;
  icon: string;
  accent?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${accent}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}