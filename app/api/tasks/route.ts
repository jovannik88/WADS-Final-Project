// GET and POST handler for /api/tasks

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
import { Priority, Status } from "@prisma/client";
import { createNotification } from "@/lib/notify";

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  subject: z.string().max(100).optional(),
  priority: z.nativeEnum(Priority).optional().default(Priority.MEDIUM),
  estimatedMins: z.number().int().positive().max(600).optional(),
  dueDate: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") as Status | null;
    const priorityFilter = searchParams.get("priority") as Priority | null;

    const tasks = await prisma.task.findMany({
      where: {
        userId: user.uid,
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
      },
      orderBy: [{ aiScore: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const parsed = await parseBody(req, createTaskSchema);
    if (!parsed.success) return badRequest("Invalid task data");

    const data = parsed.data;

    // Ensure user record exists (upsert to handle first-time users)
    await prisma.user.upsert({
      where: { id: user.uid },
      update: {},
      create: {
        id: user.uid,
        email: user.email ?? "",
        name: user.name ?? null,
      },
    });

    const task = await prisma.task.create({
      data: {
        userId: user.uid,
        title: sanitizeString(data.title),
        description: data.description ? sanitizeString(data.description) : null,
        subject: data.subject ? sanitizeString(data.subject) : null,
        priority: data.priority,
        estimatedMins: data.estimatedMins,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    // Fire deadline notification if due within 3 days
// Fire deadline notification if due within 3 days
// Fire deadline notification if due within 3 calendar days
if (data.dueDate) {
  const due = new Date(data.dueDate);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (dueDay.getTime() - today.getTime()) / 86400000
  );

  if (diffDays <= 3 && diffDays >= 0) {
    const label =
      diffDays === 0
        ? "today"
        : diffDays === 1
        ? "tomorrow"
        : `in ${diffDays} days`;

    await createNotification(
      user.uid,
      `Deadline ${label}: ${task.title}`,
      `"${task.title}" is due ${label} (${due.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })}). Don't forget to add it to your study schedule.`,
      "DEADLINE"
    );
  }
}

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}