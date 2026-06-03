// AI cache helper: prioritization is cached by task hash, schedule is always recalculated fresh.

import { prisma } from "@/lib/prisma";
import { prioritizeTasks, optimizeSchedule, computeTaskHash } from "@/lib/ai-engine";
import type { Task, StudySession, UserSettings } from "@prisma/client";
import type { PrioritizationResult, ScheduleResult, ScheduleEvent } from "@/lib/ai-engine";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AiResult {
  prioritization: PrioritizationResult;
  schedule: ScheduleResult;
  fromCache: boolean;
}

export async function getOrGenerateAiSuggestions(
  userId: string,
  tasks: Task[],
  sessions: StudySession[],
  settings: UserSettings,
  existingEvents: ScheduleEvent[] = []
): Promise<AiResult> {
  const taskHash = computeTaskHash(tasks);
  const now = new Date();

  // Check DB cache for prioritization
  let prioritization: PrioritizationResult;
  let fromCache = false;

  const cached = await prisma.aiCache.findUnique({ where: { userId } });
  if (cached && cached.taskHash === taskHash && cached.expiresAt > now) {
    prioritization = cached.prioritization as unknown as PrioritizationResult;
    fromCache = true;
  } else {
    prioritization = prioritizeTasks(tasks);
    const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);

    await prisma.aiCache.upsert({
      where: { userId },
      update: {
        taskHash,
        prioritization: prioritization as object,
        // Keep schedule field non-null (required by schema) with a placeholder
        schedule: {} as object,
        generatedAt: now,
        expiresAt,
      },
      create: {
        userId,
        taskHash,
        prioritization: prioritization as object,
        schedule: {} as object,
        generatedAt: now,
        expiresAt,
      },
    });
  }

  // Schedule recalculated fresh with current time and calendar events
  const schedule = optimizeSchedule(tasks, sessions, settings, now, existingEvents);

  return { prioritization, schedule, fromCache };
}

// Converts a fractional hour (e.g. 18.5) to a Date on a given calendar date
export function hourToDate(baseDate: Date, fractionalHour: number): Date {
  const d = new Date(baseDate);
  d.setHours(Math.floor(fractionalHour), Math.round((fractionalHour % 1) * 60), 0, 0);
  return d;
}
