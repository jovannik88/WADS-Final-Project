"use client";

import { useEffect, useState } from "react";
import { Users, Search, Trash2, UserX, UserCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  _count: { tasks: number; sessions: number; notifications: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (uid: string, email: string) => {
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    setActing(uid);
    const res = await fetch(`/api/admin/users/${uid}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("User deleted");
      setUsers((prev) => prev.filter((u) => u.id !== uid));
    } else {
      toast.error("Failed to delete user");
    }
    setActing(null);
  };

  const handleDeactivate = async (uid: string) => {
    setActing(uid);
    const res = await fetch(`/api/admin/users/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disabled: true }),
    });
    if (res.ok) {
      toast.success("User deactivated");
    } else {
      toast.error("Failed to deactivate user");
    }
    setActing(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" /> User Management
          </h1>
          <p className="text-white/40 text-sm mt-0.5">{users.length} registered accounts</p>
        </div>
        <button onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] text-white/50 border border-white/[0.08] hover:border-white/[0.15] hover:text-white/80 transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 text-[14px] focus:outline-none focus:border-teal-500/50 transition-all"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#111b27] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_120px_80px_80px_80px_120px] gap-4 px-5 py-3 border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-widest text-white/30 hidden lg:grid">
          <span>User</span>
          <span>Email</span>
          <span>Joined</span>
          <span>Tasks</span>
          <span>Sessions</span>
          <span>Role</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-white/30 text-sm">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-white/30 text-sm">No users found</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((user) => (
              <div key={user.id}
                className="flex flex-col lg:grid lg:grid-cols-[1fr_1fr_120px_80px_80px_80px_120px] gap-2 lg:gap-4 px-5 py-4 hover:bg-white/[0.02] transition-all">
                {/* Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-bold"
                    style={{ background: "rgba(20,184,166,0.15)", color: "#14b8a6", border: "1px solid rgba(20,184,166,0.25)" }}>
                    {(user.name ?? user.email)[0].toUpperCase()}
                  </div>
                  <span className="text-[13px] font-medium text-white/80 truncate">
                    {user.name ?? "—"}
                  </span>
                </div>

                {/* Email */}
                <span className="text-[13px] text-white/50 truncate lg:flex items-center hidden">
                  {user.email}
                </span>
                <span className="text-[12px] text-white/40 lg:hidden">{user.email}</span>

                {/* Joined */}
                <span className="text-[12px] text-white/40 lg:flex items-center hidden">
                  {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>

                {/* Counts */}
                <span className="text-[13px] text-white/60 lg:flex items-center hidden">{user._count.tasks}</span>
                <span className="text-[13px] text-white/60 lg:flex items-center hidden">{user._count.sessions}</span>

                {/* Role */}
                <div className="lg:flex items-center hidden">
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                    user.role === "ADMIN"
                      ? "bg-teal-500/15 text-teal-400 border border-teal-500/25"
                      : "bg-white/[0.06] text-white/40"
                  }`}>
                    {user.role}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeactivate(user.id)}
                    disabled={acting === user.id || user.role === "ADMIN"}
                    title="Deactivate"
                    className="p-2 rounded-lg text-white/30 hover:text-yellow-400 hover:bg-yellow-500/[0.08] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <UserX className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id, user.email)}
                    disabled={acting === user.id || user.role === "ADMIN"}
                    title="Delete"
                    className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/[0.08] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
