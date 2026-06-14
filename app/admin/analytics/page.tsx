"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, CheckCircle, Clock, Brain, Bell, TrendingUp, RefreshCw } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalSessions: number;
  totalStudyHours: number;
  totalNotifications: number;
  aiGeneratedEvents: number;
  aiCacheEntries: number;
  tasksWithAiScore: number;
  avgAiScore: number;
  recentSignups: number;
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111b27] p-5 sm:p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, color }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-[28px] font-extrabold text-white tracking-tight">{value}</p>
      <p className="text-[13px] font-medium text-white/60 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/analytics");
    if (res.ok) setStats(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-400" /> System Analytics
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Platform-wide usage statistics</p>
        </div>
        <button onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] text-white/50 border border-white/[0.08] hover:border-white/[0.15] hover:text-white/80 transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-white/30 text-sm">Loading analytics...</div>
      ) : !stats ? (
        <div className="py-24 text-center text-white/30 text-sm">Failed to load data</div>
      ) : (
        <>
          {/* User stats */}
          <p className="text-[11px] uppercase tracking-widest text-teal-400 font-semibold mb-3">Users</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="#14b8a6"
              sub={`+${stats.recentSignups} this week`} />
            <StatCard icon={TrendingUp} label="New This Week" value={stats.recentSignups} color="#6366f1" />
            <StatCard icon={Clock} label="Total Study Hours" value={`${stats.totalStudyHours}h`} color="#f59e0b"
              sub={`${stats.totalSessions} sessions`} />
            <StatCard icon={Bell} label="Notifications Sent" value={stats.totalNotifications} color="#ec4899" />
          </div>

          {/* Task stats */}
          <p className="text-[11px] uppercase tracking-widest text-teal-400 font-semibold mb-3">Tasks</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={CheckCircle} label="Total Tasks" value={stats.totalTasks} color="#22c55e" />
            <StatCard icon={CheckCircle} label="Completed" value={stats.completedTasks} color="#22c55e"
              sub={`${stats.completionRate}% completion rate`} />
            <StatCard icon={Brain} label="AI Scored Tasks" value={stats.tasksWithAiScore} color="#14b8a6"
              sub={`Avg score: ${stats.avgAiScore}/100`} />
            <StatCard icon={Brain} label="AI Calendar Events" value={stats.aiGeneratedEvents} color="#8b5cf6" />
          </div>

          {/* AI stats */}
          <p className="text-[11px] uppercase tracking-widest text-teal-400 font-semibold mb-3">AI System</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard icon={Brain} label="AI Cache Entries" value={stats.aiCacheEntries} color="#14b8a6"
              sub="Unique users who ran AI analysis" />
            <StatCard icon={Brain} label="Avg AI Priority Score" value={`${stats.avgAiScore}/100`} color="#6366f1" />
            <StatCard icon={CheckCircle} label="Task Completion Rate" value={`${stats.completionRate}%`} color="#22c55e" />
          </div>

          {/* Completion rate bar */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#111b27] p-6">
            <p className="text-[13px] font-semibold text-white/70 mb-4">Task Completion Overview</p>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1 h-3 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${stats.completionRate}%`, background: "linear-gradient(90deg, #14b8a6, #0d9488)" }} />
              </div>
              <span className="text-[14px] font-bold text-teal-400 w-12 text-right">{stats.completionRate}%</span>
            </div>
            <div className="flex justify-between text-[11px] text-white/30 mt-1">
              <span>{stats.completedTasks} completed</span>
              <span>{stats.totalTasks - stats.completedTasks} pending</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
