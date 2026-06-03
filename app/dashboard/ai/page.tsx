"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Gemini API history format
interface GeminiTurn {
  role: "user" | "model";
  parts: { text: string }[];
}

interface PrioritizedTask { taskId: number; title: string; aiScore: number; aiReason: string; suggestedOrder: number }
interface ScheduleBlock { startHour: number; endHour: number; taskTitle: string; blockType: "focus" | "break"; durationMin: number }

function formatHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h % 1) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function renderContent(text: string) {
  return text.split("\n").map((line, i, arr) => (
    <span key={i}>
      <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
      {i < arr.length - 1 && <br />}
    </span>
  ));
}

// Returns a user-scoped sessionStorage key so different accounts never share chat history
function sessionKey(uid: string) { return `ai_chat_session:${uid}`; }

function loadSession(uid: string): SessionSnapshot | null {
  try {
    const raw = sessionStorage.getItem(sessionKey(uid));
    return raw ? (JSON.parse(raw) as SessionSnapshot) : null;
  } catch {
    return null;
  }
}

function makeInitialMessage(): ChatMessage {
  return {
    id: 0,
    role: "assistant",
    content: "Hi! I'm your AI study assistant powered by Gemini. I know your current tasks and today's schedule. Ask me anything — or use the quick actions to run AI analysis.",
    timestamp: new Date(),
  };
}

interface SessionSnapshot {
  messages: (Omit<ChatMessage, "timestamp"> & { timestamp: string })[];
  geminiHistory: GeminiTurn[];
  prioritized: PrioritizedTask[];
  schedule: ScheduleBlock[];
  showPanel: "prioritize" | "schedule" | null;
  panelCollapsed: boolean;
}

export default function AIAssistantPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);

  // SSR-safe defaults — sessionStorage is loaded after mount to avoid hydration mismatch
  const [messages, setMessages] = useState<ChatMessage[]>([makeInitialMessage()]);
  const [geminiHistory, setGeminiHistory] = useState<GeminiTurn[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [prioritized, setPrioritized] = useState<PrioritizedTask[]>([]);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>([]);
  const [showPanel, setShowPanel] = useState<"prioritize" | "schedule" | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Fetch UID on mount using settings endpoint (always returns userId)
  useEffect(() => {
    fetch("/api/settings")
      .then(r => { if (r.status === 401) { router.push("/login"); throw new Error("unauth"); } return r.json(); })
      .then(data => { if (data?.settings?.userId) setUid(data.settings.userId); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Restore session after UID is known
  useEffect(() => {
    if (!uid) return;
    const snap = loadSession(uid);
    if (snap?.messages?.length) {
      setMessages(snap.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })));
      setGeminiHistory(snap.geminiHistory ?? []);
      setPrioritized(snap.prioritized ?? []);
      setSchedule(snap.schedule ?? []);
      setShowPanel(snap.showPanel ?? null);
      setPanelCollapsed(snap.panelCollapsed ?? false);
    } else {
      // New account or fresh session — start clean
      setMessages([makeInitialMessage()]);
      setGeminiHistory([]);
      setPrioritized([]);
      setSchedule([]);
      setShowPanel(null);
      setPanelCollapsed(false);
    }
    setHydrated(true);
  }, [uid]);

  // 3. Persist session whenever state changes (only after hydration and UID known)
  useEffect(() => {
    if (!hydrated || !uid) return;
    const snap: SessionSnapshot = {
      messages: messages.map((m) => ({ ...m, timestamp: m.timestamp.toISOString() })),
      geminiHistory,
      prioritized,
      schedule,
      showPanel,
      panelCollapsed,
    };
    try { sessionStorage.setItem(sessionKey(uid), JSON.stringify(snap)); } catch { /* quota exceeded */ }
  }, [hydrated, uid, messages, geminiHistory, prioritized, schedule, showPanel, panelCollapsed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearSession = () => {
    if (uid) sessionStorage.removeItem(sessionKey(uid));
    setMessages([makeInitialMessage()]);
    setGeminiHistory([]);
    setPrioritized([]);
    setSchedule([]);
    setShowPanel(null);
    setPanelCollapsed(false);
  };

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { id: Date.now(), role, content, timestamp: new Date() }]);
  };

  // Send a message to Gemini via /api/ai/chat — multi-turn conversation preserved via history
  const sendToGemini = useCallback(async (userText: string, historyOverride?: GeminiTurn[]) => {
    setIsLoading(true);
    const history = historyOverride ?? geminiHistory;
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history }),
      });

      if (res.status === 401) { router.push("/login"); return; }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "api_error" }));
        const code: string = data.error ?? "api_error";

        let friendlyMsg: string;
        if (code === "overloaded") {
          friendlyMsg = "⚠️ The AI is experiencing high demand right now. Please check your internet connection and try again in a moment.";
        } else if (code === "quota_exceeded") {
          friendlyMsg = "🔒 You've reached the AI usage limit. Please upgrade your plan to continue using AI features.";
        } else if (code === "config_error") {
          friendlyMsg = "⚙️ There's a configuration issue with the AI service. Please contact support.";
        } else {
          friendlyMsg = "⚠️ Something went wrong with the AI. Please try again.";
        }
        addMessage("assistant", friendlyMsg);
        return;
      }

      const data = await res.json();
      const responseText: string = data.response;
      addMessage("assistant", responseText);

      // Append this turn to history for multi-turn context
      setGeminiHistory((prev) => [
        ...prev,
        { role: "user", parts: [{ text: userText }] },
        { role: "model", parts: [{ text: responseText }] },
      ]);
    } catch {
      addMessage("assistant", "⚠️ Could not reach the AI — please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [geminiHistory, router]);

  const runPrioritize = useCallback(async () => {
    setIsLoading(true);
    addMessage("user", "Run smart task prioritization and show me what to focus on.");
    try {
      const res = await fetch("/api/ai/prioritize", { method: "POST" });
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPrioritized(data.prioritized ?? []);
      setShowPanel("prioritize");
      setPanelCollapsed(false);

      const summary = data.summary ?? "Prioritization complete.";
      const detail = data.prioritized?.slice(0, 3).map((t: PrioritizedTask) =>
        `**${t.suggestedOrder}. ${t.title}** (${t.aiScore.toFixed(0)}/100) — ${t.aiReason}`
      ).join("\n") ?? "";

      const responseText = `${detail}\n\n${summary}`;
      addMessage("assistant", responseText);

      const newTurn: GeminiTurn[] = [
        { role: "user", parts: [{ text: "Run smart task prioritization." }] },
        { role: "model", parts: [{ text: responseText }] },
      ];
      setGeminiHistory((prev) => [...prev, ...newTurn]);
    } catch {
      toast.error("Prioritization failed");
      addMessage("assistant", "Couldn't run prioritization. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const runSchedule = useCallback(async () => {
    setIsLoading(true);
    addMessage("user", "Optimize my study schedule for today.");
    try {
      const res = await fetch("/api/ai/schedule", { method: "POST" });
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSchedule(data.blocks ?? []);
      setShowPanel("schedule");
      setPanelCollapsed(false);

      const focusBlocks: ScheduleBlock[] = (data.blocks ?? []).filter((b: ScheduleBlock) => b.blockType === "focus");
      const forTomorrow: boolean = data.forTomorrow ?? false;
      const targetDate = forTomorrow
        ? new Date(Date.now() + 86_400_000)
        : new Date();
      const fullDate = targetDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const dayLabel = forTomorrow
        ? `📅 Tomorrow's schedule — ${fullDate}`
        : `📅 Today's schedule — ${fullDate}`;

      const detail = focusBlocks.length > 0
        ? focusBlocks.slice(0, 4).map((b: ScheduleBlock) =>
            `**${formatHour(b.startHour)}–${formatHour(b.endHour)}** — ${b.taskTitle} (${b.durationMin} min)`
          ).join("\n")
        : "";

      const responseText = detail
        ? `**${dayLabel}:**\n${detail}\n\nPeak window: **${data.peakWindow}**\n${data.summary}`
        : data.summary;
      addMessage("assistant", responseText);

      const newTurn: GeminiTurn[] = [
        { role: "user", parts: [{ text: "Optimize my study schedule for today." }] },
        { role: "model", parts: [{ text: responseText }] },
      ];
      setGeminiHistory((prev) => [...prev, ...newTurn]);
    } catch {
      toast.error("Schedule optimization failed");
      addMessage("assistant", "Couldn't build your schedule. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
    addMessage("user", trimmed);
    await sendToGemini(trimmed);
  }, [isLoading, sendToGemini]);

  const focusBlocks = schedule.filter((b) => b.blockType === "focus");
  const formatTime = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="h-[calc(100vh-48px)] bg-gray-50 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex flex-col h-full px-6 py-8 gap-5">

        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-2xl flex items-center justify-center shadow-sm shadow-teal-200">
            <span className="text-white text-base">✦</span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Assistant</h1>
            <p className="text-gray-400 text-sm">Powered by Gemini · context-aware of your tasks and schedule</p>
          </div>
          {hydrated && messages.length > 1 && (
            <button
              onClick={clearSession}
              title="Clear chat history"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              Clear chat
            </button>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            id="ai-prioritize-btn"
            onClick={runPrioritize}
            disabled={isLoading}
            className="group flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-teal-200 hover:-translate-y-0.5 transition-all text-left disabled:opacity-50"
          >
            <span className="text-2xl mt-0.5">☰</span>
            <div>
              <p className="font-semibold text-sm group-hover:text-teal-700 transition-colors">Prioritize my tasks</p>
              <p className="text-gray-400 text-xs mt-1">Scores each task by urgency, deadline and effort</p>
            </div>
          </button>
          <button
            id="ai-schedule-btn"
            onClick={runSchedule}
            disabled={isLoading}
            className="group flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-teal-200 hover:-translate-y-0.5 transition-all text-left disabled:opacity-50"
          >
            <span className="text-2xl mt-0.5">📅</span>
            <div>
              <p className="font-semibold text-sm group-hover:text-teal-700 transition-colors">Optimize my schedule</p>
              <p className="text-gray-400 text-xs mt-1">Builds a Pomodoro plan · saved to your calendar</p>
            </div>
          </button>
        </div>

        {/* Results panel */}
        {showPanel === "prioritize" && prioritized.length > 0 && (
          <div className="flex-shrink-0 bg-white border border-teal-100 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setPanelCollapsed((c) => !c)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-teal-50 transition-colors group"
            >
              <p className="text-xs font-bold text-teal-700 uppercase tracking-widest">AI Priority Order</p>
              <span
                className="text-teal-400 transition-transform duration-300 group-hover:text-teal-600"
                style={{ display: "inline-block", transform: panelCollapsed ? "rotate(0deg)" : "rotate(180deg)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            <div
              style={{
                maxHeight: panelCollapsed ? "0px" : "400px",
                overflow: "hidden",
                transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              <div className="flex flex-col gap-2 px-4 pb-4">
                {prioritized.map((t) => (
                  <div key={t.taskId} className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex-shrink-0">
                      {t.suggestedOrder}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.aiReason}</p>
                    </div>
                    <span className="text-xs font-bold text-teal-600">{t.aiScore.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showPanel === "schedule" && focusBlocks.length > 0 && (
          <div className="flex-shrink-0 bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setPanelCollapsed((c) => !c)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50 transition-colors group"
            >
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Study Schedule · saved to calendar</p>
              <span
                className="text-indigo-400 transition-transform duration-300 group-hover:text-indigo-600"
                style={{ display: "inline-block", transform: panelCollapsed ? "rotate(0deg)" : "rotate(180deg)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            <div
              style={{
                maxHeight: panelCollapsed ? "0px" : "400px",
                overflow: "hidden",
                transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              <div className="flex flex-col gap-2 px-4 pb-4">
                {schedule.map((b, i) => (
                  <div key={i} className={`flex items-center gap-3 ${b.blockType === "break" ? "opacity-40" : ""}`}>
                    <span className="text-xs text-gray-500 font-mono w-24 flex-shrink-0">{formatHour(b.startHour)}–{formatHour(b.endHour)}</span>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${b.blockType === "focus" ? "bg-teal-500" : "bg-gray-300"}`} />
                    <p className="text-sm text-gray-800 flex-1 truncate">{b.taskTitle}</p>
                    <span className="text-xs text-gray-400">{b.durationMin}m</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat window */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden min-h-0">
          <div id="chat-messages" className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === "user" ? "bg-gray-900" : "bg-teal-600"}`}>
                  <span className="text-white text-xs font-bold">{msg.role === "user" ? "U" : "✦"}</span>
                </div>
                <div className={`flex flex-col gap-1 max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-gray-900 text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"}`}>
                    {renderContent(msg.content)}
                  </div>
                  <span className="text-xs text-gray-300 px-1">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs">✦</span>
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="h-px bg-gray-100 flex-shrink-0" />
          <div className="flex-shrink-0 px-4 py-4 flex items-end gap-3">
            <textarea
              ref={textareaRef}
              id="ai-chat-input"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Ask about your tasks, schedule, or study tips..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-3 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all disabled:opacity-50 leading-relaxed"
              style={{ minHeight: "46px", maxHeight: "120px" }}
            />
            <button
              id="ai-send-btn"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="w-11 h-11 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 text-white rounded-2xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-gray-300 pb-3 flex-shrink-0">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}