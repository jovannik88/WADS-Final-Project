// Deterministic AI engine for task prioritization and study schedule optimization.

import crypto from "crypto";
import type { Task, StudySession, UserSettings } from "@prisma/client";

// Simplified calendar event shape passed into the schedule optimizer
export interface ScheduleEvent {
  startTime: Date;
  endTime: Date;
  title: string;
}

// SHA-256 fingerprint of pending task state for cache invalidation.
export function computeTaskHash(tasks: Pick<Task, "id" | "priority" | "status" | "dueDate" | "estimatedMins" | "title">[]): string {
  const pending = tasks
    .filter((t) => t.status !== "COMPLETED")
    .sort((a, b) => a.id - b.id);
  const str = pending
    .map((t) =>
      [t.id, t.priority, t.dueDate?.toISOString() ?? "", t.estimatedMins ?? "", t.title].join(":")
    )
    .join("|");
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 24);
}


// Types

export interface PrioritizedTask {
  taskId: number;
  title: string;
  subject: string | null;
  aiScore: number;
  aiReason: string;
  suggestedOrder: number;
}

export interface ScheduleBlock {
  startHour: number;
  endHour: number;
  taskId: number | null;
  taskTitle: string;
  subject: string | null;
  durationMin: number;
  blockType: "focus" | "break" | "buffer";
  reason: string;
}

export interface PrioritizationResult {
  prioritized: PrioritizedTask[];
  summary: string;
  generatedAt: string;
}

export interface ScheduleResult {
  blocks: ScheduleBlock[];
  totalStudyMin: number;
  peakWindow: string;
  summary: string;
  generatedAt: string;
}

// Prioritization

export function computePriorityScore(
  task: Pick<Task, "priority" | "dueDate" | "estimatedMins" | "status">,
  nowMs = Date.now()
): number {
  let score = 0;

  // Priority weight (40 pts max)
  const priorityWeight = { HIGH: 40, MEDIUM: 20, LOW: 5 };
  score += priorityWeight[task.priority] ?? 20;

  // Deadline urgency: exponential decay as deadline approaches (40 pts max)
  if (task.dueDate) {
    const hoursLeft = (task.dueDate.getTime() - nowMs) / 3_600_000;
    if (hoursLeft <= 0) {
      score += 40; // overdue
    } else if (hoursLeft <= 24) {
      score += 35;
    } else if (hoursLeft <= 48) {
      score += 25;
    } else if (hoursLeft <= 72) {
      score += 15;
    } else if (hoursLeft <= 168) {
      score += 8;
    } else {
      score += 2;
    }
  } else {
    score += 5; // no deadline is low urgency
  }

  // Effort penalty: long tasks slightly lower score so quick wins rank higher
  if (task.estimatedMins) {
    if (task.estimatedMins > 180) score -= 5;
    else if (task.estimatedMins < 30) score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function buildPriorityReason(
  task: Pick<Task, "priority" | "dueDate" | "estimatedMins">,
  score: number
): string {
  const parts: string[] = [];

  if (task.priority === "HIGH") parts.push("high priority");
  else if (task.priority === "LOW") parts.push("low priority");

  if (task.dueDate) {
    const hoursLeft = (task.dueDate.getTime() - Date.now()) / 3_600_000;
    if (hoursLeft <= 0) parts.push("overdue");
    else if (hoursLeft <= 24) parts.push("due within 24 hours");
    else if (hoursLeft <= 48) parts.push("due in 2 days");
    else if (hoursLeft <= 168) parts.push("due this week");
  } else {
    parts.push("no deadline set");
  }

  if (task.estimatedMins && task.estimatedMins > 180) parts.push("long estimated effort");
  if (task.estimatedMins && task.estimatedMins < 30) parts.push("quick win");

  return parts.length > 0 ? parts.join(", ") : `AI urgency score ${score.toFixed(0)}`;
}

export function prioritizeTasks(tasks: Task[]): PrioritizationResult {
  const pending = tasks.filter((t) => t.status !== "COMPLETED");

  const scored = pending.map((t) => {
    const score = computePriorityScore(t);
    return {
      taskId: t.id,
      title: t.title,
      subject: t.subject,
      aiScore: score,
      aiReason: buildPriorityReason(t, score),
    };
  });

  scored.sort((a, b) => b.aiScore - a.aiScore);
  const prioritized: PrioritizedTask[] = scored.map((t, i) => ({
    ...t,
    suggestedOrder: i + 1,
  }));

  const topTask = prioritized[0];
  const summary =
    prioritized.length === 0
      ? "No pending tasks to prioritize."
      : `Start with "${topTask?.title}" (score ${topTask?.aiScore.toFixed(0)}/100). ${topTask?.aiReason}.`;

  return { prioritized, summary, generatedAt: new Date().toISOString() };
}

// Schedule Optimization

function detectPeakHour(sessions: StudySession[]): number {
  // Count session start-hours weighted by duration and focus score
  const hourWeight: Record<number, number> = {};
  sessions.forEach((s) => {
    const h = s.startedAt.getHours();
    const weight = s.durationMin * (s.focusScore ?? 70);
    hourWeight[h] = (hourWeight[h] ?? 0) + weight;
  });
  const best = Object.entries(hourWeight).sort(([, a], [, b]) => b - a)[0];
  return best ? parseInt(best[0], 10) : 19; // default 7 PM
}

export function optimizeSchedule(
  tasks: Task[],
  sessions: StudySession[],
  settings: UserSettings,
  targetDate: Date = new Date(),
  existingEvents: ScheduleEvent[] = []
): ScheduleResult {
  const now = new Date();
  const isToday = targetDate.toDateString() === now.toDateString();

  const pending = tasks
    .filter((t) => t.status !== "COMPLETED")
    .sort((a, b) => computePriorityScore(b) - computePriorityScore(a));

  const peakHour  = detectPeakHour(sessions);
  const peakLabel = `${peakHour}:00 \u2013 ${Math.min(peakHour + 2, 23)}:00`;
  const pomodoroMins     = settings.pomodoroMins;
  const shortBreak       = settings.shortBreakMins;
  const longBreak        = settings.longBreakMins;
  const preferredEndMins = settings.preferredEndHour * 60;
  const preferredStartMins = settings.preferredStartHour * 60;

  // Only skip a block if its END time has already passed (not just the start time).
  // This means a session that started 20 min ago but ends in 40 min still appears.
  // We use preferredStartMins as the floor; on future dates start from preferredStartMins.
  const nowMins   = now.getHours() * 60 + now.getMinutes();
  const startMins = isToday ? Math.max(preferredStartMins, nowMins) : preferredStartMins;

  // If already past the preferred end time, return a rest message.
  if (startMins >= preferredEndMins) {
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return {
      blocks: [],
      totalStudyMin: 0,
      peakWindow: peakLabel,
      summary: isToday
        ? `It is ${hh}:${mm} \u2014 past your preferred study hours (end: ${settings.preferredEndHour}:00). Rest well; a fresh schedule will be ready for you tomorrow.`
        : "No time available to schedule.",
      generatedAt: now.toISOString(),
    };
  }

  // Map events on targetDate to minute-range blocks used as no-go zones.
  const blockedRanges = existingEvents
    .filter((e) => new Date(e.startTime).toDateString() === targetDate.toDateString())
    .map((e) => ({
      start: new Date(e.startTime).getHours() * 60 + new Date(e.startTime).getMinutes(),
      end:   new Date(e.endTime).getHours()   * 60 + new Date(e.endTime).getMinutes(),
      title: e.title,
    }));

  // Find the first free slot at or after `from` that fits `duration` minutes.
  // A slot is blocked only if its END overlaps a blocked range's end (i.e. the event hasn't finished yet).
  const nextFree = (from: number, duration: number): number => {
    let cur = from;
    for (let guard = 0; guard < 200; guard++) {
      if (cur + duration > preferredEndMins) return -1;
      // Block only if the proposed slot end time overlaps with a range that hasn't ended yet
      const blocker = blockedRanges.find((r) => cur < r.end && cur + duration > r.start);
      if (!blocker) return cur;
      // Jump past the blocker's end (it hasn't finished)
      cur = blocker.end + 5;
    }
    return -1;
  };

  const blocks: ScheduleBlock[] = [];
  let cursor       = startMins;
  let sessionCount = 0;

  for (const task of pending) {
    if (cursor >= preferredEndMins) break;

    const estimatedMins = task.estimatedMins ?? pomodoroMins;
    const duration      = Math.min(estimatedMins, pomodoroMins * 2, preferredEndMins - cursor);
    const slot          = nextFree(cursor, duration);
    if (slot === -1) break;

    // Show skipped event as a buffer block
    if (slot > cursor) {
      const skipped = blockedRanges.find((r) => cursor < r.end && r.start >= cursor);
      if (skipped) {
        blocks.push({
          startHour: cursor / 60, endHour: slot / 60,
          taskId: null, taskTitle: skipped.title, subject: null,
          durationMin: slot - cursor, blockType: "buffer",
          reason: `Calendar event: ${skipped.title}`,
        });
      }
    }

    blocks.push({
      startHour: slot / 60, endHour: (slot + duration) / 60,
      taskId: task.id, taskTitle: task.title, subject: task.subject,
      durationMin: duration, blockType: "focus",
      reason: `Scheduled based on AI priority score ${computePriorityScore(task).toFixed(0)}/100`,
    });

    cursor = slot + duration;
    sessionCount++;

    if (cursor < preferredEndMins) {
      const isLong  = sessionCount % 4 === 0;
      const brkMins = isLong ? longBreak : shortBreak;
      const brkSlot = nextFree(cursor, brkMins);
      if (brkSlot !== -1 && brkSlot + brkMins <= preferredEndMins) {
        blocks.push({
          startHour: brkSlot / 60, endHour: (brkSlot + brkMins) / 60,
          taskId: null, taskTitle: isLong ? "Long break" : "Short break", subject: null,
          durationMin: brkMins, blockType: "break",
          reason: isLong ? "Extended rest after 4 sessions" : "Short recovery break",
        });
        cursor = brkSlot + brkMins;
      }
    }
  }

  const totalStudyMin = blocks
    .filter((b) => b.blockType === "focus")
    .reduce((s, b) => s + b.durationMin, 0);

  const startLabel = `${Math.floor(startMins / 60)}:${String(startMins % 60).padStart(2, "0")}`;
  const endLabel   = `${settings.preferredEndHour}:00`;

  const summary =
    blocks.length === 0
      ? (pending.length === 0
          ? "No pending tasks to schedule."
          : "Your calendar is fully booked \u2014 no free study slots right now.")
      : `${sessionCount} study block${sessionCount > 1 ? "s" : ""} scheduled between ${startLabel} and ${endLabel} (${totalStudyMin} min total). Peak focus window: ${peakLabel}.`;

  return { blocks, totalStudyMin, peakWindow: peakLabel, summary, generatedAt: now.toISOString() };
}


