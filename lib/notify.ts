// Server-side helper to create a notification for a user without an HTTP round-trip.
// Import this in API routes that need to emit notifications.

import { prisma } from "@/lib/prisma";
import { NotifType } from "@prisma/client";

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: NotifType = NotifType.REMINDER
) {
  try {
    return await prisma.notification.create({
      data: { userId, title, body, type },
    });
  } catch {
    // Non-fatal: never let notification failure break the main action
    return null;
  }
}
