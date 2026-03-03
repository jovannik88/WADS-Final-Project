"use client";

import { useState, useRef, useEffect } from "react";

type MessageRole = "user" | "assistant";
type QuickActionId = "prioritize" | "schedule" | "analyze" | "suggest";

interface Message {
  id: number;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

interface QuickAction {
  id: QuickActionId;
  icon: string;
  title: string;
  description: string;
  prompt: string;
}

const quickActions: QuickAction[] = [
  {
    id: "prioritize",
    icon: "☰",
    title: "Prioritize my tasks",
    description: "AI ranks your tasks by urgency, importance, effort and dependency",
    prompt: "Can you prioritize my current tasks based on urgency, importance, and deadlines?",
  },
  {
    id: "schedule",
    icon: "📅",
    title: "Optimize my schedule",
    description: "Get a study schedule based on your energy levels and hard blocks",
    prompt: "Can you optimize my study schedule based on my energy levels and upcoming deadlines?",
  },
  {
    id: "analyze",
    icon: "📊",
    title: "Analyze my progress",
    description: "Review your study sessions and see how you're tracking",
    prompt: "Can you analyze my recent study sessions and tell me how I'm progressing?",
  },
  {
    id: "suggest",
    icon: "✦",
    title: "Suggest study strategies",
    description: "Get personalized tips based on your subjects and learning patterns",
    prompt: "Based on my subjects and study history, what study strategies would you recommend?",
  },
];

// Mock AI responses — replace with real API call in production
const mockResponses: Record<QuickActionId | "default", string> = {
  prioritize:
    "Based on your current tasks, here's my recommended priority order:\n\n1. **CS Project Milestone** (High) — Due tomorrow, 150 min estimated. Start immediately.\n2. **Calculus Problem Set** (High) — Due Feb 25, complex topic needs focused time.\n3. **English Essay Draft** (Medium) — Due Feb 25, can be broken into smaller chunks.\n4. **Physics Lab Report** (Medium) — Due Feb 25, structured format makes it faster.\n\nI suggest tackling CS Project first during your peak focus window (7–9 PM).",
  schedule:
    "Here's an optimized schedule for today based on your patterns:\n\n⏰ **7:00 PM – 8:30 PM** — CS Project Milestone (peak focus window)\n☕ **8:30 PM – 8:45 PM** — Short break\n⏰ **8:45 PM – 9:45 PM** — Calculus Problem Set\n☕ **9:45 PM – 10:00 PM** — Break\n⏰ **10:00 PM – 11:00 PM** — English Essay Draft\n\nI've avoided scheduling after 11 PM based on your historical session data.",
  analyze:
    "Here's a summary of your recent study activity:\n\n📈 **This week:** 3h 20min total focus time\n✅ **Completion rate:** 78% (+2% vs last week)\n🔥 **Study streak:** 5 days\n\n**Observations:**\n- Your most productive sessions are between 7–9 PM\n- Math tasks take ~20% longer than estimated\n- You tend to complete English tasks faster than expected\n\n**Suggestion:** Block an extra 20 min for Math tasks in future scheduling.",
  suggest:
    "Based on your subjects and study patterns, here are personalized strategies:\n\n**Math (Calculus):**\nUse active recall — solve problems without looking at notes first, then check.\n\n**English (Essay Writing):**\nTry the Pomodoro method — 25 min writing, 5 min break. Your sessions show better output in shorter bursts.\n\n**Physics:**\nDraw concept maps before reading. Your session notes show confusion on connections between concepts.\n\n**CS:**\nBreak milestones into sub-tasks in your task list — your completion rate improves 40% with smaller chunks.",
  default:
    "I'm here to help you study smarter! You can ask me to prioritize your tasks, optimize your schedule, analyze your progress, or suggest study strategies. What would you like help with?",
};

async function getAIResponse(message: string): Promise<string> {
  // TODO: Replace with real backend API call
  // const res = await fetch("/api/ai/chat", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ message }),
  // });
  // const data = await res.json();
  // return data.response;

  await new Promise((r) => setTimeout(r, 1200)); // simulate network delay
  const lower = message.toLowerCase();
  if (lower.includes("prioriti")) return mockResponses.prioritize;
  if (lower.includes("schedule") || lower.includes("optimiz")) return mockResponses.schedule;
  if (lower.includes("analyz") || lower.includes("progress") || lower.includes("session")) return mockResponses.analyze;
  if (lower.includes("strateg") || lower.includes("tip") || lower.includes("suggest")) return mockResponses.suggest;
  return mockResponses.default;
}

function formatMessageContent(content: string) {
  return content.split("\n").map((line, i) => {
    const boldLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: boldLine }} />
        {i < content.split("\n").length - 1 && <br />}
      </span>
    );
  });
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "Hi Jean! 👋 I'm your AI study assistant. I can help you prioritize tasks, optimize your schedule, analyze your study patterns, and suggest strategies. What would you like help with?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await getAIResponse(content);
      const assistantMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="h-[calc(100vh-48px)] bg-gray-50 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex flex-col h-full px-8 py-8 gap-6">

        {/* Header */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-2xl flex items-center justify-center shadow-sm shadow-teal-200">
              <span className="text-white text-base">✦</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">AI Assistant</h1>
              <p className="text-gray-400 text-sm">Smart task prioritization & schedule optimization</p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
              className="group flex flex-col gap-2 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-teal-200 hover:-translate-y-0.5 transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <span className="text-xl">{action.icon}</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-teal-700 transition-colors">
                  {action.title}
                </p>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed line-clamp-2">
                  {action.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Chat area */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden min-h-0">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                    <span className="text-white text-xs">✦</span>
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">J</span>
                  </div>
                )}

                {/* Bubble */}
                <div className={`flex flex-col gap-1 max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gray-900 text-white rounded-tr-sm"
                        : "bg-gray-100 text-gray-800 rounded-tl-sm"
                    }`}
                  >
                    {formatMessageContent(msg.content)}
                  </div>
                  <span className="text-xs text-gray-300 px-1">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            ))}

            {/* Loading bubble */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
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

          {/* Divider */}
          <div className="h-px bg-gray-100 flex-shrink-0" />

          {/* Input area */}
          <div className="flex-shrink-0 px-4 py-4 flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI for help..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all disabled:opacity-50 leading-relaxed"
              style={{ minHeight: "46px", maxHeight: "120px" }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="w-11 h-11 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>

          {/* Hint */}
          <p className="text-center text-xs text-gray-300 pb-3 flex-shrink-0">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}