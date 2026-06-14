// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession, unauthorized, serverError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    // upsert so first-time Google users get a row automatically
    const dbUser = await prisma.user.upsert({
      where: { id: user.uid },
      update: {},
      create: {
        id: user.uid,
        email: user.email ?? "",
        name: user.name ?? user.email ?? "",
      },
    });

    return NextResponse.json({ user: dbUser }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const { name, email } = await req.json();

    const updated = await prisma.user.update({
      where: { id: user.uid },
      data: { name, email},
    });

    return NextResponse.json({ user: updated }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}