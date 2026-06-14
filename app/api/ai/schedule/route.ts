import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession, unauthorized, serverError } from "@/lib/api-helpers";
import { getOrGenerateAiSuggestions, hourToDate } from "@/lib/ai-cache";
import { optimizeSchedule } from "@/lib/ai-engine";
import { Status, EventType } from "@prisma/client";
import type { ScheduleBlock } from "@/lib/ai-engine";

// GET: read current AI schedule from DB without regenerating
export async function GET(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayStart = new Date(today); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(today); dayEnd.setHours(23, 59, 59, 999);
    const tmrStart = new Date(tomorrow); tmrStart.setHours(0, 0, 0, 0);
    const tmrEnd   = new Date(tomorrow); tmrEnd.setHours(23, 59, 59, 999);

    // Fetch today's AI blocks first, fall back to tomorrow if none
    let aiEvents = await prisma.event.findMany({
      where: { userId: user.uid, aiGenerated: true, eventType: EventType.STUDY_BLOCK, startTime: { gte: dayStart, lte: dayEnd } },
      orderBy: { startTime: "asc" },
    });
    const forTomorrow = aiEvents.length === 0;
    if (forTomorrow) {
      aiEvents = await prisma.event.findMany({
        where: { userId: user.uid, aiGenerated: true, eventType: EventType.STUDY_BLOCK, startTime: { gte: tmrStart, lte: tmrEnd } },
        orderBy: { startTime: "asc" },
      });
    }

    // Convert DB events → ScheduleBlock format for the frontend.
    // startISO/endISO are raw UTC strings so the browser can format
    // them in the user's local timezone via toLocaleTimeString().
    const blocks: ScheduleBlock[] = aiEvents.map(ev => {
      const start = new Date(ev.startTime);
      const end   = new Date(ev.endTime);
      const startHour = start.getUTCHours() + start.getUTCMinutes() / 60;
      const endHour   = end.getUTCHours()   + end.getUTCMinutes()   / 60;
      return {
        startHour,
        endHour,
        startISO: ev.startTime.toISOString(),
        endISO:   ev.endTime.toISOString(),
        taskTitle: ev.title,
        subject: null,
        blockType: "focus" as const,
        durationMin: Math.round((end.getTime() - start.getTime()) / 60000),
        taskId: ev.taskId ?? null,
        reason: ev.description ?? "",
      };
    });

    const totalStudyMin = blocks.reduce((s, b) => s + b.durationMin, 0);
    return NextResponse.json({
      blocks,
      totalStudyMin,
      forTomorrow,
      summary: blocks.length === 0 ? "No AI study blocks scheduled." : `${blocks.length} study block${blocks.length > 1 ? "s" : ""} · ${totalStudyMin} min total`,
    }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayStart = new Date(today); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(today); dayEnd.setHours(23, 59, 59, 999);
    const tmrStart = new Date(tomorrow); tmrStart.setHours(0, 0, 0, 0);
    const tmrEnd   = new Date(tomorrow); tmrEnd.setHours(23, 59, 59, 999);

    const [tasks, sessions, settings, todayEvents, tomorrowEvents] = await Promise.all([
      prisma.task.findMany({ where: { userId: user.uid, status: { not: Status.COMPLETED } } }),
      prisma.studySession.findMany({ where: { userId: user.uid, startedAt: { gte: thirtyDaysAgo } } }),
      prisma.userSettings.upsert({
        where: { userId: user.uid },
        update: {},
        create: { userId: user.uid, updatedAt: new Date() },
      }),
      prisma.event.findMany({
        where: { userId: user.uid, startTime: { gte: dayStart, lte: dayEnd }, aiGenerated: false },
        select: { startTime: true, endTime: true, title: true },
      }),
      prisma.event.findMany({
        where: { userId: user.uid, startTime: { gte: tmrStart, lte: tmrEnd }, aiGenerated: false },
        select: { startTime: true, endTime: true, title: true },
      }),
    ]);

    const { schedule: todaySchedule } = await getOrGenerateAiSuggestions(
      user.uid, tasks, sessions, settings, todayEvents
    );

    // If today is past preferred hours, fall back to tomorrow's schedule
    const useTomorrow = todaySchedule.blocks.length === 0;
    const targetDate  = useTomorrow ? tomorrow : today;
    const schedule    = useTomorrow
      ? optimizeSchedule(tasks, sessions, settings, tomorrow, tomorrowEvents)
      : todaySchedule;
    const targetStart = useTomorrow ? tmrStart : dayStart;
    const targetEnd   = useTomorrow ? tmrEnd   : dayEnd;

    // Delete ALL future AI study blocks so stale blocks from previous runs are cleaned up
    await prisma.event.deleteMany({
      where: {
        userId: user.uid,
        eventType: EventType.STUDY_BLOCK,
        aiGenerated: true,
        startTime: { gte: dayStart },
      },
    });

    const focusBlocks = schedule.blocks.filter((b: ScheduleBlock) => b.blockType === "focus");
    if (focusBlocks.length > 0) {
      await prisma.event.createMany({
        data: focusBlocks.map((b: ScheduleBlock) => ({
          userId: user.uid,
          title: b.taskTitle,
          description: b.reason,
          startTime: hourToDate(targetDate, b.startHour),
          endTime:   hourToDate(targetDate, b.endHour),
          eventType: EventType.STUDY_BLOCK,
          color: "#14b8a6",
          aiGenerated: true,
          taskId: b.taskId ?? null,
        })),
      });

      const schedDateKey = targetDate.toISOString().slice(0, 10); // e.g. "2026-06-15"
      const schedMarker = `[SCHED-${schedDateKey}]`;

      const existingSchedNotif = await prisma.notification.findFirst({
        where: {
          userId: user.uid,
          body: { contains: schedMarker },
        },
      });

      if (!existingSchedNotif) {
        await prisma.notification.create({
          data: {
            userId: user.uid,
            title: useTomorrow ? "Tomorrow's Study Schedule Ready" : "Today's Study Schedule Ready",
            body: `${schedule.summary} ${schedMarker}`,
            type: "AI_ALERT",
          },
        });
      }
    }

    return NextResponse.json({ ...schedule, forTomorrow: useTomorrow }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}
