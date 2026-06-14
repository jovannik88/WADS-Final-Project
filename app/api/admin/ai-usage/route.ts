import { NextRequest, NextResponse } from "next/server";
import { verifySession, unauthorized, serverError } from "@/lib/api-helpers";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await verifySession(req);
  if (!token || !isAdminEmail(token.email)) return unauthorized();

  try {
    const [
      totalAiCacheEntries,
      aiGeneratedEvents,
      aiAlertNotifications,
      tasksWithScore,
      avgScore,
      recentAiActivity,
    ] = await Promise.all([
      prisma.aiCache.count(),
      prisma.event.count({ where: { aiGenerated: true } }),
      prisma.notification.count({ where: { type: "AI_ALERT" } }),
      prisma.task.count({ where: { aiScore: { not: null } } }),
      prisma.task.aggregate({ _avg: { aiScore: true }, where: { aiScore: { not: null } } }),
      // Recent AI cache updates (proxy for recent AI usage)
      prisma.aiCache.findMany({
        orderBy: { generatedAt: "desc" },
        take: 10,
        select: {
          generatedAt: true,
          user: { select: { email: true } },
        },
      }),
    ]);

    // AI score distribution
    const scoreRanges = await Promise.all([
      prisma.task.count({ where: { aiScore: { gte: 80 } } }),
      prisma.task.count({ where: { aiScore: { gte: 50, lt: 80 } } }),
      prisma.task.count({ where: { aiScore: { lt: 50, not: null } } }),
    ]);

    return NextResponse.json({
      totalAiRequests: totalAiCacheEntries,
      aiGeneratedEvents,
      aiAlertNotifications,
      tasksWithScore,
      avgScore: avgScore._avg.aiScore ? Math.round(avgScore._avg.aiScore) : 0,
      scoreDistribution: {
        high: scoreRanges[0],
        medium: scoreRanges[1],
        low: scoreRanges[2],
      },
      recentActivity: recentAiActivity.map((a) => ({
        email: a.user.email,
        at: a.generatedAt,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
