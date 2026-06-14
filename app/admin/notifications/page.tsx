"use client";

import { useState } from "react";
import { Bell, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const TYPES = [
  { value: "REMINDER",    label: "Reminder",    color: "#6366f1" },
  { value: "AI_ALERT",    label: "AI Alert",    color: "#14b8a6" },
  { value: "DEADLINE",    label: "Deadline",    color: "#f59e0b" },
  { value: "ACHIEVEMENT", label: "Achievement", color: "#22c55e" },
];

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("REMINDER");
  const [loading, setLoading] = useState(false);
  const [lastSent, setLastSent] = useState<{ count: number; title: string } | null>(null);

  const activeType = TYPES.find((t) => t.value === type)!;

  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/admin/notifications/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), body: body.trim(), type }),
    });
    if (res.ok) {
      const data = await res.json();
      setLastSent({ count: data.sent, title: title.trim() });
      toast.success(`Sent to ${data.sent} users`);
      setTitle("");
      setBody("");
    } else {
      toast.error("Failed to broadcast notification");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-teal-400" /> Broadcast Notifications
        </h1>
        <p className="text-white/40 text-sm mt-0.5">
          Send a notification to every user on the platform
        </p>
      </div>

      {/* Success banner */}
      {lastSent && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl mb-5 border"
          style={{ background: "rgba(34,197,94,0.07)", borderColor: "rgba(34,197,94,0.20)" }}
        >
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-[13px] text-green-300">
            <span className="font-semibold">&ldquo;{lastSent.title}&rdquo;</span> sent to{" "}
            {lastSent.count} users successfully.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.07] bg-[#111b27] p-6 sm:p-8 flex flex-col gap-5">
        {/* Type selector */}
        <div>
          <label className="text-[11px] uppercase tracking-widest text-white/40 font-semibold block mb-3">
            Notification Type
          </label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold border transition-all"
                style={
                  type === t.value
                    ? { background: `${t.color}18`, borderColor: `${t.color}40`, color: t.color }
                    : { background: "transparent", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-[11px] uppercase tracking-widest text-white/40 font-semibold block mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="e.g. System Maintenance Tonight"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 text-[14px] focus:outline-none focus:border-teal-500/50 transition-all"
          />
        </div>

        {/* Message */}
        <div>
          <label className="text-[11px] uppercase tracking-widest text-white/40 font-semibold block mb-2">
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Write your broadcast message here..."
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 text-[14px] focus:outline-none focus:border-teal-500/50 transition-all resize-none"
          />
          <p className="text-[11px] text-white/25 mt-1 text-right">{body.length}/500</p>
        </div>

        {/* Preview */}
        {(title || body) && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">
              Preview
            </p>
            <p className="text-[13px] font-semibold text-white">{title || "Untitled"}</p>
            <p className="text-[12px] text-white/50 mt-1">{body || "No message yet."}</p>
            <span
              className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${activeType.color}18`, color: activeType.color }}
            >
              {activeType.label}
            </span>
          </div>
        )}

        {/* Send */}
        <button
          onClick={handleBroadcast}
          disabled={loading || !title.trim() || !body.trim()}
          className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-[14px] text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          style={{
            background: "linear-gradient(135deg, #14b8a6, #0d9488)",
            boxShadow: "0 0 30px rgba(20,184,166,0.25)",
          }}
        >
          <Send className="w-4 h-4" />
          {loading ? "Sending..." : "Broadcast to All Users"}
        </button>
      </div>
    </div>
  );
}
