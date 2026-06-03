"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAiSync } from "@/lib/ai-sync-context";

type EventType = "CLASS" | "EXAM" | "STUDY_BLOCK" | "PERSONAL";

interface CalEvent {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  color: string | null;
  eventType: EventType;
  aiGenerated: boolean;
  taskId: number | null;
}

const TYPE_CFG: Record<EventType, { bg: string; dot: string; text: string; label: string }> = {
  CLASS:       { bg: "bg-blue-100 border-l-2 border-blue-400",   dot: "bg-blue-400",   text: "text-blue-700",   label: "Class" },
  EXAM:        { bg: "bg-amber-100 border-l-2 border-amber-400", dot: "bg-amber-400",  text: "text-amber-700",  label: "Exam" },
  STUDY_BLOCK: { bg: "bg-teal-100 border-l-2 border-teal-500",   dot: "bg-teal-500",   text: "text-teal-700",   label: "Study Block" },
  PERSONAL:    { bg: "bg-violet-100 border-l-2 border-violet-400", dot: "bg-violet-400", text: "text-violet-700", label: "Personal" },
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number)    { return new Date(y, m, 1).getDay(); }
function fmtTime(iso: string)                 { return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }
function toLocalDT(iso: string)               { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }

// Default datetime-local value for a given calendar day in the current view
function defaultDT(year: number, month: number, day: number) {
  const d = new Date(year, month, day, 9, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T09:00`;
}

export default function CalendarPage() {
  const router = useRouter();
  const { refreshing: aiRefreshing } = useAiSync();
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);

  const EMPTY_FORM = { title: "", description: "", startTime: "", endTime: "", eventType: "PERSONAL" as EventType, allDay: false };
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  // taskId → progress cache for displaying progress bars on AI study block events
  const [taskProgress, setTaskProgress] = useState<Record<number, number>>({});

  // Fetch events for the currently displayed month
  const loadEvents = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const startDate = new Date(y, m, 1).toISOString();
      const endDate   = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
      const res = await fetch(`/api/events?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadEvents(year, month); }, [loadEvents, year, month]);

  // When events load, fetch progress for any AI study block events with taskIds
  useEffect(() => {
    const aiTaskIds = [...new Set(events.filter(e => e.aiGenerated && e.taskId).map(e => e.taskId as number))];
    if (aiTaskIds.length === 0) return;
    Promise.all(aiTaskIds.map(id => fetch(`/api/tasks/${id}`).then(r => r.ok ? r.json() : null)))
      .then(results => {
        const map: Record<number, number> = {};
        results.forEach(r => { if (r?.task) map[r.task.id] = r.task.progress ?? 0; });
        setTaskProgress(map);
      })
      .catch(() => {});
  }, [events]);

  // Re-load events whenever the AI finishes refreshing (schedule blocks may have changed)
  const prevRefreshingRef = useRef(false);
  useEffect(() => {
    if (prevRefreshingRef.current && !aiRefreshing) {
      loadEvents(year, month);
    }
    prevRefreshingRef.current = aiRefreshing;
  }, [aiRefreshing, loadEvents, year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelected(null);
  };

  const openDayPopup = (day: number) => { setSelected(day); setShowDayModal(true); };
  const closeDayModal = () => { setShowDayModal(false); };

  const openAdd = (day: number) => {
    const dt = defaultDT(year, month, day);
    setForm({ title: "", description: "", startTime: dt, endTime: dt, eventType: "PERSONAL", allDay: false });
    setEditingEvent(null);
    setShowAddModal(true);
  };

  const openEdit = (ev: CalEvent) => {
    setForm({ title: ev.title, description: ev.description ?? "", startTime: toLocalDT(ev.startTime), endTime: toLocalDT(ev.endTime), eventType: ev.eventType, allDay: ev.allDay });
    setEditingEvent(ev);
    setShowAddModal(true);
  };

  const closeAddModal = () => { setShowAddModal(false); setEditingEvent(null); };

  const { notifyChange } = useAiSync();

  const submitEvent = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSubmitting(true);
    try {
      const body = { title: form.title.trim(), description: form.description.trim() || undefined, startTime: new Date(form.startTime).toISOString(), endTime: new Date(form.endTime || form.startTime).toISOString(), eventType: form.eventType, allDay: form.allDay };
      if (editingEvent) {
        const res = await fetch(`/api/events/${editingEvent.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? data.event : e));
        toast.success("Event updated");
      } else {
        const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setEvents(prev => [...prev, data.event]);
        toast.success("Event added");
      }
      closeAddModal();
      notifyChange("events");
    } catch {
      toast.error(editingEvent ? "Failed to update event" : "Failed to add event");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEvent = async (id: number) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      notifyChange("events");
      toast.success("Event deleted");
    } catch {
      toast.error("Failed to delete event");
      loadEvents(year, month);
    }
  };

  // Map DB events to calendar days
  const eventsForDay = (day: number) =>
    events.filter(e => {
      const d = new Date(e.startTime);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  // Build grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDay(year, month);
  const prevDays    = getDaysInMonth(year, month - 1 < 0 ? 11 : month - 1);
  const cells: { day: number; current: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, current: false });
  for (let d = 1; d <= daysInMonth; d++)  cells.push({ day: d, current: true });
  while (cells.length % 7 !== 0)          cells.push({ day: cells.length - firstDay - daysInMonth + 1, current: false });

  const selectedEvents = selected ? eventsForDay(selected) : [];
  const monthEventCount = events.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-8 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Calendar</h1>
            <p className="text-gray-400 mt-1.5 text-sm">
              {aiRefreshing
                ? <span className="text-teal-500 font-medium animate-pulse">Syncing AI schedule...</span>
                : loading ? "Loading..."
                : `${monthEventCount} event${monthEventCount !== 1 ? "s" : ""} this month`
              }
            </p>
          </div>
          <button
            id="add-event-btn"
            onClick={() => openAdd(selected ?? now.getDate())}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-[0.97] text-white px-6 py-3 rounded-2xl font-semibold transition-all text-sm shadow-lg shadow-teal-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add event
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mb-6 flex-wrap">
          {(Object.entries(TYPE_CFG) as [EventType, typeof TYPE_CFG[EventType]][]).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <span className={`w-2 h-2 rounded-full ${val.dot}`} />
              {val.label}
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-xs text-teal-600 font-semibold">
            <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold">AI</span>
            AI-generated
          </div>
        </div>

        {/* Calendar card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Month nav */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
            <button id="prev-month-btn" onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-xl font-bold text-gray-900">{MONTHS[month]} {year}</h2>
            <button id="next-month-btn" onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map(d => (
              <div key={d} className="py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const dayEvts = cell.current ? eventsForDay(cell.day) : [];
              const isSelected = selected === cell.day && cell.current;
              const isToday = cell.current && cell.day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
              const isLastRow = idx >= cells.length - 7;
              const isLastCol = (idx + 1) % 7 === 0;

              return (
                <div
                  key={idx}
                  onClick={() => { if (!cell.current) return; openDayPopup(cell.day); }}
                  className={`relative min-h-[100px] p-2 transition-all cursor-pointer
                    ${!isLastRow ? "border-b border-gray-100" : ""}
                    ${!isLastCol ? "border-r border-gray-100" : ""}
                    ${!cell.current ? "bg-gray-50/60" : "hover:bg-gray-50"}
                    ${isSelected ? "bg-teal-50/60 ring-2 ring-inset ring-teal-400" : ""}
                  `}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold transition-all
                      ${isToday ? "bg-teal-600 text-white shadow-sm shadow-teal-300" : ""}
                      ${!isToday && cell.current ? "text-gray-700" : "text-gray-300"}
                      ${isSelected && !isToday ? "text-teal-700" : ""}
                    `}>
                      {cell.day}
                    </span>
                    {cell.current && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openAdd(cell.day); }}
                        className="opacity-0 hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-teal-600 hover:bg-teal-50 transition-all text-lg leading-none"
                      >+</button>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    {dayEvts.slice(0, 2).map(ev => {
                      const cfg = TYPE_CFG[ev.eventType];
                      return (
                        <div
                          key={ev.id}
                          className={`flex items-center justify-between px-1.5 py-0.5 rounded-md text-xs font-medium truncate ${cfg.bg} ${cfg.text}`}
                          title={ev.title}
                        >
                          <span className="truncate flex items-center gap-1">
                            {ev.aiGenerated && <span className="text-[9px] bg-teal-600 text-white px-1 rounded font-bold flex-shrink-0">AI</span>}
                            {ev.title}
                          </span>
                          <span className="ml-1 opacity-60 flex-shrink-0 text-[10px]">{fmtTime(ev.startTime)}</span>
                        </div>
                      );
                    })}
                    {dayEvts.length > 2 && (
                      <div className="text-[10px] text-gray-400 font-semibold pl-1">+{dayEvts.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day popup modal */}
      {showDayModal && selected !== null && (() => {
        const dayEvts = eventsForDay(selected).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        const dateLabel = new Date(year, month, selected).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && closeDayModal()}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{dateLabel}</h2>
                  <p className="text-sm text-gray-400 mt-0.5">{dayEvts.length === 0 ? "No events" : `${dayEvts.length} event${dayEvts.length > 1 ? "s" : ""}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { closeDayModal(); openAdd(selected); }} className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:bg-teal-50 px-3 py-2 rounded-xl transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    Add
                  </button>
                  <button onClick={closeDayModal} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl p-2 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {dayEvts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                    <span className="text-4xl mb-3">📅</span>
                    <p className="text-sm font-medium">No events scheduled</p>
                    <p className="text-xs mt-1">Click "Add" to create one</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {dayEvts.map(ev => {
                      const cfg = TYPE_CFG[ev.eventType];
                      return (
                        <div key={ev.id} className="group flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                          <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 text-sm">{ev.title}</p>
                              {ev.aiGenerated && <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold">AI</span>}
                            </div>
                            <p className={`text-xs mt-0.5 ${cfg.text}`}>{cfg.label}</p>
                            {ev.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{ev.description}</p>}
                            {/* Read-only task progress bar for AI study blocks */}
                            {ev.aiGenerated && ev.taskId && (taskProgress[ev.taskId] ?? 0) > 0 && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${taskProgress[ev.taskId]}%` }} />
                                </div>
                                <span className="text-[10px] text-teal-600 font-semibold flex-shrink-0">{taskProgress[ev.taskId]}% done</span>
                              </div>
                            )}
                          </div>
                          <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg whitespace-nowrap flex-shrink-0">
                            {fmtTime(ev.startTime)}{ev.endTime !== ev.startTime ? ` – ${fmtTime(ev.endTime)}` : ""}
                          </div>
                          {!ev.aiGenerated && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button id={`edit-event-${ev.id}`} onClick={() => { closeDayModal(); openEdit(ev); }} className="text-gray-300 hover:text-teal-500 hover:bg-teal-50 p-1.5 rounded-lg transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button id={`delete-event-${ev.id}`} onClick={() => deleteEvent(ev.id)} className="text-gray-300 hover:text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add / Edit event modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && closeAddModal()}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingEvent ? "Edit Event" : "New Event"}</h2>
                <p className="text-gray-400 text-sm mt-0.5">{editingEvent ? "Update event details" : "Add to your calendar"}</p>
              </div>
              <button onClick={closeAddModal} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl p-2 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-7 py-6 flex flex-col gap-5">
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Title *</label>
                <input id="event-title-input" autoFocus type="text" placeholder="e.g. Math midterm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} onKeyDown={e => e.key === "Enter" && submitEvent()} className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all placeholder:text-gray-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Description</label>
                <input type="text" placeholder="Optional details" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all placeholder:text-gray-300" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Start</label>
                  <input id="event-start-input" type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value, endTime: e.target.value })} className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">End</label>
                  <input id="event-end-input" type="datetime-local" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(TYPE_CFG) as [EventType, typeof TYPE_CFG[EventType]][]).filter(([key]) => key !== "STUDY_BLOCK").map(([key, val]) => (
                    <button key={key} type="button" onClick={() => setForm({ ...form, eventType: key })} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${form.eventType === key ? "border-teal-400 bg-teal-50 text-teal-700 ring-2 ring-teal-300" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      <span className={`w-2 h-2 rounded-full ${val.dot}`} />{val.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-7 pb-7">
              <button onClick={closeAddModal} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-2xl text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
              <button id="submit-event-btn" onClick={submitEvent} disabled={!form.title.trim() || submitting} className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] shadow-lg shadow-teal-200">
                {submitting ? (editingEvent ? "Saving..." : "Adding...") : (editingEvent ? "Save Changes" : "Add Event")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}