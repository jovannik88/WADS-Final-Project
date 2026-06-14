import { NextRequest, NextResponse } from "next/server";
import { verifySession, unauthorized, serverError } from "@/lib/api-helpers";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const token = await verifySession(req);
  if (!token || !isAdminEmail(token.email)) return unauthorized();

  const { uid } = await params;
  try {
    // Delete from DB (cascades all related data)
    await prisma.user.delete({ where: { id: uid } });
    // Delete from Firebase Auth
    try {
      await getAdminAuth().deleteUser(uid);
    } catch {
      // Firebase deletion is best-effort
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const token = await verifySession(req);
  if (!token || !isAdminEmail(token.email)) return unauthorized();

  const { uid } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const disabled = body.disabled ?? true;
    // Disable/enable in Firebase
    await getAdminAuth().updateUser(uid, { disabled });
    return NextResponse.json({ success: true, disabled });
  } catch (err) {
    return serverError(err);
  }
}
