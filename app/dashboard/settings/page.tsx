"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendPasswordResetEmail, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

// Types


interface UserSettings {
  preferredStartHour: number;
  preferredEndHour: number;
  pomodoroMins: number;
  shortBreakMins: number;
  timezone: string;
}

// Constants

const TIMEZONES = [
  "Asia/Jakarta", "Asia/Singapore", "Asia/Tokyo",
  "America/New_York", "America/Los_Angeles", "Europe/London", "UTC",
];




type Tab = "profile" | "study" | "notifications" | "account";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "profile",       label: "Profile",       icon: "👤" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "account",       label: "Account",       icon: "⚙️"  },
];

// Shared UI components

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

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />;
}

const inputCls = "h-11 w-full border border-gray-200 rounded-2xl px-4 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all";
const selectCls = "h-11 w-full border border-gray-200 rounded-2xl px-4 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all appearance-none";

// API helpers

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// Main component

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [loadingInit, setLoadingInit] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Profile state
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");

  // Study prefs state
  const [peakStart,     setPeakStart]     = useState("19:00");
  const [peakEnd,       setPeakEnd]       = useState("21:00");
  const [weeklyGoal,    setWeeklyGoal]    = useState(20);
  const [pomodoroWork,  setPomodoroWork]  = useState(25);
  const [pomodoroBreak, setPomodoroBreak] = useState(5);
  const [aiSchedule,    setAiSchedule]    = useState(true);
  const [autoTimer,     setAutoTimer]     = useState(false);
  void weeklyGoal; void setWeeklyGoal; void aiSchedule; void setAiSchedule; void autoTimer; void setAutoTimer;

  // Notification state
  const [notifDeadline, setNotifDeadline] = useState(true);
  const [notifSession,  setNotifSession]  = useState(true);
  const [notifAI,       setNotifAI]       = useState(true);
  const [notifStreak,   setNotifStreak]   = useState(false);

  const [deadlineHours, setDeadlineHours] = useState("24");

  // Account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput,       setDeleteInput]       = useState("");
const [accountMeta, setAccountMeta] = useState({
  createdAt: "",
  accountStatus: "Active",
  authProvider: "Email / Password",
});

  // Fetch all data on mount

  const loadData = useCallback(async () => {
    
    setLoadingInit(true);
    try {
      const notifRes = await apiFetch<{
      deadlineReminders: boolean;
      sessionReminders: boolean;
      aiSuggestions: boolean;
      streakAlerts: boolean;

      deadlineLeadHours: number;
    }>("/api/user/notifications");

      setNotifDeadline(notifRes.deadlineReminders);
      setNotifSession(notifRes.sessionReminders);
      setNotifAI(notifRes.aiSuggestions);
      setNotifStreak(notifRes.streakAlerts);

setDeadlineHours(String(notifRes.deadlineLeadHours));
      // Fetch profile + settings in parallel
      const [profileRes, settingsRes] = await Promise.all([
        apiFetch<{ user: { name: string; email: string; timezone: string; createdAt: string; firebaseUid: string } }>("/api/user/profile"),
        apiFetch<{ settings: UserSettings }>("/api/settings"),
      ]);

      // Populate profile fields
      const u = profileRes.user;
      setName(u.name ?? "");
      setEmail(u.email ?? "");

setAccountMeta({
  createdAt: u.createdAt
    ? new Date(u.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—",
  accountStatus: "Active",
  authProvider: "Email / Password",
});

      // Populate settings fields
const s = settingsRes?.settings;

if (s) {
  setPeakStart(`${String(s.preferredStartHour ?? 7).padStart(2, "0")}:00`);
  setPeakEnd(`${String(s.preferredEndHour ?? 23).padStart(2, "0")}:00`);

  setPomodoroWork(s.pomodoroMins ?? 25);
  setPomodoroBreak(s.shortBreakMins ?? 5);


}
    } catch (err) {
      toast.error("Failed to load settings — please refresh");
      console.error(err);
    } finally {
      setLoadingInit(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Save handlers

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify({ name, email }),
      });
      toast.success("Profile updated successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSaveStudy = async () => {
    const [startHour] = peakStart.split(":").map(Number);
    const [endHour]   = peakEnd.split(":").map(Number);

    if (endHour <= startHour) {
      toast.error("End time must be after start time");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          preferredStartHour: startHour,
          preferredEndHour: endHour,
          pomodoroMins: pomodoroWork,
          shortBreakMins: pomodoroBreak,
          timezone,
        }),
      });
      toast.success("Study preferences saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

const handleSaveNotifications = async () => {
  setSaving(true);

  try {
    await apiFetch("/api/user/notifications", {
      method: "PUT",
      body: JSON.stringify({
        deadlineReminders: notifDeadline,
        sessionReminders: notifSession,
        aiSuggestions: notifAI,
        streakAlerts: notifStreak,

        deadlineLeadHours: Number(deadlineHours),
      }),
    });

    toast.success("Notification settings saved");

    // reload from database
    await loadData();
  } catch (err: unknown) {
    toast.error(
      err instanceof Error
        ? err.message
        : "Failed to save notifications"
    );
  } finally {
    setSaving(false);
  }
};
const handleChangePassword = async () => {
  console.log("BUTTON CLICKED");
  console.log("EMAIL:", email);

  setSaving(true);

  try {
    await sendPasswordResetEmail(auth, email);

    console.log("EMAIL SENT");
    toast.success(`Password reset email sent to ${email}`);
  } catch (err) {
    console.error("RESET ERROR:", err);
    toast.error("Failed");
  } finally {
    setSaving(false);
  }
};

const handleExportData = async () => {
  try {
    const response = await fetch("/api/export");

    if (!response.ok) {
      throw new Error("Export failed");
    }

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = `studyflow-data-${Date.now()}.json`;

    document.body.appendChild(a);

    a.click();

    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert("Failed to export data");
  }
};

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/user", { method: "DELETE" });
      toast.success("Account deleted");
      await signOut(auth);
      router.push("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Account deletion failed");
    } finally {
      setSaving(false);
    }
  };


  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const SaveButton = ({ onClick, label = "Save" }: { onClick: () => void; label?: string }) => (
    <button
      onClick={onClick}
      disabled={saving || loadingInit}
      className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-white px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all shadow-sm shadow-teal-200 flex items-center gap-2"
    >
      {saving && (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {label}
    </button>
  );

  // Loading skeleton

  if (loadingInit) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-7">
          <div>
            <Skeleton className="h-10 w-40 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-6">
            <Skeleton className="w-56 h-48 flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-5">
              <Skeleton className="h-64" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-7">

        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-gray-400 mt-1.5 text-sm">Manage your profile, study preferences, and account</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:items-start">

          {/* Sidebar */}
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
                  <span className="text-sm">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 flex flex-col gap-5 min-w-0">

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <SectionCard title="Your Profile" sub="Name, email address, and timezone">
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


                </div>

                <div className="mt-7 flex justify-end">
                  <SaveButton onClick={handleSaveProfile} label="Save Profile" />
                </div>
              </SectionCard>
            )}


            {/* NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <>
                <SectionCard title="Push Notifications" sub="Control which in-app alerts you receive">
                  <div className="flex flex-col gap-5">
                    {[
                      { label: "Deadline reminders",  sub: "Get reminded before tasks are due",                          value: notifDeadline, onChange: setNotifDeadline },
                      { label: "Session reminders",   sub: "Notified when a scheduled study session is about to start",  value: notifSession,  onChange: setNotifSession  },
                      { label: "Study streak alerts", sub: "Celebrate milestones and warn if your streak is at risk",    value: notifStreak,   onChange: setNotifStreak   },
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
                  <SaveButton onClick={handleSaveNotifications} label="Save Notifications" />
                </div>
              </>
            )}

            {/* ACCOUNT TAB */}
            {activeTab === "account" && (
              <>
                <SectionCard title="Account Info" sub="Read-only metadata from your Firebase account">
                  <div className="flex flex-col gap-3">
{[
  { label: "Account created", value: accountMeta.createdAt },
  { label: "Account Status", value: accountMeta.accountStatus },
  { label: "Auth provider", value: accountMeta.authProvider },
].map((row) => (
  <div
    key={row.label}
    className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
  >
    <span className="text-sm text-gray-500">{row.label}</span>

    <span
      className={`text-sm font-semibold ${
        row.label === "Account Status"
          ? "text-green-600"
          : "text-gray-800"
      }`}
    >
      {row.label === "Account Status"
        ? `✓ ${row.value}`
        : row.value}
    </span>
  </div>
))}
                  </div>
                </SectionCard>

                <SectionCard title="Password" sub="Sends a reset link to your email via Firebase">
                  <p className="text-sm text-gray-500 mb-5">
                    For security, we send a password reset link to{" "}
                    <span className="font-semibold text-gray-800">{email}</span> rather than changing it here directly.
                  </p>
                  <button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 active:scale-95 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all"
                  >
                    <span>🔑</span>
                    Send Password Reset Email
                  </button>
                </SectionCard>

                <SectionCard title="Export Your Data" sub="Download all your tasks, sessions, and analytics as JSON">
                  <p className="text-sm text-gray-500 mb-5">
                    Exports all data linked to your account from the Task, StudySession, and AISuggestion tables.
                  </p>
                  <Button onClick={handleExportData}>
                    <span>📦</span>
                    Export Data
                  </Button>
                </SectionCard>
 
  
                {/* Danger Zone */}
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
                        Type{" "}
                        <span className="font-bold bg-red-100 px-1.5 py-0.5 rounded-lg">DELETE</span>{" "}
                        to confirm account deletion:
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
                          disabled={deleteInput !== "DELETE" || saving}
                          className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                        >
                          {saving && (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          )}
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