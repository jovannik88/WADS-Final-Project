"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAiSync } from "@/lib/ai-sync-context";

type Priority = "HIGH" | "MEDIUM" | "LOW";
type Status = "PENDING" | "IN_PROGRESS" | "COMPLETED";
type Filter = "All" | "Pending" | "Completed";

interface Task {
  id: number;
  title: string;
  description: string | null;
  subject: string | null;
  priority: Priority;
  status: Status;
  dueDate: string | null;
  aiScore: number | null;
  aiReason: string | null;
  estimatedMins: number | null;
  progress: number; // 0-100, updated by timer sessions
}

const PRIORITY_CFG: Record<Priority, { bar: string; badge: string; dot: string }> = {
  HIGH: { bar: "bg-red-400", badge: "bg-red-50 text-red-500 ring-1 ring-inset ring-red-200", dot: "bg-red-400" },
  MEDIUM: { bar: "bg-amber-400", badge: "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200", dot: "bg-amber-400" },
  LOW: { bar: "bg-slate-300", badge: "bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200", dot: "bg-slate-300" },
};

const SUBJECT_COLORS: Record<string, { color: string; bg: string }> = {
  Math: { color: "text-blue-600", bg: "bg-blue-50" },
  English: { color: "text-violet-600", bg: "bg-violet-50" },
  Physics: { color: "text-emerald-600", bg: "bg-emerald-50" },
  "Computer Science": { color: "text-teal-600", bg: "bg-teal-50" },
};
const DEFAULT_SUBJECT = { color: "text-gray-600", bg: "bg-gray-100" };

// Converts an ISO datetime string to the value format required by datetime-local input
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface TaskFormState {
  title: string;
  description: string;
  subject: string;
  priority: Priority;
  dueDate: string;
  estimatedMins: string;
}

const EMPTY_FORM: TaskFormState = {
  title: "", description: "", subject: "", priority: "MEDIUM", dueDate: "", estimatedMins: "",
};


export default function TasksPage() {
  const router = useRouter();
  const { notifyChange } = useAiSync();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");

  // Modal state: null = closed, "add" = adding new, Task = editing existing
  const [modal, setModal] = useState<null | "add" | Task>(null);
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
  const openEdit = (task: Task) => {
    setForm({
      title: task.title,
      description: task.description ?? "",
      subject: task.subject ?? "",
      priority: task.priority,
      dueDate: toDatetimeLocal(task.dueDate),
      estimatedMins: task.estimatedMins?.toString() ?? "",
    });
    setModal(task);
  };
  const closeModal = () => { setModal(null); setForm(EMPTY_FORM); };

  const buildBody = () => {
    const body: Record<string, unknown> = { title: form.title.trim(), priority: form.priority };
    if (form.description.trim()) body.description = form.description.trim();
    if (form.subject.trim()) body.subject = form.subject.trim();
    if (form.dueDate) body.dueDate = new Date(form.dueDate).toISOString();
    if (form.estimatedMins) body.estimatedMins = parseInt(form.estimatedMins, 10);
    return body;
  };

  const addTask = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTasks((prev) => [data.task, ...prev]);
      closeModal();
      notifyChange("tasks");
      toast.success("Task added");
    } catch {
      toast.error("Failed to add task");
    } finally {
      setSubmitting(false);
    }
  };

  const saveEdit = async () => {
    if (typeof modal !== "object" || !modal || modal === null) return;
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${(modal as Task).id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === data.task.id ? data.task : t)));
      closeModal();
      notifyChange("tasks");
      toast.success("Task updated");
    } catch {
      toast.error("Failed to update task");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      notifyChange("tasks");
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      notifyChange("tasks");
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
      loadTasks();
    }
  };

  const counts = {
    All: tasks.length,
    Pending: tasks.filter((t) => t.status !== "COMPLETED").length,
    Completed: tasks.filter((t) => t.status === "COMPLETED").length,
  };

  const filtered = tasks.filter((t) => {
    const matchFilter =
      filter === "All" ||
      (filter === "Pending" ? t.status !== "COMPLETED" : t.status === "COMPLETED");
    const q = search.toLowerCase();
    return matchFilter && (
      t.title.toLowerCase().includes(q) ||
      (t.subject ?? "").toLowerCase().includes(q) ||
      (t.description ?? "").toLowerCase().includes(q)
    );
  });

  const isEditing = typeof modal === "object" && modal !== null;
  const onSubmit = isEditing ? saveEdit : addTask;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6 md:px-8 md:py-10">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Tasks</h1>
            <p className="text-gray-400 mt-2 text-sm">
              <span className="text-gray-700 font-semibold">{counts.Pending}</span> pending &nbsp;·&nbsp;
              <span className="text-gray-700 font-semibold">{counts.Completed}</span> completed
            </p>
          </div>
          <button
            id="add-task-btn"
            onClick={openAdd}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-[0.97] text-white px-6 py-3 rounded-2xl font-semibold text-sm shadow-lg shadow-teal-100 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add task
          </button>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="task-search"
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 shadow-sm transition-all"
            />
          </div>
          <div className="flex items-center bg-white border border-gray-200 rounded-2xl p-1 gap-1 shadow-sm">
            {(["All", "Pending", "Completed"] as Filter[]).map((f) => (
              <button
                key={f}
                id={`filter-${f.toLowerCase()}`}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  filter === f ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {f}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${filter === f ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"}`}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div className="flex flex-col gap-3">
          {loading ? (
            [1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-gray-600 font-semibold">No tasks found</p>
              <p className="text-gray-400 text-sm mt-1">Try a different search or filter</p>
            </div>
          ) : (
            filtered.map((task) => {
              const pc = PRIORITY_CFG[task.priority];
              const sc = SUBJECT_COLORS[task.subject ?? ""] ?? DEFAULT_SUBJECT;
              const done = task.status === "COMPLETED";
              return (
                <div
                  key={task.id}
                  onClick={() => openEdit(task)}
                  className={`group relative flex items-center gap-5 bg-white border rounded-2xl px-6 py-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${done ? "border-gray-100 opacity-55" : "border-gray-100 shadow-sm"}`}
                >
                  <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${pc.bar} ${done ? "opacity-30" : ""}`} />
                  {/* Complete toggle */}
                  <button
                    id={`toggle-task-${task.id}`}
                    onClick={(e) => { e.stopPropagation(); toggleStatus(task); }}
                    className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${done ? "border-teal-500 bg-teal-500" : "border-gray-300 hover:border-teal-400"}`}
                  >
                    {done && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-base leading-snug ${done ? "line-through text-gray-400" : "text-gray-900"}`}>
                      {task.title}
                    </p>
                    <p className="text-gray-400 text-sm mt-0.5 truncate">
                      {task.description ?? "No description"}
                      {task.aiScore != null && (
                        <span className="ml-2 text-teal-600 text-xs font-medium">· AI {task.aiScore.toFixed(0)}/100</span>
                      )}
                    </p>
                    {/* Read-only progress bar, updated by timer sessions */}
                    {task.progress > 0 && !done && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-teal-500 transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-teal-600 font-semibold flex-shrink-0">{task.progress}%</span>
                      </div>
                    )}
                    {done && task.progress > 0 && (
                      <span className="text-xs text-teal-500 font-medium mt-0.5 block">Completed at {task.progress}%</span>
                    )}
                  </div>

                  {/* Subject badge */}
                  {task.subject && (
                    <span className={`hidden md:inline-flex text-xs font-semibold px-3 py-1.5 rounded-xl ${sc.bg} ${sc.color}`}>
                      {task.subject}
                    </span>
                  )}

                  {/* Priority badge */}
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl capitalize ${pc.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
                    {task.priority.toLowerCase()}
                  </span>

                  {/* Due date with time */}
                  {task.dueDate && (
                    <span className="text-sm text-gray-400 whitespace-nowrap font-medium">
                      {new Date(task.dueDate).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}

                  {/* Edit button */}
                  <button
                    id={`edit-task-${task.id}`}
                    onClick={(e) => { e.stopPropagation(); openEdit(task); }}
                    className="opacity-0 group-hover:opacity-100 transition-all text-gray-300 hover:text-teal-500 hover:bg-teal-50 p-1.5 rounded-lg flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Delete button */}
                  <button
                    id={`delete-task-${task.id}`}
                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-all text-gray-300 hover:text-red-400 hover:bg-red-50 p-1.5 rounded-lg flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modal !== null && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{isEditing ? "Edit Task" : "New Task"}</h2>
                <p className="text-gray-400 text-sm mt-0.5">
                  {isEditing ? "Update task details" : "AI will prioritize it automatically"}
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl p-2 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-7 py-6 flex flex-col gap-5">
              {/* Title */}
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Title *</label>
                <input
                  id="task-title-input"
                  type="text"
                  placeholder="e.g. Complete chapter 4 exercises"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSubmit()}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all placeholder:text-gray-300"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Description</label>
                <input
                  type="text"
                  placeholder="Short description (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all placeholder:text-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Subject */}
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Math"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all placeholder:text-gray-300"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Priority</label>
                  <select
                    id="task-priority-select"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all bg-white"
                  >
                    <option value="HIGH">🔴 High</option>
                    <option value="MEDIUM">🟡 Medium</option>
                    <option value="LOW">⚪ Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Due Date + Time */}
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Due Date & Time</label>
                  <input
                    id="task-due-datetime"
                    type="datetime-local"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all"
                  />
                </div>

                {/* Estimated Minutes */}
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Est. Minutes</label>
                  <input
                    type="number"
                    placeholder="e.g. 45"
                    min="1"
                    max="600"
                    value={form.estimatedMins}
                    onChange={(e) => setForm({ ...form, estimatedMins: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-7 pb-7">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-2xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                id="submit-task-btn"
                onClick={onSubmit}
                disabled={!form.title.trim() || submitting}
                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] shadow-lg shadow-teal-100"
              >
                {submitting ? (isEditing ? "Saving..." : "Adding...") : (isEditing ? "Save Changes" : "Add Task")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}