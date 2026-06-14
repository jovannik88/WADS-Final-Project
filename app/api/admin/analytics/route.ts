import { NextRequest, NextResponse } from "next/server";
import { verifySession, unauthorized, serverError } from "@/lib/api-helpers";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await verifySession(req);
  if (!token || !isAdminEmail(token.email)) return unauthorized();

  try {
    const [
      totalUsers,
      totalTasks,
      completedTasks,
      totalSessions,
      studyMinutes,
      totalNotifications,
      aiGeneratedEvents,
      aiCacheEntries,
      tasksWithAiScore,
      aiAvgScore,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.task.count(),
      prisma.task.count({ where: { status: "COMPLETED" } }),
      prisma.studySession.count(),
      prisma.studySession.aggregate({ _sum: { durationMin: true } }),
      prisma.notification.count(),
      prisma.event.count({ where: { aiGenerated: true } }),
      prisma.aiCache.count(),
      prisma.task.count({ where: { aiScore: { not: null } } }),
      prisma.task.aggregate({ _avg: { aiScore: true }, where: { aiScore: { not: null } } }),
    ]);

    // Recent signups per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      totalUsers,
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalSessions,
      totalStudyHours: Math.round((studyMinutes._sum.durationMin ?? 0) / 60),
      totalNotifications,
      aiGeneratedEvents,
      aiCacheEntries,
      tasksWithAiScore,
      avgAiScore: aiAvgScore._avg.aiScore
        ? Math.round(aiAvgScore._avg.aiScore)
        : 0,
      recentSignups: recentUsers.length,
    });
  } catch (err) {
    return serverError(err);
  }
}
