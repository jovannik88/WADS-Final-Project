"use client";

import { useState } from "react";

type EventCategory = "assignment" | "exam" | "personal" | "activity";

interface CalEvent {
  id: number;
  title: string;
  time?: string;
  category: EventCategory;
  day: number; // day of month
}

const categoryConfig: Record<EventCategory, { bg: string; dot: string; text: string }> = {
  assignment: { bg: "bg-red-100 border-l-2 border-red-400",   dot: "bg-red-400",    text: "text-red-700" },
  exam:       { bg: "bg-amber-100 border-l-2 border-amber-400", dot: "bg-amber-400", text: "text-amber-700" },
  personal:   { bg: "bg-teal-100 border-l-2 border-teal-400",  dot: "bg-teal-500",   text: "text-teal-700" },
  activity:   { bg: "bg-blue-100 border-l-2 border-blue-400",  dot: "bg-blue-400",   text: "text-blue-700" },
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const initialEvents: CalEvent[] = [
  { id: 1,  title: "DS HW Due",       time: "15:00", category: "assignment", day: 1  },
  { id: 2,  title: "Tennis Practice", time: "19:00", category: "activity",   day: 1  },
  { id: 3,  title: "GYM",             time: "21:00", category: "activity",   day: 5  },
  { id: 4,  title: "POM Quiz",        time: "08:00", category: "exam",       day: 8  },
  { id: 5,  title: "Project Report",  time: "15:00", category: "assignment", day: 8  },
  { id: 6,  title: "Algebra Quiz",    time: "11:00", category: "exam",       day: 15 },
  { id: 7,  title: "GF Birthday",                    category: "personal",   day: 18 },
  { id: 8,  title: "Sdcomp HW",       time: "23:59", category: "assignment", day: 18 },
  { id: 9,  title: "Dinner With GF",                 category: "personal",   day: 20 },
  { id: 10, title: "Paddle Practice", time: "17:00", category: "activity",   day: 23 },
  { id: 11, title: "WADS Quiz",       time: "17:00", category: "exam",       day: 28 },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear]   = useState(2026);
  const [month, setMonth] = useState(0); // January
  const [events, setEvents] = useState<CalEvent[]>(initialEvents);
  const [selected, setSelected] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", time: "", category: "personal" as EventCategory, day: 1 });

  const daysInMonth  = getDaysInMonth(year, month);
  const firstDay     = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1 < 0 ? 11 : month - 1);

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

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const eventsForDay = (day: number) => events.filter((e) => e.day === day);

  const addEvent = () => {
    if (!newEvent.title.trim()) return;
    setEvents(prev => [...prev, { ...newEvent, id: Date.now() }]);
    setNewEvent({ title: "", time: "", category: "personal", day: selected ?? 1 });
    setShowEventModal(false);
  };

  const deleteEvent = (id: number) => setEvents(prev => prev.filter(e => e.id !== id));

  // Build grid cells
  const cells: { day: number; currentMonth: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, currentMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, currentMonth: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - firstDay - daysInMonth + 1, currentMonth: false });

  const selectedEvents = selected ? eventsForDay(selected) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-8 py-10">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Calendar</h1>
            <p className="text-gray-400 mt-1.5 text-sm">{events.length} events this month</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setNewEvent(n => ({ ...n, day: selected ?? 1 })); }}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-[0.97] text-white px-6 py-3 rounded-2xl font-semibold transition-all text-sm shadow-lg shadow-teal-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add event
          </button>
        </div>

        {/* ── Legend ── */}
        <div className="flex items-center gap-5 mb-6">
          {(Object.entries(categoryConfig) as [EventCategory, typeof categoryConfig[EventCategory]][]).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500 capitalize font-medium">
              <span className={`w-2 h-2 rounded-full ${val.dot}`} />
              {key}
            </div>
          ))}
        </div>

        {/* ── Calendar Card ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Month Nav */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
            <button
              onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-gray-900">{MONTHS[month]} {year}</h2>
            <button
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map((d) => (
              <div key={d} className="py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const dayEvents = cell.currentMonth ? eventsForDay(cell.day) : [];
              const isSelected = selected === cell.day && cell.currentMonth;
              const isTodayCell = cell.currentMonth && isToday(cell.day);
              const isLastRow = idx >= cells.length - 7;
              const isLastCol = (idx + 1) % 7 === 0;

              return (
                <div
                  key={idx}
                  onClick={() => cell.currentMonth && setSelected(isSelected ? null : cell.day)}
                  className={`relative min-h-[100px] p-2 transition-all cursor-pointer
                    ${!isLastRow ? "border-b border-gray-100" : ""}
                    ${!isLastCol ? "border-r border-gray-100" : ""}
                    ${!cell.currentMonth ? "bg-gray-50/60" : "hover:bg-gray-50"}
                    ${isSelected ? "bg-teal-50/60 ring-2 ring-inset ring-teal-400" : ""}
                  `}
                >
                  {/* Day number */}
                  <div className="flex justify-end mb-1.5">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold transition-all
                      ${isTodayCell ? "bg-teal-600 text-white shadow-sm shadow-teal-300" : ""}
                      ${!isTodayCell && cell.currentMonth ? "text-gray-700" : "text-gray-300"}
                      ${isSelected && !isTodayCell ? "text-teal-700" : ""}
                    `}>
                      {cell.day}
                    </span>
                  </div>

                  {/* Events (show max 2, then +N more) */}
                  <div className="flex flex-col gap-1">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const cc = categoryConfig[ev.category];
                      return (
                        <div
                          key={ev.id}
                          className={`flex items-center justify-between px-1.5 py-0.5 rounded-md text-xs font-medium truncate ${cc.bg} ${cc.text}`}
                          title={ev.title}
                        >
                          <span className="truncate">{ev.title}</span>
                          {ev.time && <span className="ml-1 opacity-60 flex-shrink-0 text-[10px]">{ev.time}</span>}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-gray-400 font-semibold pl-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Day Detail Panel ── */}
        {selected && (
          <div className="mt-6 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {MONTHS[month]} {selected}, {year}
                </h3>
                <p className="text-gray-400 text-sm mt-0.5">
                  {selectedEvents.length === 0 ? "No events" : `${selectedEvents.length} event${selectedEvents.length > 1 ? "s" : ""}`}
                </p>
              </div>
              <button
                onClick={() => { setShowEventModal(true); setNewEvent(n => ({ ...n, day: selected })); }}
                className="flex items-center gap-1.5 text-teal-600 hover:bg-teal-50 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>

            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <svg className="w-8 h-8 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium">No events on this day</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {selectedEvents.map((ev) => {
                  const cc = categoryConfig[ev.category];
                  return (
                    <div key={ev.id} className="group flex items-center gap-4 px-7 py-4 hover:bg-gray-50 transition-colors">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cc.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{ev.title}</p>
                        <p className={`text-xs mt-0.5 capitalize ${cc.text}`}>{ev.category}</p>
                      </div>
                      {ev.time && (
                        <span className="text-sm font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {ev.time}
                        </span>
                      )}
                      <button
                        onClick={() => deleteEvent(ev.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 hover:bg-red-50 p-1.5 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Event Modal ── */}
      {(showModal || showEventModal) && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setShowEventModal(false); } }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">New Event</h2>
                <p className="text-gray-400 text-sm mt-0.5">Add an event to your calendar</p>
              </div>
              <button
                onClick={() => { setShowModal(false); setShowEventModal(false); }}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl p-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-7 py-6 flex flex-col gap-5">
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Title *</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="Event title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addEvent()}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all placeholder:text-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Day</label>
                  <input
                    type="number"
                    min={1}
                    max={daysInMonth}
                    value={newEvent.day}
                    onChange={(e) => setNewEvent({ ...newEvent, day: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Time</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(categoryConfig) as [EventCategory, typeof categoryConfig[EventCategory]][]).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setNewEvent({ ...newEvent, category: key })}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium capitalize transition-all ${
                        newEvent.category === key
                          ? "border-teal-400 bg-teal-50 text-teal-700 ring-2 ring-teal-300"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${val.dot}`} />
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-7 pb-7">
              <button
                onClick={() => { setShowModal(false); setShowEventModal(false); }}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-2xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addEvent}
                disabled={!newEvent.title.trim()}
                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] shadow-lg shadow-teal-200"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}