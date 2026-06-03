import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { z } from "zod";
import type { DecodedIdToken } from "firebase-admin/auth";

// Verifies the session cookie and returns the decoded token or null
export async function verifySession(req: NextRequest): Promise<DecodedIdToken | null> {
  const session = req.cookies.get("session")?.value;

  if (!session) {
    return null;
  }

  try {
    return await adminAuth.verifySessionCookie(session, true);
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}

// Returns a 401 JSON response
export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Returns a 400 JSON response with validation errors
export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// Returns a 404 JSON response
export function notFound(resource = "Resource") {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

// Returns a 500 JSON response
export function serverError(err?: unknown) {
  const message = err instanceof Error ? err.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}

// Strips HTML tags from a string to prevent XSS in stored text
export function sanitizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, "").trim().slice(0, 2000);
}

// Parses and validates a request body against a Zod schema
export async function parseBody<T>(req: NextRequest, schema: z.ZodType<T>) {
  try {
    const json = await req.json();
    return schema.safeParse(json);
  } catch {
    return { success: false as const, error: new z.ZodError([]) };
  }
}

// CORS headers for API routes (restricted to same origin in production)
export function withCors(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", process.env.NEXT_PUBLIC_APP_URL ?? "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}
