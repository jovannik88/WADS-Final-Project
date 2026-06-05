import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { verifySession } from "@/app/api/user/verify";

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession(req);

    if (!user?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Firebase user details
    const firebaseUser = await adminAuth.getUser(user.uid);

    if (!firebaseUser.email) {
      return NextResponse.json({ error: "No email address found" }, { status: 400 });
    }

    // Generate & send password reset email via Firebase
    await adminAuth.generatePasswordResetLink(firebaseUser.email, {
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/login`,
      handleCodeInApp: true,
    });

    console.log(`Password reset email sent to: ${firebaseUser.email}`);

    return NextResponse.json({
      success: true,
      message: "Password reset email has been sent. Please check your inbox.",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Send reset email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send password reset email" },
      { status: 500 }
    );
  }
}