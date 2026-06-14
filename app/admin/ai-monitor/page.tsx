"use client";

import { useEffect, useState } from "react";
import { Bot, Brain, Bell, RefreshCw, TrendingUp, Star } from "lucide-react";

interface AiStats {
  totalAiRequests: number;
  aiGeneratedEvents: number;
  aiAlertNotifications: number;
  tasksWithScore: number;
  avgScore: number;
  scoreDistribution: { high: number; medium: number; low: number };
  recentActivity: { email: string; at: string }[];
}

export default function AdminAiMonitorPage() {
  const [stats, setStats] = useState<AiStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/ai-usage");
    if (res.ok) setStats(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-teal-400" /> AI Monitor
          </h1>
          <p className="text-white/40 text-sm mt-0.5">AI feature usage across the platform</p>
        </div>
        <button onClick={fetch_}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] text-white/50 border border-white/[0.08] hover:border-white/[0.15] hover:text-white/80 transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-white/30 text-sm">Loading AI stats...</div>
      ) : !stats ? (
        <div className="py-24 text-center text-white/30 text-sm">Failed to load</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Brain, label: "AI Analyses Run", value: stats.totalAiRequests, color: "#14b8a6" },
              { icon: TrendingUp, label: "AI Calendar Blocks", value: stats.aiGeneratedEvents, color: "#6366f1" },
              { icon: Bell, label: "AI Alerts Sent", value: stats.aiAlertNotifications, color: "#f59e0b" },
              { icon: Star, label: "Avg Priority Score", value: `${stats.avgScore}/100`, color: "#22c55e" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="rounded-2xl border border-white/[0.07] bg-[#111b27] p-5">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${color}18`, color }}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-[26px] font-extrabold text-white tracking-tight">{value}</p>
                <p className="text-[12px] text-white/50 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Score distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            <div className="rounded-2xl border border-white/[0.07] bg-[#111b27] p-6">
              <p className="text-[13px] font-semibold text-white/70 mb-5">Priority Score Distribution</p>
              {[
                { label: "High (80-100)", count: stats.scoreDistribution.high, color: "#ef4444", total: stats.tasksWithScore },
                { label: "Medium (50-79)", count: stats.scoreDistribution.medium, color: "#f59e0b", total: stats.tasksWithScore },
                { label: "Low (0-49)", count: stats.scoreDistribution.low, color: "#22c55e", total: stats.tasksWithScore },
              ].map(({ label, count, color, total }) => (
                <div key={label} className="mb-4 last:mb-0">
                  <div className="flex justify-between text-[12px] mb-1.5">
                    <span className="text-white/50">{label}</span>
                    <span className="text-white/70 font-medium">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: total > 0 ? `${Math.round((count / total) * 100)}%` : "0%", background: color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#111b27] p-6">
              <p className="text-[13px] font-semibold text-white/70 mb-4">Recent AI Usage</p>
              {stats.recentActivity.length === 0 ? (
                <p className="text-[13px] text-white/30">No recent activity</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {stats.recentActivity.map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: "rgba(20,184,166,0.12)", color: "#14b8a6", border: "1px solid rgba(20,184,166,0.2)" }}>
                          {a.email[0].toUpperCase()}
                        </div>
                        <span className="text-[12px] text-white/60 truncate max-w-[160px]">{a.email}</span>
                      </div>
                      <span className="text-[11px] text-white/30 flex-shrink-0">
                        {new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tasks scored info */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#111b27] p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-white/70">AI-Scored Tasks</p>
              <span className="text-[13px] font-bold text-teal-400">{stats.tasksWithScore} tasks</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full" style={{
                width: "100%",
                background: "linear-gradient(90deg, #14b8a6, #6366f1)"
              }} />
            </div>
            <p className="text-[11px] text-white/30 mt-2">
              All {stats.tasksWithScore} tasks have been evaluated by the AI prioritization engine
            </p>
          </div>
        </>
      )}
    </div>
  );
}
