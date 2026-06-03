// PUT and DELETE handler for /api/events/[id]

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  verifySession,
  unauthorized,
  badRequest,
  notFound,
  serverError,
  sanitizeString,
  parseBody,
} from "@/lib/api-helpers";
import { EventType } from "@prisma/client";

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
  eventType: z.nativeEnum(EventType).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,6}$/)
    .optional(),
});

type Params = { params: Promise<{ id: string }> };

async function resolveEvent(req: NextRequest, params: Params) {
  const user = await verifySession(req);
  if (!user) return { error: unauthorized() };

  const { id } = await params.params;
  const eventId = parseInt(id, 10);
  if (isNaN(eventId)) return { error: badRequest("Invalid event ID") };

  const event = await prisma.event.findFirst({ where: { id: eventId, userId: user.uid } });
  if (!event) return { error: notFound("Event") };

  return { user, event };
}

export async function PUT(req: NextRequest, params: Params) {
  try {
    const result = await resolveEvent(req, params);
    if ("error" in result) return result.error;

    const parsed = await parseBody(req, updateEventSchema);
    if (!parsed.success) return badRequest("Invalid event data");

    const data = parsed.data;
    const start = data.startTime ? new Date(data.startTime) : result.event.startTime;
    const end = data.endTime ? new Date(data.endTime) : result.event.endTime;

    if (end <= start) return badRequest("endTime must be after startTime");

    const updated = await prisma.event.update({
      where: { id: result.event.id },
      data: {
        ...(data.title && { title: sanitizeString(data.title) }),
        ...(data.description !== undefined && {
          description: data.description ? sanitizeString(data.description) : null,
        }),
        startTime: start,
        endTime: end,
        ...(data.allDay !== undefined && { allDay: data.allDay }),
        ...(data.eventType && { eventType: data.eventType }),
        ...(data.color !== undefined && { color: data.color ?? null }),
      },
    });

    return NextResponse.json({ event: updated }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: NextRequest, params: Params) {
  try {
    const result = await resolveEvent(req, params);
    if ("error" in result) return result.error;

    await prisma.event.delete({ where: { id: result.event.id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return serverError(err);
  }
}
