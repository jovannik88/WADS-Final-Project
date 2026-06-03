// GET and POST handler for /api/events

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
import { EventType } from "@prisma/client";

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  allDay: z.boolean().optional().default(false),
  eventType: z.nativeEnum(EventType).optional().default(EventType.PERSONAL),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,6}$/)
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    // Get IDs of all completed tasks so we can exclude their AI study blocks
    const completedTasks = await prisma.task.findMany({
      where: { userId: user.uid, status: "COMPLETED" },
      select: { id: true },
    });
    const completedTaskIds = completedTasks.map((t) => t.id);

    const events = await prisma.event.findMany({
      where: {
        userId: user.uid,
        ...(from && { startTime: { gte: new Date(from) } }),
        ...(to   && { endTime:   { lte: new Date(to)   } }),
        // Never return AI study blocks whose task is already completed
        ...(completedTaskIds.length > 0 && {
          NOT: {
            AND: [
              { aiGenerated: true },
              { taskId: { in: completedTaskIds } },
            ],
          },
        }),
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ events }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const parsed = await parseBody(req, createEventSchema);
    if (!parsed.success) return badRequest("Invalid event data");

    const data = parsed.data;
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (end <= start) return badRequest("endTime must be after startTime");

    await prisma.user.upsert({
      where: { id: user.uid },
      update: {},
      create: {
        id: user.uid,
        email: user.email ?? "",
        name: user.name ?? null,
      },
    });

    const event = await prisma.event.create({
      data: {
        userId: user.uid,
        title: sanitizeString(data.title),
        description: data.description ? sanitizeString(data.description) : null,
        startTime: start,
        endTime: end,
        allDay: data.allDay,
        eventType: data.eventType,
        color: data.color ?? null,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}