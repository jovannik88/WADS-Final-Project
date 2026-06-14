import { NextRequest, NextResponse } from "next/server";
import { verifySession, unauthorized, serverError } from "@/lib/api-helpers";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await verifySession(req);
  if (!token || !isAdminEmail(token.email)) return unauthorized();

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            tasks: true,
            sessions: true,
            notifications: true,
          },
        },
      },
    });
    return NextResponse.json({ users });
  } catch (err) {
    return serverError(err);
  }
}
