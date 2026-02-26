"use client";

import { useState } from "react";

type Priority = "high" | "medium" | "low";
type Status = "pending" | "completed";
type Filter = "All" | "Pending" | "Completed";

interface Task {
  id: number;
  title: string;
  description: string;
  subject: string;
  priority: Priority;
  dueDate: string;
  status: Status;
}

const initialTasks: Task[] = [
  { id: 1, title: "Calculus Problem Set", description: "Complete exercise 1-20 from chapter 4", subject: "Math", priority: "high", dueDate: "25 Feb", status: "pending" },
  { id: 2, title: "English Essay Draft", description: "First draft of comparative essay", subject: "English", priority: "high", dueDate: "25 Feb", status: "pending" },
  { id: 3, title: "Physics Lab Report", description: "Write up results from Tuesday's experiment", subject: "Physics", priority: "medium", dueDate: "25 Feb", status: "pending" },
  { id: 4, title: "Calculus Review", description: "Review chapters 1-3 for upcoming quiz", subject: "Math", priority: "low", dueDate: "28 Feb", status: "pending" },
  { id: 5, title: "CS Project Milestone", description: "Finish the frontend prototype", subject: "Computer Science", priority: "high", dueDate: "26 Feb", status: "completed" },
];

const priorityConfig: Record<Priority, { bar: string; badge: string; dot: string }> = {
  high:   { bar: "bg-red-400",   badge: "bg-red-50 text-red-500 ring-1 ring-inset ring-red-200",      dot: "bg-red-400" },
  medium: { bar: "bg-amber-400", badge: "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200", dot: "bg-amber-400" },
  low:    { bar: "bg-slate-300", badge: "bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200", dot: "bg-slate-300" },
};

const subjectConfig: Record<string, { color: string; bg: string }> = {
  Math:             { color: "text-blue-600",   bg: "bg-blue-50" },
  English:          { color: "text-violet-600", bg: "bg-violet-50" },
  Physics:          { color: "text-emerald-600",bg: "bg-emerald-50" },
  "Computer Science":{ color: "text-teal-600",  bg: "bg-teal-50" },
};

const defaultSubject = { color: "text-gray-600", bg: "bg-gray-100" };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "", description: "", subject: "", priority: "medium" as Priority, dueDate: "",
  });

  const counts = {
    All: tasks.length,
    Pending: tasks.filter((t) => t.status === "pending").length,
    Completed: tasks.filter((t) => t.status === "completed").length,
  };

  const filtered = tasks.filter((t) => {
    const matchesFilter =
      filter === "All" ||
      (filter === "Pending" ? t.status === "pending" : t.status === "completed");
    const q = search.toLowerCase();
    return matchesFilter && (
      t.title.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  });

  const toggleStatus = (id: number) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === "pending" ? "completed" : "pending" } : t))
    );

  const deleteTask = (id: number) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const addTask = () => {
    if (!newTask.title.trim()) return;
    const formatted = newTask.dueDate
      ? new Date(newTask.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
      : "No date";
    setTasks((prev) => [...prev, { ...newTask, id: Date.now(), status: "pending", dueDate: formatted }]);
    setNewTask({ title: "", description: "", subject: "", priority: "medium", dueDate: "" });
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-8 py-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Tasks</h1>
            <p className="text-gray-400 mt-2 text-sm">
              <span className="text-gray-700 font-semibold">{counts.Pending}</span> pending &nbsp;·&nbsp;
              <span className="text-gray-700 font-semibold">{counts.Completed}</span> completed
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-[0.97] text-white px-6 py-3 rounded-2xl font-semibold transition-all text-sm shadow-lg shadow-teal-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add task
          </button>
        </div>

        {/* ── Search + Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent shadow-sm transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors p-0.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center bg-white border border-gray-200 rounded-2xl p-1 gap-1 shadow-sm">
            {(["All", "Pending", "Completed"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  filter === f
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {f}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  filter === f ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"
                }`}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Task List ── */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-600 font-semibold text-base">No tasks found</p>
              <p className="text-gray-400 text-sm mt-1">Try a different search or filter</p>
            </div>
          ) : (
            filtered.map((task) => {
              const pc = priorityConfig[task.priority];
              const sc = subjectConfig[task.subject] ?? defaultSubject;
              const done = task.status === "completed";
              return (
                <div
                  key={task.id}
                  className={`group relative flex items-center gap-5 bg-white border rounded-2xl px-6 py-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                    done ? "border-gray-100 opacity-55" : "border-gray-100 shadow-sm"
                  }`}
                >
                  {/* Priority bar */}
                  <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${pc.bar} ${done ? "opacity-30" : ""}`} />

                  {/* Checkbox */}
                  <button
                    onClick={() => toggleStatus(task.id)}
                    className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                      done
                        ? "border-teal-500 bg-teal-500 shadow-sm shadow-teal-200"
                        : "border-gray-300 hover:border-teal-400 hover:shadow-sm hover:shadow-teal-100"
                    }`}
                  >
                    {done && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-base leading-snug ${done ? "line-through text-gray-400" : "text-gray-900"}`}>
                      {task.title}
                    </p>
                    <p className="text-gray-400 text-sm mt-0.5 truncate">{task.description}</p>
                  </div>

                  {/* Subject */}
                  <span className={`hidden md:inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-xl ${sc.bg} ${sc.color}`}>
                    {task.subject}
                  </span>

                  {/* Priority */}
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl capitalize ${pc.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
                    {task.priority}
                  </span>

                  {/* Date */}
                  <span className="text-sm text-gray-400 whitespace-nowrap font-medium w-14 text-right">{task.dueDate}</span>

                  {/* Delete */}
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 transition-all duration-150 text-gray-200 hover:text-red-400 hover:bg-red-50 p-1.5 rounded-lg ml-1 flex-shrink-0"
                    title="Delete"
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

      {/* ── Add Task Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">New Task</h2>
                <p className="text-gray-400 text-sm mt-0.5">Add a new task to your list</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl p-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-7 py-6 flex flex-col gap-5">
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Complete chapter 4 exercises"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Description</label>
                <input
                  type="text"
                  placeholder="Short description (optional)"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all placeholder:text-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Math"
                    value={newTask.subject}
                    onChange={(e) => setNewTask({ ...newTask, subject: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Priority })}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all bg-white"
                  >
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">⚪ Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-7 pb-7">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-2xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addTask}
                disabled={!newTask.title.trim()}
                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] shadow-lg shadow-teal-200"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}