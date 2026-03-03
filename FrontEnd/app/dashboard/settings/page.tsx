"use client";

import { useState } from "react";
import { toast } from "sonner";

// ── Mock user data — replace with fetch("/api/user/profile") ──────────────
const mockUser = {
  name: "Jean Mamy",
  email: "jean.mamy@gmail.com",
  avatar: "JP",
  peakStudyStart: "19:00",
  peakStudyEnd:   "21:00",
  timezone: "Asia/Jakarta",
  weeklyGoalHours: 20,
  subjects: ["Math", "English", "Physics", "Computer Science"],
};

const TIMEZONES = [
  "Asia/Jakarta", "Asia/Singapore", "Asia/Tokyo",
  "America/New_York", "America/Los_Angeles", "Europe/London", "UTC",
];

const SUBJECT_OPTIONS = [
  "Math", "English", "Physics", "Chemistry", "Biology",
  "Computer Science", "History", "Economics", "Art", "Music",
];

const SUBJECT_COLORS: Record<string, string> = {
  Math: "bg-blue-50 text-blue-600 ring-1 ring-blue-200",
  English: "bg-violet-50 text-violet-600 ring-1 ring-violet-200",
  Physics: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
  "Computer Science": "bg-teal-50 text-teal-600 ring-1 ring-teal-200",
  Chemistry: "bg-orange-50 text-orange-600 ring-1 ring-orange-200",
  Biology: "bg-green-50 text-green-600 ring-1 ring-green-200",
  History: "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
  Economics: "bg-cyan-50 text-cyan-600 ring-1 ring-cyan-200",
  Art: "bg-pink-50 text-pink-600 ring-1 ring-pink-200",
  Music: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200",
};

type Tab = "profile" | "study" | "notifications" | "account";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "profile",       label: "Profile",        icon: "👤" },
  { id: "study",         label: "Study Prefs",    icon: "📚" },
  { id: "notifications", label: "Notifications",  icon: "🔔" },
  { id: "account",       label: "Account",        icon: "⚙️"  },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        value ? "bg-teal-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block w-5 h-5 mt-0.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          value ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SectionCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7">
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 text-base">{title}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

const inputCls = "h-11 w-full border border-gray-200 rounded-2xl px-4 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all";
const selectCls = "h-11 w-full border border-gray-200 rounded-2xl px-4 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all appearance-none";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile state — source: User table
  const [name,     setName]     = useState(mockUser.name);
  const [email,    setEmail]    = useState(mockUser.email);
  const [timezone, setTimezone] = useState(mockUser.timezone);

  // Study prefs — source: User.peak_study_start_time / peak_study_end_time + frontend prefs
  const [peakStart,      setPeakStart]      = useState(mockUser.peakStudyStart);
  const [peakEnd,        setPeakEnd]        = useState(mockUser.peakStudyEnd);
  const [weeklyGoal,     setWeeklyGoal]     = useState(mockUser.weeklyGoalHours);
  const [subjects,       setSubjects]       = useState<string[]>(mockUser.subjects);
  const [pomodoroWork,   setPomodoroWork]   = useState(25);
  const [pomodoroBreak,  setPomodoroBreak]  = useState(5);
  const [aiSchedule,     setAiSchedule]     = useState(true);
  const [autoTimer,      setAutoTimer]      = useState(false);

  // Notifications
  const [notifDeadline,   setNotifDeadline]   = useState(true);
  const [notifSession,    setNotifSession]    = useState(true);
  const [notifAI,         setNotifAI]         = useState(true);
  const [notifStreak,     setNotifStreak]     = useState(false);
  const [notifEmail,      setNotifEmail]      = useState(false);
  const [deadlineHours,   setDeadlineHours]   = useState("24");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput,       setDeleteInput]       = useState("");

  const toggleSubject = (s: string) => {
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleSaveProfile = () => {
    // PUT /api/user/profile { name, email, timezone }
    toast.success("Profile updated successfully");
  };

  const handleSaveStudy = () => {
    // PUT /api/user/study-prefs { peakStart, peakEnd, weeklyGoal, subjects, pomodoroWork, pomodoroBreak }
    toast.success("Study preferences saved");
  };

  const handleSaveNotifications = () => {
    // PUT /api/user/notifications { notifDeadline, notifSession, notifAI, notifStreak, notifEmail, deadlineHours }
    toast.success("Notification settings saved");
  };

  const handleChangePassword = () => {
    // POST /api/auth/send-reset-email
    toast.success("Password reset email sent — check your inbox 📬");
  };

  const handleDeleteAccount = () => {
    if (deleteInput !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    // DELETE /api/user
    toast.error("Account deletion requested");
    setShowDeleteConfirm(false);
    setDeleteInput("");
  };

  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-7">

        {/* ── Header ── */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-gray-400 mt-1.5 text-sm">Manage your profile, study preferences, and account</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Sidebar tabs ── */}
          <div className="w-full lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-2 flex flex-row lg:flex-col gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all text-left w-full ${
                    activeTab === tab.id
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <span className="text-base flex-shrink-0">{tab.icon}</span>
                  <span className="hidden lg:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab content ── */}
          <div className="flex-1 flex flex-col gap-5 min-w-0">

            {/* ─── PROFILE TAB ─── */}
            {activeTab === "profile" && (
              <>
                <SectionCard title="Your Profile" sub="User · name, email, timezone">

                  {/* Avatar */}
                  <div className="flex items-center gap-5 mb-7 pb-7 border-b border-gray-100">
                    <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-2xl font-bold">{initials}</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{name}</p>
                      <p className="text-gray-400 text-sm mt-0.5">{email}</p>
                      <p className="text-xs text-teal-600 font-medium mt-2 bg-teal-50 px-2.5 py-1 rounded-lg inline-block">
                        Free plan
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-5">
                    <Field label="Full Name">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Email Address" hint="Used for login and notifications">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Timezone" hint="Used to schedule study sessions at the right local time">
                      <div className="relative">
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className={selectCls}
                        >
                          {TIMEZONES.map((tz) => (
                            <option key={tz} value={tz}>{tz}</option>
                          ))}
                        </select>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▾</span>
                      </div>
                    </Field>
                  </div>

                  <div className="mt-7 flex justify-end">
                    <button
                      onClick={handleSaveProfile}
                      className="bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all shadow-sm shadow-teal-200"
                    >
                      Save Profile
                    </button>
                  </div>
                </SectionCard>
              </>
            )}

            {/* ─── STUDY PREFS TAB ─── */}
            {activeTab === "study" && (
              <>
                {/* Peak hours */}
                <SectionCard title="Peak Study Hours" sub="User · peak_study_start_time / peak_study_end_time — AI uses this for scheduling">
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <Field label="Start Time">
                      <input type="time" value={peakStart} onChange={(e) => setPeakStart(e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="End Time">
                      <input type="time" value={peakEnd} onChange={(e) => setPeakEnd(e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    The AI will prioritize scheduling your most difficult tasks within this window.
                  </p>
                </SectionCard>

                {/* Weekly goal */}
                <SectionCard title="Weekly Study Goal" sub="Target hours per week for analytics tracking">
                  <div className="flex items-center gap-5">
                    <div className="flex-1">
                      <input
                        type="range" min={1} max={60} step={1}
                        value={weeklyGoal}
                        onChange={(e) => setWeeklyGoal(Number(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-teal-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-300 mt-1.5">
                        <span>1h</span><span>30h</span><span>60h</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-3xl font-bold text-gray-900">{weeklyGoal}<span className="text-lg text-gray-400">h</span></p>
                      <p className="text-xs text-gray-400">per week</p>
                    </div>
                  </div>
                </SectionCard>

                {/* Subjects */}
                <SectionCard title="Your Subjects" sub="Task · subject — select all subjects you're currently studying">
                  <div className="flex flex-wrap gap-2">
                    {SUBJECT_OPTIONS.map((s) => {
                      const active = subjects.includes(s);
                      const colorCls = SUBJECT_COLORS[s] ?? "bg-gray-50 text-gray-600 ring-1 ring-gray-200";
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSubject(s)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            active ? colorCls : "bg-gray-50 text-gray-400 ring-1 ring-gray-100 hover:ring-gray-200"
                          }`}
                        >
                          {active && <span className="mr-1">✓</span>}
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </SectionCard>

                {/* Pomodoro */}
                <SectionCard title="Pomodoro Timer" sub="Default durations used in the Study Timer">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Focus Duration" hint="Minutes of focused work">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPomodoroWork(Math.max(5, pomodoroWork - 5))} className="w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold transition-all flex-shrink-0">−</button>
                        <div className={`${inputCls} text-center font-bold flex items-center justify-center`}>{pomodoroWork} min</div>
                        <button onClick={() => setPomodoroWork(Math.min(90, pomodoroWork + 5))} className="w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold transition-all flex-shrink-0">+</button>
                      </div>
                    </Field>
                    <Field label="Break Duration" hint="Minutes of rest between sessions">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPomodoroBreak(Math.max(1, pomodoroBreak - 1))} className="w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold transition-all flex-shrink-0">−</button>
                        <div className={`${inputCls} text-center font-bold flex items-center justify-center`}>{pomodoroBreak} min</div>
                        <button onClick={() => setPomodoroBreak(Math.min(30, pomodoroBreak + 1))} className="w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold transition-all flex-shrink-0">+</button>
                      </div>
                    </Field>
                  </div>
                </SectionCard>

                {/* AI toggles */}
                <SectionCard title="AI Behaviour" sub="Control how the AI manages your schedule">
                  <div className="flex flex-col gap-5">
                    {[
                      { label: "AI auto-scheduling",  sub: "Let AI automatically assign tasks to your calendar based on deadlines and peak hours", value: aiSchedule, onChange: setAiSchedule },
                      { label: "Auto-start timer",    sub: "Automatically start the study timer when a scheduled session begins",                  value: autoTimer,  onChange: setAutoTimer  },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                        </div>
                        <Toggle value={item.value} onChange={item.onChange} />
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveStudy}
                    className="bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all shadow-sm shadow-teal-200"
                  >
                    Save Preferences
                  </button>
                </div>
              </>
            )}

            {/* ─── NOTIFICATIONS TAB ─── */}
            {activeTab === "notifications" && (
              <>
                <SectionCard title="Push Notifications" sub="Control which in-app alerts you receive">
                  <div className="flex flex-col gap-5">
                    {[
                      { label: "Deadline reminders",    sub: "Get reminded before tasks are due",                           value: notifDeadline, onChange: setNotifDeadline },
                      { label: "Session reminders",     sub: "Notified when a scheduled study session is about to start",   value: notifSession,  onChange: setNotifSession  },
                      { label: "AI suggestions",        sub: "Get notified when the AI updates your schedule or adds tips",  value: notifAI,       onChange: setNotifAI       },
                      { label: "Study streak alerts",   sub: "Celebrate milestones and warn if your streak is at risk",     value: notifStreak,   onChange: setNotifStreak   },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                        </div>
                        <Toggle value={item.value} onChange={item.onChange} />
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Email Notifications" sub="Delivered to your registered email address">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Weekly progress summary</p>
                      <p className="text-xs text-gray-400 mt-0.5">Receive a weekly email with your study analytics and AI insights</p>
                    </div>
                    <Toggle value={notifEmail} onChange={setNotifEmail} />
                  </div>

                  <Field label="Deadline Reminder Lead Time" hint="How far in advance to send the reminder">
                    <div className="relative">
                      <select value={deadlineHours} onChange={(e) => setDeadlineHours(e.target.value)} className={selectCls}>
                        <option value="1">1 hour before</option>
                        <option value="3">3 hours before</option>
                        <option value="6">6 hours before</option>
                        <option value="12">12 hours before</option>
                        <option value="24">24 hours before</option>
                        <option value="48">2 days before</option>
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▾</span>
                    </div>
                  </Field>
                </SectionCard>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotifications}
                    className="bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all shadow-sm shadow-teal-200"
                  >
                    Save Notifications
                  </button>
                </div>
              </>
            )}

            {/* ─── ACCOUNT TAB ─── */}
            {activeTab === "account" && (
              <>
                {/* Session info */}
                <SectionCard title="Account Info" sub="User · firebase_uid, created_at">
                  <div className="flex flex-col gap-3">
                    {[
                      { label: "Account created",  value: "January 15, 2025" },
                      { label: "Firebase UID",     value: "uid_••••••••••••" },
                      { label: "Auth provider",    value: "Email / Password" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <span className="text-sm text-gray-500">{row.label}</span>
                        <span className="text-sm font-semibold text-gray-800">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                {/* Change password */}
                <SectionCard title="Password" sub="Sends a reset link to your email via Firebase">
                  <p className="text-sm text-gray-500 mb-5">
                    For security, we send a password reset link to <span className="font-semibold text-gray-800">{email}</span> rather than changing it here directly.
                  </p>
                  <button
                    onClick={handleChangePassword}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 active:scale-95 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all"
                  >
                    <span>🔑</span>
                    Send Password Reset Email
                  </button>
                </SectionCard>

                {/* Data export */}
                <SectionCard title="Export Your Data" sub="Download all your tasks, sessions, and analytics as JSON">
                  <p className="text-sm text-gray-500 mb-5">
                    Exports all data linked to your account from the Task, StudySession, and AISuggestion tables.
                  </p>
                  <button
                    onClick={() => toast.success("Export started — we'll email you a link shortly")}
                    className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 active:scale-95 text-gray-700 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all"
                  >
                    <span>📦</span>
                    Export Data
                  </button>
                </SectionCard>

                {/* Danger zone */}
                <div className="bg-red-50 rounded-3xl border border-red-100 p-7">
                  <div className="mb-5">
                    <h3 className="font-bold text-red-700 text-base">Danger Zone</h3>
                    <p className="text-xs text-red-400 mt-0.5">Irreversible actions — proceed with caution</p>
                  </div>

                  {!showDeleteConfirm ? (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-red-700">Delete account</p>
                        <p className="text-xs text-red-400 mt-0.5">
                          Permanently deletes your account, all tasks, sessions, and AI suggestions. Cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex-shrink-0 bg-red-600 hover:bg-red-700 active:scale-95 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-red-700 font-medium">
                        Type <span className="font-bold bg-red-100 px-1.5 py-0.5 rounded-lg">DELETE</span> to confirm account deletion:
                      </p>
                      <input
                        type="text"
                        value={deleteInput}
                        onChange={(e) => setDeleteInput(e.target.value)}
                        placeholder="Type DELETE"
                        className="h-11 w-full border border-red-200 rounded-2xl px-4 text-sm text-red-900 placeholder:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                          className="flex-1 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteInput !== "DELETE"}
                          className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all"
                        >
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}