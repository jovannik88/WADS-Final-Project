import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let user = await prisma.user.findUnique({
      where: {
        id: session.uid,
      },
      include: {
        settings: true,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: session.uid,
          email: session.email || "",
          name: session.name || "",
          settings: {
            create: {
              timezone: "Asia/Jakarta",
            },
          },
        },
        include: {
          settings: true,
        },
      });
    }

    return NextResponse.json({
      user: {
        ...user,
        timezone: user.settings?.timezone || "Asia/Jakarta",
        firebaseUid: session.uid,
      },
    });
  } catch (error) {
    console.error("GET profile error:", error);

    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await verifySession(req);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    await prisma.user.update({
      where: {
        id: session.uid,
      },
      data: {
        name: body.name,
        email: body.email,
      },
    });

    await prisma.userSettings.upsert({
      where: {
        userId: session.uid,
      },
      update: {
        timezone: body.timezone,
      },
      create: {
        userId: session.uid,
        timezone: body.timezone,
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: session.uid,
      },
      include: {
        settings: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        timezone: updatedUser?.settings?.timezone || "Asia/Jakarta",
        firebaseUid: session.uid,
      },
    });
  } catch (error) {
    console.error("PUT profile error:", error);

    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}