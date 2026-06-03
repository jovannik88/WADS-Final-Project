// PATCH /api/notifications/[id] — mark single notification as read
// DELETE /api/notifications/[id] — delete single notification

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession, unauthorized, notFound, serverError } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const notif = await prisma.notification.findFirst({ where: { id: parseInt(id), userId: user.uid } });
    if (!notif) return notFound("Notification");

    const updated = await prisma.notification.update({ where: { id: parseInt(id) }, data: { read: true } });
    return NextResponse.json({ notification: updated });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const notif = await prisma.notification.findFirst({ where: { id: parseInt(id), userId: user.uid } });
    if (!notif) return notFound("Notification");

    await prisma.notification.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
