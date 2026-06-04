import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession, unauthorized } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = await verifySession(req);

  if (!user) {
    return unauthorized();
  }

  const [
    profile,
    tasks,
    events,
    sessions,
    notifications,
    settings,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.uid },
    }),

    prisma.task.findMany({
      where: { userId: user.uid },
    }),

    prisma.event.findMany({
      where: { userId: user.uid },
    }),

    prisma.studySession.findMany({
      where: { userId: user.uid },
    }),

    prisma.notification.findMany({
      where: { userId: user.uid },
    }),

    prisma.userSettings.findUnique({
      where: { userId: user.uid },
    }),
  ]);

  const exportData = {
    profile,
    tasks,
    events,
    sessions,
    notifications,
    settings,
    exportedAt: new Date().toISOString(),
  };

  return new NextResponse(
    JSON.stringify(exportData, null, 2),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition":
          `attachment; filename=studyflow-data-${Date.now()}.json`,
      },
    }
  );
}