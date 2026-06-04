import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifySession,
  unauthorized,
  serverError,
} from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession(req);

    if (!user) {
      return unauthorized();
    }

    const now = new Date();

    const fifteenMinutesLater = new Date(
      now.getTime() + 15 * 60 * 1000
    );

    const upcomingEvents = await prisma.event.findMany({
      where: {
        userId: user.uid,
        eventType: "STUDY_BLOCK",
        startTime: {
          gte: now,
          lte: fifteenMinutesLater,
        },
      },
    });

    let created = 0;

    for (const event of upcomingEvents) {
      const marker = `[EVENT-${event.id}]`;

      const existing = await prisma.notification.findFirst({
        where: {
          userId: user.uid,
          body: {
            contains: marker,
          },
        },
      });

      if (existing) {
        continue;
      }

      await prisma.notification.create({
        data: {
          userId: user.uid,
          title: "Study Session Reminder",
          body: `${event.title} starts in less than 15 minutes. ${marker}`,
          type: "REMINDER",
        },
      });

      created++;
    }

    return NextResponse.json({
      success: true,
      created,
    });
  } catch (err) {
    return serverError(err);
  }
}