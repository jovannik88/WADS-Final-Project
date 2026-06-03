"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const navItems = [
  { label: "Dashboard",    href: "/dashboard",           icon: "⊞" },
  { label: "Tasks",        href: "/dashboard/tasks",     icon: "☰" },
  { label: "Calendar",     href: "/dashboard/calendar",  icon: "📅" },
  { label: "Study Timer",  href: "/dashboard/timer",     icon: "⏱️" },
  { label: "AI Assistant", href: "/dashboard/ai",        icon: "✦" },
  { label: "Analytics",    href: "/dashboard/analytics", icon: "📊" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

// Defined OUTSIDE Sidebar so React sees a stable component identity across re-renders
function NavLink({
  href, icon, label, badge, collapsed, onClick,
}: {
  href: string; icon: string; label: string;
  badge?: number; collapsed: boolean; onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      onClick={onClick}
      className={`relative flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
        isActive ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <span className="text-lg flex-shrink-0">{icon}</span>
      {!collapsed && <span className="flex-1">{label}</span>}
      {badge && badge > 0 && (
        <span className={`flex-shrink-0 text-xs font-bold bg-teal-500 text-white rounded-full flex items-center justify-center ${
          collapsed ? "absolute -top-1 -right-1 w-4 h-4 text-[10px]" : "w-5 h-5"
        }`}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/notifications?unread=true")
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.unreadCount ?? 0))
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    toast.success("Logged out successfully");
    router.push("/login");
    router.refresh();
  };

  const sharedNavLinks = navItems.map((item) => (
    <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} collapsed={collapsed} />
  ));

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" onClick={onMobileClose} />
      )}

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col fixed h-full bg-gray-900 text-white transition-all duration-300 ease-in-out z-10 ${collapsed ? "w-16" : "w-64"}`}>
        <div className="px-4 py-6 border-b border-gray-700 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex-shrink-0 bg-teal-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">S</span>
              </div>
              <span className="text-sm font-bold">StudyFlow</span>
            </div>
          )}
          <button onClick={onToggle} className="text-gray-400 hover:text-white transition-colors ml-auto">
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="flex-1 px-2 py-6 flex flex-col gap-1">
          {sharedNavLinks}
        </nav>

        <div className="px-2 py-6 border-t border-gray-700 flex flex-col gap-1">
          <NavLink href="/dashboard/notifications" icon="🔔" label="Notifications" badge={unreadCount} collapsed={collapsed} />
          <NavLink href="/dashboard/settings" icon="⚙️" label="Settings" collapsed={collapsed} />
          <button
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-colors w-full ${collapsed ? "justify-center" : ""}`}
          >
            <span className="text-lg flex-shrink-0">🚪</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white flex flex-col transition-transform duration-300 ease-in-out z-30 md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-4 py-6 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex-shrink-0 bg-teal-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="text-sm font-bold">StudyFlow</span>
          </div>
          <button onClick={onMobileClose} className="text-gray-400 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <nav className="flex-1 px-2 py-6 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} collapsed={false} onClick={onMobileClose} />
          ))}
        </nav>

        <div className="px-2 py-6 border-t border-gray-700 flex flex-col gap-1">
          <NavLink href="/dashboard/notifications" icon="🔔" label="Notifications" badge={unreadCount} collapsed={false} onClick={onMobileClose} />
          <NavLink href="/dashboard/settings" icon="⚙️" label="Settings" collapsed={false} onClick={onMobileClose} />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-colors w-full"
          >
            <span className="text-lg flex-shrink-0">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}