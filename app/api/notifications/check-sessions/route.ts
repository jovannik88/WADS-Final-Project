// POST /api/notifications/check-sessions
// Called by the client every ~5 minutes to fire "starting soon" / "missed session" notifications.
// Uses a dedup key stored in the notification body to avoid duplicates.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession, unauthorized, serverError } from "@/lib/api-helpers";
import { createNotification } from "@/lib/notify";

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    // Fetch all AI-generated events for today
    const aiEvents = await prisma.event.findMany({
      where: { userId: user.uid, aiGenerated: true, startTime: { gte: todayStart, lte: todayEnd } },
      orderBy: { startTime: "asc" },
    });

    // Fetch today's notification titles to deduplicate
    const existingToday = await prisma.notification.findMany({
      where: { userId: user.uid, createdAt: { gte: todayStart } },
      select: { title: true, body: true },
    });
    const existingBodies = new Set(existingToday.map(n => n.body));

    let created = 0;

    for (const ev of aiEvents) {
      const start = new Date(ev.startTime);
      const end   = new Date(ev.endTime);
      const msUntilStart = start.getTime() - now.getTime();
      const msAfterEnd   = now.getTime() - end.getTime();

      // "Starting in ~10 minutes" — fire between 12 and 8 minutes before
      if (msUntilStart > 0 && msUntilStart <= 12 * 60 * 1000 && msUntilStart >= 8 * 60 * 1000) {
        const dedup = `starts-soon:${ev.id}`;
        if (!existingBodies.has(dedup)) {
          await createNotification(
            user.uid,
            "Session starting soon",
            `Your AI study session "${ev.title}" starts in about 10 minutes. Head to the timer to be ready. [${dedup}]`,
            "REMINDER"
          );
          created++;
        }
      }

      // "Starting now" — within first 2 minutes of session window
      if (msUntilStart <= 0 && msUntilStart >= -2 * 60 * 1000) {
        const dedup = `starts-now:${ev.id}`;
        if (!existingBodies.has(dedup)) {
          await createNotification(
            user.uid,
            "Session starting now ▶",
            `"${ev.title}" is starting now! Open the Study Timer to begin your session. [${dedup}]`,
            "REMINDER"
          );
          created++;
        }
      }

      // "Missed session" — 15+ minutes after session ended and no study session recorded for that event time
      if (msAfterEnd >= 15 * 60 * 1000) {
        const dedup = `missed:${ev.id}`;
        if (!existingBodies.has(dedup)) {
          // Check if a session was actually logged during this window
          const logged = await prisma.studySession.findFirst({
            where: {
              userId: user.uid,
              startedAt: { gte: new Date(start.getTime() - 30 * 60 * 1000) },
              endedAt:   { lte: new Date(end.getTime()   + 30 * 60 * 1000) },
            },
          });
          if (!logged) {
            await createNotification(
              user.uid,
              "Missed session",
              `You missed your scheduled session "${ev.title}" at ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. The AI may reschedule it next time you complete a session. [${dedup}]`,
              "AI_ALERT"
            );
            created++;
          }
        }
      }
    }

    // Deadline check: tasks due within 24 hours
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const urgentTasks = await prisma.task.findMany({
      where: { userId: user.uid, dueDate: { gte: now, lte: in24h }, status: { not: "COMPLETED" } },
    });
    for (const t of urgentTasks) {
      const dedup = `deadline-24h:${t.id}`;
      if (!existingBodies.has(dedup)) {
        const due = t.dueDate!;
        await createNotification(
          user.uid,
          `Deadline in 24h: ${t.title}`,
          `"${t.title}" is due ${due.toLocaleString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit" })}. Make sure to complete it in time. [${dedup}]`,
          "DEADLINE"
        );
        created++;
      }
    }

    return NextResponse.json({ checked: aiEvents.length, created });
  } catch (err) {
    return serverError(err);
  }
}
