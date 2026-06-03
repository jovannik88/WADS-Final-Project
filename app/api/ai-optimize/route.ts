import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession, unauthorized, serverError } from "@/lib/api-helpers";
import { getOrGenerateAiSuggestions, hourToDate } from "@/lib/ai-cache";
import { Status, EventType } from "@prisma/client";
import type { ScheduleBlock } from "@/lib/ai-engine";

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const dayStart = new Date(today); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(today); dayEnd.setHours(23, 59, 59, 999);

    const [tasks, sessions, settings, todayEvents] = await Promise.all([
      prisma.task.findMany({ where: { userId: user.uid, status: { not: Status.COMPLETED } } }),
      prisma.studySession.findMany({ where: { userId: user.uid, startedAt: { gte: thirtyDaysAgo } } }),
      prisma.userSettings.upsert({
        where: { userId: user.uid },
        update: {},
        create: { userId: user.uid, updatedAt: new Date() },
      }),
      // Fetch today's non-AI calendar events to use as blocked time ranges
      prisma.event.findMany({
        where: {
          userId: user.uid,
          startTime: { gte: dayStart, lte: dayEnd },
          aiGenerated: false,              // only user-created events block the schedule
          eventType: { not: EventType.STUDY_BLOCK },
        },
        select: { startTime: true, endTime: true, title: true },
      }),
    ]);

    const { prioritization, schedule, fromCache } = await getOrGenerateAiSuggestions(
      user.uid, tasks, sessions, settings, todayEvents
    );

    // Always persist AI scores to tasks when priorities changed
    if (!fromCache) {
      await Promise.all(
        prioritization.prioritized.map((p) =>
          prisma.task.update({
            where: { id: p.taskId },
            data: { aiScore: p.aiScore, aiReason: p.aiReason },
          })
        )
      );
    }

    // Always save the freshly-computed schedule to calendar
    // (Schedule is always recalculated so it always reflects current time)
    await prisma.event.deleteMany({
      where: {
        userId: user.uid,
        eventType: EventType.STUDY_BLOCK,
        aiGenerated: true,
        startTime: { gte: dayStart, lte: dayEnd },
      },
    });

    const focusBlocks = schedule.blocks.filter((b: ScheduleBlock) => b.blockType === "focus");
    if (focusBlocks.length > 0) {
      await prisma.event.createMany({
        data: focusBlocks.map((b: ScheduleBlock) => ({
          userId: user.uid,
          title: b.taskTitle,
          description: b.reason,
          startTime: hourToDate(today, b.startHour),
          endTime: hourToDate(today, b.endHour),
          eventType: EventType.STUDY_BLOCK,
          color: "#14b8a6",
          aiGenerated: true,
        })),
      });
    }

    return NextResponse.json({ prioritization, schedule, fromCache }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}