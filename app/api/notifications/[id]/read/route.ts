// PATCH handler for /api/notifications/[id]/read — marks a single notification as read

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifySession,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const notifId = parseInt(id, 10);
    if (isNaN(notifId)) return badRequest("Invalid notification ID");

    const existing = await prisma.notification.findFirst({
      where: { id: notifId, userId: user.uid },
    });
    if (!existing) return notFound("Notification");

    const updated = await prisma.notification.update({
      where: { id: notifId },
      data: { read: true },
    });

    return NextResponse.json({ notification: updated }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}
