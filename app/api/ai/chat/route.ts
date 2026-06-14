import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession, unauthorized, badRequest, parseBody } from "@/lib/api-helpers";
import { getGeminiModel, buildSystemPrompt } from "@/lib/gemini";
import { getOrGenerateAiSuggestions } from "@/lib/ai-cache";
import { Status } from "@prisma/client";

const PLACEHOLDER_KEY = "your-gemini-api-key-here";

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        parts: z.array(z.object({ text: z.string() })),
      })
    )
    .optional()
    .default([]),
});

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const parsed = await parseBody(req, chatSchema);
    if (!parsed.success) return badRequest("Invalid request body");
    const { message, history } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === PLACEHOLDER_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured. Get a free key at https://aistudio.google.com/app/apikey and add it to your .env file." },
        { status: 503 }
      );
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const dayStart = new Date(today); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(today); dayEnd.setHours(23, 59, 59, 999);

    // Ensure user exists in DB before any relational queries
    await prisma.user.upsert({
      where: { id: user.uid },
      update: {},
      create: { id: user.uid, email: user.email ?? "", name: user.name ?? null },
    });

    const [tasks, sessions, settings, todayEvents] = await Promise.all([
      prisma.task.findMany({ where: { userId: user.uid, status: { not: Status.COMPLETED } } }),
      prisma.studySession.findMany({ where: { userId: user.uid, startedAt: { gte: thirtyDaysAgo } } }),
      prisma.userSettings.upsert({
        where: { userId: user.uid },
        update: {},
        create: { userId: user.uid, updatedAt: new Date() },
      }),
      prisma.event.findMany({
        where: { userId: user.uid, startTime: { gte: dayStart, lte: dayEnd }, aiGenerated: false },
        select: { startTime: true, endTime: true, title: true },
      }),
    ]);

    const { prioritization, schedule } = await getOrGenerateAiSuggestions(
      user.uid, tasks, sessions, settings, todayEvents
    );

    const systemPrompt = buildSystemPrompt(
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        subject: t.subject,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString() ?? null,
        status: t.status,
        aiScore: t.aiScore,
      })),
      prioritization.summary,
      schedule.summary,
      todayEvents.map((e) => ({
        title: e.title,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
      }))
    );

    const gemini = getGeminiModel();

    const chat = gemini.startChat({
      history: [
        { role: "user" as const, parts: [{ text: "System context:\n" + systemPrompt }] },
        { role: "model" as const, parts: [{ text: "Understood. I'm StudyFlow AI, ready to help." }] },
        ...(history ?? []),
      ],
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return NextResponse.json({ response: responseText }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ai/chat] Error:", msg);

    // 503 / high demand / service unavailable
    if (msg.includes("503") || msg.includes("Service Unavailable") || msg.includes("overloaded") || msg.includes("high demand") || msg.includes("try again later")) {
      return NextResponse.json({ error: "overloaded" }, { status: 503 });
    }
    // 429 quota / resource exhausted / billing
    if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("rate limit") || msg.includes("billing") || msg.includes("request_increase")) {
      return NextResponse.json({ error: "quota_exceeded" }, { status: 429 });
    }
    // API key / auth issues
    if (msg.includes("API_KEY") || msg.includes("403") || msg.includes("permission") || msg.includes("auth")) {
      return NextResponse.json({ error: "config_error" }, { status: 403 });
    }
    // Generic Gemini API error
    return NextResponse.json({ error: "api_error", detail: msg }, { status: 500 });
  }
}
