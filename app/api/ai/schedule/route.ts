import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession, unauthorized, serverError } from "@/lib/api-helpers";
import { getOrGenerateAiSuggestions, hourToDate } from "@/lib/ai-cache";
import { optimizeSchedule } from "@/lib/ai-engine";
import { Status, EventType } from "@prisma/client";
import type { ScheduleBlock } from "@/lib/ai-engine";

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

    // Save schedule to calendar (always fresh)
    await prisma.event.deleteMany({
      where: {
        userId: user.uid,
        eventType: EventType.STUDY_BLOCK,
        aiGenerated: true,
        startTime: { gte: targetStart, lte: targetEnd },
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

      await prisma.notification.create({
        data: {
          userId: user.uid,
          title: useTomorrow ? "Tomorrow's Study Schedule Ready" : "Today's Study Schedule Ready",
          body: schedule.summary,
          type: "AI_ALERT",
        },
      });
    }

    return NextResponse.json({ ...schedule, forTomorrow: useTomorrow }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}
