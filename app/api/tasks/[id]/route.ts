// GET, PUT, and DELETE handler for /api/tasks/[id]

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
import { Priority, Status, Prisma } from "@prisma/client";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  subject: z.string().max(100).optional(),
  priority: z.nativeEnum(Priority).optional(),
  status: z.nativeEnum(Status).optional(),
  estimatedMins: z.number().int().positive().max(600).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

async function resolveTask(req: NextRequest, params: Params) {
  const user = await verifySession(req);
  if (!user) return { error: unauthorized() };

  const { id } = await params.params;
  const taskId = parseInt(id, 10);
  if (isNaN(taskId)) return { error: badRequest("Invalid task ID") };

  const task = await prisma.task.findFirst({ where: { id: taskId, userId: user.uid } });
  if (!task) return { error: notFound("Task") };

  return { user, task };
}

export async function GET(req: NextRequest, params: Params) {
  try {
    const result = await resolveTask(req, params);
    if ("error" in result) return result.error;
    return NextResponse.json({ task: result.task }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest, params: Params) {
  try {
    const result = await resolveTask(req, params);
    if ("error" in result) return result.error;

    const parsed = await parseBody(req, updateTaskSchema);
    if (!parsed.success) return badRequest("Invalid task data");

    const data = parsed.data;
    const completedAt =
      data.status === Status.COMPLETED
        ? result.task.completedAt ?? new Date()
        : data.status === Status.PENDING || data.status === Status.IN_PROGRESS
          ? null
          : undefined;

    const updated = await prisma.task.update({
      where: { id: result.task.id },
      data: {
        ...(data.title && { title: sanitizeString(data.title) }),
        ...(data.description !== undefined && {
          description: data.description ? sanitizeString(data.description) : null,
        }),
        ...(data.subject !== undefined && {
          subject: data.subject ? sanitizeString(data.subject) : null,
        }),
        ...(data.priority && { priority: data.priority }),
        ...(data.status && { status: data.status }),
        ...(data.estimatedMins && { estimatedMins: data.estimatedMins }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
        ...(completedAt !== undefined && { completedAt }),
      },
    });

    // When a task is marked COMPLETED, delete ALL AI study block events (past + future).
    if (data.status === Status.COMPLETED) {
      const orConditions: Prisma.EventWhereInput[] = [
        { taskId: result.task.id },
        { title: { contains: result.task.title } },
      ];
      await prisma.event.deleteMany({
        where: {
          userId: result.user.uid,
          aiGenerated: true,
          OR: orConditions,
        },
      });
    }

    return NextResponse.json({ task: updated }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: NextRequest, params: Params) {
  try {
    const result = await resolveTask(req, params);
    if ("error" in result) return result.error;

    await prisma.task.delete({ where: { id: result.task.id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return serverError(err);
  }
}
