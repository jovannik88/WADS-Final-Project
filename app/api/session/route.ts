import { adminAuth } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Get idToken from Authorization header (your current login page) or body
    let idToken: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      idToken = authHeader.split("Bearer ")[1];
    } else {
      // Fallback: try body
      const body = await req.json().catch(() => ({}));
      idToken = body.idToken;
    }

    if (!idToken) {
      return NextResponse.json({ error: "ID Token is required" }, { status: 400 });
    }

    // Verify ID Token
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);

    // Create proper Firebase Session Cookie
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const response = NextResponse.json({ 
      success: true,
      user: { uid: decodedToken.uid, email: decodedToken.email }
    });

    // Set secure session cookie
    response.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000,
    });

    return response;

  } catch (error: any) {
    console.error("Session creation error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to create session" 
    }, { status: 401 });
  }
}