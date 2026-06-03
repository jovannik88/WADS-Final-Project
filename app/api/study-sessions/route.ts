// GET and POST handler for /api/study-sessions

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  verifySession,
  unauthorized,
  badRequest,
  serverError,
  sanitizeString,
  parseBody,
} from "@/lib/api-helpers";

const createSessionSchema = z.object({
  subject: z.string().max(100).optional(),
  taskId: z.number().int().positive().optional(),
  durationMin: z.number().int().min(1).max(600),
  focusScore: z.number().min(0).max(100).optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

    const sessions = await prisma.studySession.findMany({
      where: { userId: user.uid },
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const parsed = await parseBody(req, createSessionSchema);
    if (!parsed.success) return badRequest("Invalid session data");

    const data = parsed.data;
    const start = new Date(data.startedAt);
    const end = new Date(data.endedAt);

    if (end <= start) return badRequest("endedAt must be after startedAt");

    await prisma.user.upsert({
      where: { id: user.uid },
      update: {},
      create: { id: user.uid, email: user.email ?? "", name: user.name ?? null },
    });

    const session = await prisma.studySession.create({
      data: {
        userId: user.uid,
        subject: data.subject ? sanitizeString(data.subject) : null,
        taskId: data.taskId ?? null,
        durationMin: data.durationMin,
        focusScore: data.focusScore ?? null,
        startedAt: start,
        endedAt: end,
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
