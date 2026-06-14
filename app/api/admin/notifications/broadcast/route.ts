import { NextRequest, NextResponse } from "next/server";
import { verifySession, unauthorized, serverError } from "@/lib/api-helpers";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const token = await verifySession(req);
  if (!token || !isAdminEmail(token.email)) return unauthorized();

  try {
    const body = await req.json();
    const { title, body: msgBody, type } = body;

    if (!title || !msgBody) {
      return NextResponse.json({ error: "title and body required" }, { status: 400 });
    }

    const validTypes = ["REMINDER", "AI_ALERT", "DEADLINE", "ACHIEVEMENT"];
    const notifType = validTypes.includes(type) ? type : "REMINDER";

    // Get all user IDs
    const users = await prisma.user.findMany({ select: { id: true } });

    // Bulk insert notification for every user
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title,
        body: msgBody,
        type: notifType,
      })),
    });

    return NextResponse.json({ success: true, sent: users.length });
  } catch (err) {
    return serverError(err);
  }
}
