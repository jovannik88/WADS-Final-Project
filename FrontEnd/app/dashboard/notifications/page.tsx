"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type NotifCategory = "all" | "session" | "deadline" | "ai" | "streak";

interface Notification {
  id: number;
  category: Exclude<NotifCategory, "all">;
  title: string;
  body: string;
  time: string;
  read: boolean;
  action?: { label: string; href: string };
}

// ── Mock data — replace with GET /api/notifications ──────────────────────────
const initialNotifications: Notification[] = [
  {
    id: 1,
    category: "session",
    title: "Session starting soon",
    body: "Your study session for Calculus Problem Set begins in 10 minutes. Make sure you're ready!",
    time: "10 min ago",
    read: false,
    action: { label: "Open Timer", href: "/dashboard/timer" },
  },
  {
    id: 2,
    category: "ai",
    title: "AI updated your schedule",
    body: "Based on your recent sessions, the AI has rescheduled Physics Lab Report to tomorrow at 6 PM for better focus.",
    time: "32 min ago",
    read: false,
    action: { label: "View Schedule", href: "/dashboard/calendar" },
  },
  {
    id: 3,
    category: "deadline",
    title: "Deadline in 24 hours",
    body: "CS Project Milestone is due tomorrow at 11:59 PM. You're currently at 85% completion.",
    time: "1 hour ago",
    read: false,
    action: { label: "View Task", href: "/dashboard/tasks" },
  },
  {
    id: 4,
    category: "streak",
    title: "🔥 5-day streak — keep it up!",
    body: "You've studied every day for 5 days in a row. Study for at least 30 minutes today to maintain your streak.",
    time: "3 hours ago",
    read: false,
  },
  {
    id: 5,
    category: "session",
    title: "Session completed",
    body: "Great work! You completed a 1h 48m session on Calculus Problem Set and reached 100% completion.",
    time: "5 hours ago",
    read: true,
    action: { label: "View Analytics", href: "/dashboard/analytics" },
  },
  {
    id: 6,
    category: "ai",
    title: "AI insight: peak focus detected",
    body: "Your last 3 sessions show your best focus between 7–9 PM. The AI has adjusted future scheduling to prioritise this window.",
    time: "Yesterday, 9:15 PM",
    read: true,
    action: { label: "View Insights", href: "/dashboard/analytics" },
  },
  {
    id: 7,
    category: "deadline",
    title: "Deadline in 3 days",
    body: "English Essay Draft is due on Feb 25. You haven't started yet — the AI suggests blocking 2 hours tomorrow.",
    time: "Yesterday, 8:00 AM",
    read: true,
    action: { label: "View Task", href: "/dashboard/tasks" },
  },
  {
    id: 8,
    category: "session",
    title: "Missed session",
    body: "You missed your scheduled Physics Lab Report session at 4 PM. The AI has rescheduled it to tomorrow at 5 PM.",
    time: "Yesterday, 4:30 PM",
    read: true,
    action: { label: "View Schedule", href: "/dashboard/calendar" },
  },
  {
    id: 9,
    category: "ai",
    title: "Weekly schedule ready",
    body: "Your AI-optimised schedule for next week is ready. It includes 5 study sessions across 4 subjects.",
    time: "Mon, 7:00 AM",
    read: true,
    action: { label: "View Schedule", href: "/dashboard/calendar" },
  },
  {
    id: 10,
    category: "streak",
    title: "🏆 New milestone — 7 days!",
    body: "You've hit a 7-day study streak. You're in the top 15% of StudyFlow users this week.",
    time: "Sun, 10:00 PM",
    read: true,
  },
  {
    id: 11,
    category: "deadline",
    title: "Task completed ✓",
    body: "Physics Lab Report has been marked as complete. The AI has removed it from your upcoming schedule.",
    time: "Sat, 6:30 PM",
    read: true,
  },
  {
    id: 12,
    category: "session",
    title: "Session starting in 1 minute",
    body: "English Essay Draft session starts in 1 minute. Head to the study timer to begin.",
    time: "Sat, 2:59 PM",
    read: true,
    action: { label: "Open Timer", href: "/dashboard/timer" },
  },
];

// ── Config ────────────────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<Exclude<NotifCategory, "all">, {
  label: string; icon: string; iconBg: string; iconColor: string; badge: string;
}> = {
  session:  { label: "Sessions",   icon: "⏱",  iconBg: "bg-teal-50",    iconColor: "text-teal-600",  badge: "bg-teal-50 text-teal-700 ring-1 ring-teal-200" },
  deadline: { label: "Deadlines",  icon: "📅",  iconBg: "bg-red-50",     iconColor: "text-red-500",   badge: "bg-red-50 text-red-600 ring-1 ring-red-200" },
  ai:       { label: "AI Updates", icon: "✦",   iconBg: "bg-violet-50",  iconColor: "text-violet-600",badge: "bg-violet-50 text-violet-700 ring-1 ring-violet-200" },
  streak:   { label: "Streaks",    icon: "🔥",  iconBg: "bg-orange-50",  iconColor: "text-orange-500",badge: "bg-orange-50 text-orange-700 ring-1 ring-orange-200" },
};

const FILTER_TABS: { id: NotifCategory; label: string }[] = [
  { id: "all",      label: "All" },
  { id: "session",  label: "Sessions" },
  { id: "deadline", label: "Deadlines" },
  { id: "ai",       label: "AI Updates" },
  { id: "streak",   label: "Streaks" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<NotifCategory>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    const matchCat = activeFilter === "all" || n.category === activeFilter;
    const matchRead = !showUnreadOnly || !n.read;
    return matchCat && matchRead;
  });

  const markRead = (id: number) => {
    // PATCH /api/notifications/:id/read
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = () => {
    // PATCH /api/notifications/read-all
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotif = (id: number) => {
    // DELETE /api/notifications/:id
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    // DELETE /api/notifications
    setNotifications([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-7">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-teal-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-gray-400 mt-1.5 text-sm">Stay up to date with your sessions, deadlines, and AI updates</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 bg-white border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-2xl transition-all font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 bg-white border border-gray-200 hover:border-red-200 px-4 py-2 rounded-2xl transition-all font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* ── Summary chips ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.entries(CATEGORY_CONFIG) as [Exclude<NotifCategory, "all">, typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(([cat, cfg]) => {
            const count = notifications.filter((n) => n.category === cat && !n.read).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${
                  activeFilter === cat
                    ? "bg-gray-900 border-gray-900 shadow-sm"
                    : "bg-white border-gray-100 hover:border-gray-200 shadow-sm"
                }`}
              >
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${
                  activeFilter === cat ? "bg-white/10" : cfg.iconBg
                }`}>
                  {cfg.icon}
                </span>
                <div>
                  <p className={`text-xs font-semibold ${activeFilter === cat ? "text-white" : "text-gray-700"}`}>
                    {cfg.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${activeFilter === cat ? "text-gray-400" : "text-gray-400"}`}>
                    {count > 0 ? `${count} unread` : "All read"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Filter bar ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center bg-white border border-gray-200 rounded-2xl p-1 gap-1 shadow-sm overflow-x-auto">
            {FILTER_TABS.map((tab) => {
              const count = notifications.filter(
                (n) => (tab.id === "all" || n.category === tab.id) && !n.read
              ).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    activeFilter === tab.id
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      activeFilter === tab.id ? "bg-white/20 text-white" : "bg-teal-50 text-teal-600"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Unread toggle */}
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all border shadow-sm ${
              showUnreadOnly
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white text-gray-500 border-gray-200 hover:text-gray-800"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${showUnreadOnly ? "bg-white" : "bg-teal-500"}`} />
            Unread only
          </button>
        </div>

        {/* ── Notification list ── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-3xl">🔔</div>
            <div>
              <p className="font-bold text-gray-900 text-base">All clear!</p>
              <p className="text-gray-400 text-sm mt-1">
                {showUnreadOnly ? "No unread notifications in this category." : "No notifications here yet."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((notif) => {
              const cfg = CATEGORY_CONFIG[notif.category];
              return (
                <div
                  key={notif.id}
                  className={`group relative bg-white rounded-3xl border transition-all ${
                    !notif.read
                      ? "border-teal-100 shadow-sm shadow-teal-50"
                      : "border-gray-100 shadow-sm"
                  }`}
                >
                  {/* Unread dot */}
                  {!notif.read && (
                    <span className="absolute top-5 right-5 w-2.5 h-2.5 bg-teal-500 rounded-full" />
                  )}

                  <div className="p-5 flex gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.iconBg}`}>
                      <span className={`text-base ${cfg.iconColor}`}>{cfg.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-sm font-bold leading-tight ${notif.read ? "text-gray-700" : "text-gray-900"}`}>
                          {notif.title}
                        </p>
                      </div>
                      <p className={`text-sm leading-relaxed mt-1 ${notif.read ? "text-gray-400" : "text-gray-600"}`}>
                        {notif.body}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{notif.time}</span>
                        </div>

                        {notif.action && (
                          <a
                            href={notif.action.href}
                            onClick={() => markRead(notif.id)}
                            className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                          >
                            {notif.action.label} →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hover actions */}
                  <div className="absolute top-4 right-8 hidden group-hover:flex items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-md p-1">
                    {!notif.read && (
                      <button
                        onClick={() => markRead(notif.id)}
                        title="Mark as read"
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-teal-50 text-gray-400 hover:text-teal-600 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif(notif.id)}
                      title="Delete"
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
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