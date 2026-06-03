// GET and PUT handler for /api/settings

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession, unauthorized, badRequest, serverError, parseBody } from "@/lib/api-helpers";

const settingsSchema = z.object({
  preferredStartHour: z.number().int().min(0).max(23).optional(),
  preferredEndHour: z.number().int().min(0).max(23).optional(),
  pomodoroMins: z.number().int().min(5).max(120).optional(),
  shortBreakMins: z.number().int().min(1).max(30).optional(),
  longBreakMins: z.number().int().min(5).max(60).optional(),
  timezone: z.string().max(50).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const settings = await prisma.userSettings.upsert({
      where: { userId: user.uid },
      update: {},
      create: { userId: user.uid, updatedAt: new Date() },
    });

    return NextResponse.json({ settings }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const parsed = await parseBody(req, settingsSchema);
    if (!parsed.success) return badRequest("Invalid settings data");

    const data = parsed.data;

    if (
      data.preferredStartHour !== undefined &&
      data.preferredEndHour !== undefined &&
      data.preferredEndHour <= data.preferredStartHour
    ) {
      return badRequest("preferredEndHour must be after preferredStartHour");
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: user.uid },
      update: { ...data, updatedAt: new Date() },
      create: { userId: user.uid, ...data, updatedAt: new Date() },
    });

    return NextResponse.json({ settings }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}
