"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "⊞" },
  { label: "Tasks", href: "/dashboard/tasks", icon: "☰" },
  { label: "Calendar", href: "/dashboard/calendar", icon: "📅" },
  { label: "Study timer", href: "/dashboard/timer", icon: "⏱️" },
  { label: "Ai assistant", href: "/dashboard/ai", icon: "✦" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "📊" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-64"
        } bg-gray-900 text-white flex flex-col fixed h-full transition-all duration-300 ease-in-out z-10`}
      >
        {/* Logo + Toggle */}
        <div className="px-4 py-6 border-b border-gray-700 flex items-center justify-between">
          {!collapsed && <p className="text-sm text-gray-400">logo</p>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-white transition-colors ml-auto"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-2 py-6 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Settings at bottom */}
        <div className="px-2 py-6 border-t border-gray-700">
          <Link
            href="/dashboard/settings"
            title={collapsed ? "Settings" : undefined}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <span className="text-lg flex-shrink-0">⚙️</span>
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`${
          collapsed ? "ml-16" : "ml-64"
        } flex-1 bg-gray-50 transition-all duration-300 ease-in-out`}
      >
        {/* Top bar */}
        <div className="bg-gray-900 text-white px-6 py-3 text-sm font-medium">
          Dashboard
        </div>
        {children}
      </main>
    </div>
  );
}