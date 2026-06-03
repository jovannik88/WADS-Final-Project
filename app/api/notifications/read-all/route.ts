// PATCH handler for /api/notifications/read-all — marks all notifications as read

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession, unauthorized, serverError } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const result = await prisma.notification.updateMany({
      where: { userId: user.uid, read: false },
      data: { read: true },
    });

    return NextResponse.json({ updated: result.count }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}
