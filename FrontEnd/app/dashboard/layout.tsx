"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className={`flex-1 bg-gray-50 transition-all duration-300 ease-in-out ${collapsed ? "md:ml-16" : "md:ml-64"}`}>
        <div className="bg-gray-900 text-white px-4 py-3 text-sm font-medium flex items-center gap-3">
          <button className="md:hidden text-gray-400 hover:text-white text-xl" onClick={() => setMobileOpen(true)}>
            ☰
          </button>
          <span>Dashboard</span>
        </div>
        {children}
      </main>
    </div>
  );
}