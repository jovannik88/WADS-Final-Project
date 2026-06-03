"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type NotifType = "REMINDER" | "AI_ALERT" | "DEADLINE" | "ACHIEVEMENT";
type Filter = "all" | "REMINDER" | "AI_ALERT" | "DEADLINE" | "ACHIEVEMENT";

interface Notif {
  id: number;
  title: string;
  body: string;
  type: NotifType;
  read: boolean;
  createdAt: string;
}

const CFG: Record<NotifType, { label: string; icon: string; iconBg: string; iconColor: string; badge: string; action?: { label: string; href: string } }> = {
  REMINDER:    { label: "Sessions",    icon: "⏱",  iconBg: "bg-teal-50",   iconColor: "text-teal-600",   badge: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",   action: { label: "Open Timer", href: "/dashboard/timer" } },
  AI_ALERT:    { label: "AI Updates",  icon: "✦",   iconBg: "bg-violet-50", iconColor: "text-violet-600", badge: "bg-violet-50 text-violet-700 ring-1 ring-violet-200", action: { label: "View Calendar", href: "/dashboard/calendar" } },
  DEADLINE:    { label: "Deadlines",   icon: "📅",  iconBg: "bg-red-50",    iconColor: "text-red-500",    badge: "bg-red-50 text-red-600 ring-1 ring-red-200",        action: { label: "View Tasks", href: "/dashboard/tasks" } },
  ACHIEVEMENT: { label: "Achievements",icon: "🏆",  iconBg: "bg-orange-50", iconColor: "text-orange-500", badge: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",action: { label: "View Analytics", href: "/dashboard/analytics" } },
};

const TABS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "REMINDER", label: "Sessions" },
  { id: "DEADLINE", label: "Deadlines" },
  { id: "AI_ALERT", label: "AI Updates" },
  { id: "ACHIEVEMENT", label: "Achievements" },
];

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

// Strip internal dedup markers from displayed body
function cleanBody(body: string) { return body.replace(/\s*\[[^\]]+\]\s*$/, ""); }

export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setNotifs(data.notifications ?? []);
    } catch {}
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: number) => {
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  };

  const markAllRead = async () => {
    setNotifs(p => p.map(n => ({ ...n, read: true })));
    await Promise.all(notifs.filter(n => !n.read).map(n => fetch(`/api/notifications/${n.id}`, { method: "PATCH" })));
  };

  const deleteOne = async (id: number) => {
    setNotifs(p => p.filter(n => n.id !== id));
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
  };

  const clearAll = async () => {
    setNotifs([]);
    await fetch("/api/notifications", { method: "DELETE" });
  };

  const filtered = notifs.filter(n => {
    if (filter !== "all" && n.type !== filter) return false;
    if (unreadOnly && n.read) return false;
    return true;
  });

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-7">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-teal-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{unreadCount}</span>
              )}
            </div>
            <p className="text-gray-400 mt-1.5 text-sm">Stay up to date with your sessions, deadlines, and AI updates</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 bg-white border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-2xl transition-all font-medium shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                Mark all read
              </button>
            )}
            {notifs.length > 0 && (
              <button onClick={clearAll} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 bg-white border border-gray-200 hover:border-red-200 px-4 py-2 rounded-2xl transition-all font-medium shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.entries(CFG) as [NotifType, typeof CFG[NotifType]][]).map(([type, cfg]) => {
            const count = notifs.filter(n => n.type === type && !n.read).length;
            return (
              <button key={type} onClick={() => setFilter(type)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${filter === type ? "bg-gray-900 border-gray-900 shadow-sm" : "bg-white border-gray-100 hover:border-gray-200 shadow-sm"}`}>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${filter === type ? "bg-white/10" : cfg.iconBg}`}>{cfg.icon}</span>
                <div>
                  <p className={`text-xs font-semibold ${filter === type ? "text-white" : "text-gray-700"}`}>{cfg.label}</p>
                  <p className="text-xs mt-0.5 text-gray-400">{count > 0 ? `${count} unread` : "All read"}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center bg-white border border-gray-200 rounded-2xl p-1 gap-1 shadow-sm overflow-x-auto">
            {TABS.map(tab => {
              const count = notifs.filter(n => (tab.id === "all" || n.type === tab.id) && !n.read).length;
              return (
                <button key={tab.id} onClick={() => setFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${filter === tab.id ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
                  {tab.label}
                  {count > 0 && <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${filter === tab.id ? "bg-white/20 text-white" : "bg-teal-50 text-teal-600"}`}>{count}</span>}
                </button>
              );
            })}
          </div>
          <button onClick={() => setUnreadOnly(p => !p)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all border shadow-sm ${unreadOnly ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-500 border-gray-200 hover:text-gray-800"}`}>
            <span className={`w-2 h-2 rounded-full ${unreadOnly ? "bg-white" : "bg-teal-500"}`}/>
            Unread only
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-3xl">🔔</div>
            <div>
              <p className="font-bold text-gray-900 text-base">All clear!</p>
              <p className="text-gray-400 text-sm mt-1">{unreadOnly ? "No unread notifications." : "No notifications here yet."}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(n => {
              const cfg = CFG[n.type];
              return (
                <div key={n.id} className={`group relative bg-white rounded-3xl border transition-all ${!n.read ? "border-teal-100 shadow-sm shadow-teal-50" : "border-gray-100 shadow-sm"}`}>
                  {!n.read && <span className="absolute top-5 right-5 w-2.5 h-2.5 bg-teal-500 rounded-full"/>}
                  <div className="p-5 flex gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.iconBg}`}>
                      <span className={`text-base ${cfg.iconColor}`}>{cfg.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className={`text-sm font-bold leading-tight ${n.read ? "text-gray-700" : "text-gray-900"}`}>{n.title}</p>
                      <p className={`text-sm leading-relaxed mt-1 ${n.read ? "text-gray-400" : "text-gray-600"}`}>{cleanBody(n.body)}</p>
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${cfg.badge}`}>{cfg.label}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{relTime(n.createdAt)}</span>
                        </div>
                        {cfg.action && (
                          <a href={cfg.action.href} onClick={() => markRead(n.id)}
                            className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                            {cfg.action.label} →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Hover actions */}
                  <div className="absolute top-4 right-8 hidden group-hover:flex items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-md p-1">
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} title="Mark as read"
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-teal-50 text-gray-400 hover:text-teal-600 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      </button>
                    )}
                    <button onClick={() => deleteOne(n.id)} title="Delete"
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}