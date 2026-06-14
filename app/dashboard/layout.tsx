"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { AiSyncProvider } from "@/lib/ai-sync-context";

function NotificationBell() {
  const [count, setCount] = useState(0);

  const poll = useCallback(async () => {
    try {
      await fetch("/api/notifications/check-sessions", { method: "POST" });
      const res = await fetch("/api/notifications?unread=true");
      if (res.ok) {
        const data = await res.json();
        setCount(data.unreadCount ?? 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [poll]);

  return (
    <Link href="/dashboard/notifications"
      className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-white/10 transition-colors">
      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-teal-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Auto-hide top bar on scroll down, show on scroll up ──
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      if (current < 10) {
        setNavVisible(true);
      } else if (current > lastScrollY.current + 4) {
        setNavVisible(false); // scrolling down
      } else if (current < lastScrollY.current - 4) {
        setNavVisible(true);  // scrolling up
      }
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Swipe right from left edge to open sidebar ──
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
      // Swipe right starting within left 80px, at least 60px, more horizontal than vertical
      if (touchStartX.current < 80 && dx > 60 && dy < 120) {
        setMobileOpen(true);
      }
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <AiSyncProvider>
      <div className="flex min-h-screen">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <main
          className={`flex-1 bg-gray-50 transition-all duration-300 ease-in-out ${collapsed ? "md:ml-16" : "md:ml-64"}`}
        >
          {/* Top bar — sticky, auto-hides on scroll down */}
          <div className={`sticky top-0 z-20 bg-gray-900 text-white px-4 py-3 text-sm font-medium flex items-center gap-3 transition-transform duration-300 md:translate-y-0 ${navVisible ? "translate-y-0" : "-translate-y-full"}`}>
            <button className="md:hidden text-gray-400 hover:text-white text-xl" onClick={() => setMobileOpen(true)}>
              ☰
            </button>
            <span>Dashboard</span>
            <div className="ml-auto">
              <NotificationBell />
            </div>
          </div>
          {children}
        </main>
      </div>
    </AiSyncProvider>
  );
}
