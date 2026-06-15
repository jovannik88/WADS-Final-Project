import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { verifySession } from "@/app/api/user/verify";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete user from database (cascades to all related records)
    await prisma.user.delete({
      where: { id: user.uid },
    });

    // Delete user from Firebase Auth
    await getAdminAuth().deleteUser(user.uid);

    // Clear session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("session", "", { maxAge: 0, path: "/" });
    return response;

  } catch (error: unknown) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete account" },
      { status: 500 }
    );
  }
}