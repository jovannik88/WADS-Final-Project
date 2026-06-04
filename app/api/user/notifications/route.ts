import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await verifySession(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const settings = await prisma.userSettings.findUnique({
      where: {
        userId: user.uid,
      },
    });

    return NextResponse.json({
      deadlineReminders: settings?.notifDeadline ?? true,
      sessionReminders: settings?.notifSession ?? true,
      aiSuggestions: settings?.notifAI ?? true,
      streakAlerts: settings?.notifStreak ?? false,
      weeklySummary: settings?.notifWeeklySummary ?? false,
      deadlineLeadHours: settings?.deadlineLeadHours ?? 24,
    });
  } catch (error) {
    console.error("GET notifications error:", error);

    return NextResponse.json(
      { error: "Failed to load notification settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await verifySession(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const settings = await prisma.userSettings.upsert({
      where: {
        userId: user.uid,
      },
      update: {
        notifDeadline: body.deadlineReminders,
        notifSession: body.sessionReminders,
        notifAI: body.aiSuggestions,
        notifStreak: body.streakAlerts,
        notifWeeklySummary: body.weeklySummary,
        deadlineLeadHours: body.deadlineLeadHours,
      },
      create: {
        userId: user.uid,
        notifDeadline: body.deadlineReminders,
        notifSession: body.sessionReminders,
        notifAI: body.aiSuggestions,
        notifStreak: body.streakAlerts,
        notifWeeklySummary: body.weeklySummary,
        deadlineLeadHours: body.deadlineLeadHours,
      },
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("PUT notifications error:", error);

    return NextResponse.json(
      { error: "Failed to save notification settings" },
      { status: 500 }
    );
  }
}