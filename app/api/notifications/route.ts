// GET, POST /api/notifications

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession, unauthorized, serverError, sanitizeString, parseBody, badRequest } from "@/lib/api-helpers";
import { NotifType } from "@prisma/client";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  type: z.nativeEnum(NotifType).optional().default(NotifType.REMINDER),
});

export async function GET(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.uid, ...(unreadOnly && { read: false }) },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({ where: { userId: user.uid, read: false } }),
    ]);

    return NextResponse.json({ notifications, unreadCount }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const parsed = await parseBody(req, createSchema);
    if (!parsed.success) return badRequest("Invalid notification data");

    await prisma.user.upsert({
      where: { id: user.uid },
      update: {},
      create: { id: user.uid, email: user.email ?? "", name: user.name ?? null },
    });

    const notif = await prisma.notification.create({
      data: {
        userId: user.uid,
        title: sanitizeString(parsed.data.title),
        body: sanitizeString(parsed.data.body),
        type: parsed.data.type,
      },
    });

    return NextResponse.json({ notification: notif }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    await prisma.notification.deleteMany({ where: { userId: user.uid } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
