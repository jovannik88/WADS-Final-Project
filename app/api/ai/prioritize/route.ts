import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession, unauthorized, serverError } from "@/lib/api-helpers";
import { getOrGenerateAiSuggestions } from "@/lib/ai-cache";
import { Status } from "@prisma/client";

// GET: read cached prioritization from DB without regenerating
export async function GET(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    // Try AiCache first
    const cache = await prisma.aiCache.findUnique({ where: { userId: user.uid } });
    if (cache && new Date() < cache.expiresAt) {
      const p = cache.prioritization as any;
      return NextResponse.json({ ...p, fromCache: true }, { status: 200 });
    }

    // Fall back to per-task aiScore/aiReason fields
    const tasks = await prisma.task.findMany({
      where: { userId: user.uid, status: { not: Status.COMPLETED }, aiScore: { not: null } },
      orderBy: { aiScore: "desc" },
    });
    const prioritized = tasks.map((t, i) => ({
      taskId: t.id,
      title: t.title,
      aiScore: t.aiScore ?? 0,
      aiReason: t.aiReason ?? "No analysis yet",
      suggestedOrder: i + 1,
    }));
    return NextResponse.json({ prioritized, summary: "", fromCache: true }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [tasks, sessions, settings] = await Promise.all([
      prisma.task.findMany({ where: { userId: user.uid, status: { not: Status.COMPLETED } } }),
      prisma.studySession.findMany({ where: { userId: user.uid, startedAt: { gte: thirtyDaysAgo } } }),
      prisma.userSettings.upsert({
        where: { userId: user.uid },
        update: {},
        create: { userId: user.uid, updatedAt: new Date() },
      }),
    ]);

    const { prioritization, fromCache } = await getOrGenerateAiSuggestions(
      user.uid, tasks, sessions, settings
    );

    // Persist AI scores back to tasks only when analysis is fresh
    if (!fromCache) {
      await Promise.all(
        prioritization.prioritized.map((p) =>
          prisma.task.update({
            where: { id: p.taskId },
            data: { aiScore: p.aiScore, aiReason: p.aiReason },
          })
        )
      );

      if (prioritization.prioritized[0]) {
        const top = prioritization.prioritized[0];
        await prisma.notification.create({
          data: {
            userId: user.uid,
            title: "AI Priority Update",
            body: `Start with "${tasks.find((t) => t.id === top.taskId)?.title}" — ${top.aiReason}.`,
            type: "AI_ALERT",
          },
        });
      }
    }

    return NextResponse.json({ ...prioritization, fromCache }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}
