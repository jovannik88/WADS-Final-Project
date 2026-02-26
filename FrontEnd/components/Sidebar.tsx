"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "⊞" },
  { label: "Tasks", href: "/dashboard/tasks", icon: "☰" },
  { label: "Calendar", href: "/dashboard/calendar", icon: "📅" },
  { label: "Study timer", href: "/dashboard/timer", icon: "⏱️" },
  { label: "Ai assistant", href: "/dashboard/ai", icon: "✦" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "📊" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar - desktop */}
      <aside className={`hidden md:flex flex-col fixed h-full bg-gray-900 text-white transition-all duration-300 ease-in-out z-10 ${collapsed ? "w-16" : "w-64"}`}>
        <div className="px-4 py-6 border-b border-gray-700 flex items-center justify-between">
          {!collapsed && <p className="text-sm text-gray-400">logo</p>}
          <button onClick={onToggle} className="text-gray-400 hover:text-white transition-colors ml-auto">
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="flex-1 px-2 py-6 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"} ${collapsed ? "justify-center" : ""}`}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-6 border-t border-gray-700">
          <Link
            href="/dashboard/settings"
            title={collapsed ? "Settings" : undefined}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            <span className="text-lg flex-shrink-0">⚙️</span>
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
      </aside>

      {/* Sidebar - mobile */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white flex flex-col transition-transform duration-300 ease-in-out z-30 md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-4 py-6 border-b border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-400">logo</p>
          <button onClick={onMobileClose} className="text-gray-400 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <nav className="flex-1 px-2 py-6 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-6 border-t border-gray-700">
          <Link
            href="/dashboard/settings"
            onClick={onMobileClose}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <span className="text-lg flex-shrink-0">⚙️</span>
            <span>Settings</span>
          </Link>
        </div>
      </aside>
    </>
  );
}