"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Users, BarChart3, Bell, Bot, LogOut, ShieldCheck, Menu, X } from "lucide-react";

const NAV = [
  { href: "/admin/users",         label: "Users",           icon: Users },
  { href: "/admin/analytics",     label: "Analytics",       icon: BarChart3 },
  { href: "/admin/notifications", label: "Notifications",   icon: Bell },
  { href: "/admin/ai-monitor",    label: "AI Monitor",      icon: Bot },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  const Sidebar = () => (
    <aside className="flex flex-col h-full w-64 bg-[#0e1621] border-r border-white/[0.06] py-6">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 mb-8">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)", boxShadow: "0 0 20px rgba(20,184,166,0.35)" }}>
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-[15px]">StudyFlow</p>
          <p className="text-[10px] text-teal-400 font-semibold tracking-widest uppercase">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 flex-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all ${
                active
                  ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
              }`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 mt-4">
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[13px] font-medium text-white/40 hover:text-red-400 hover:bg-red-500/[0.06] transition-all">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#080d12] text-white flex">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 z-40">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-4 border-b border-white/[0.06] bg-[#0e1621]">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-white/[0.06] transition-all">
            <Menu className="w-5 h-5 text-white/60" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span className="font-bold text-white text-[15px]">Admin Panel</span>
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
