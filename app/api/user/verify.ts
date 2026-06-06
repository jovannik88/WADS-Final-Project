import { getAdminAuth } from "@/lib/firebase-admin";
import { NextRequest } from "next/server";

export async function verifySession(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("session")?.value;
    
    if (sessionCookie) {
      const decodedToken = await getAdminAuth().verifySessionCookie(sessionCookie, true);
      return decodedToken;
    }

    return null;
  } catch (error) {
    console.error("verifySession failed:", error);
    return null;
  }
}