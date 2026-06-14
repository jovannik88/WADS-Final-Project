// POST /api/timer/complete
// Called when a study session ends. Saves the session, calls Gemini for next steps,
// and optionally creates a rescheduled AI study block on the calendar.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession, unauthorized, badRequest, serverError, sanitizeString, parseBody } from "@/lib/api-helpers";
import { getGeminiModel } from "@/lib/gemini";
import { createNotification } from "@/lib/notify";
import { EventType, Status, Prisma } from "@prisma/client";

const schema = z.object({
  subject: z.string().max(100).optional(),
  taskId: z.number().int().positive().optional(),
  taskTitle: z.string().max(200).optional(),
  scheduledDurationMin: z.number().int().min(1),
  actualDurationMin: z.number().int().min(1),
  completionPct: z.number().min(0).max(100),
  note: z.string().max(1000).optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const parsed = await parseBody(req, schema);
    if (!parsed.success) return badRequest("Invalid session data");
    const d = parsed.data;

    // Ensure user row exists
    await prisma.user.upsert({
      where: { id: user.uid },
      update: {},
      create: { id: user.uid, email: user.email ?? "", name: user.name ?? null },
    });

    // 1. Save the study session
    const focusScore = Math.round(
      (d.completionPct * 0.6) + ((d.actualDurationMin / d.scheduledDurationMin) * 40)
    );
    const session = await prisma.studySession.create({
      data: {
        userId: user.uid,
        subject: d.subject ? sanitizeString(d.subject) : null,
        taskId: d.taskId ?? null,
        durationMin: d.actualDurationMin,
        focusScore: Math.min(100, focusScore),
        startedAt: new Date(d.startedAt),
        endedAt: new Date(d.endedAt),
      },
    });

    // Update task progress in DB if taskId provided
    let taskCompleted = false;
    if (d.taskId) {
      const isComplete = d.completionPct >= 100;
      // Verify task belongs to this user before updating (where only accepts unique fields)
      const ownedTask = await prisma.task.findFirst({ where: { id: d.taskId, userId: user.uid } });
      if (ownedTask) {
        await prisma.task.update({
          where: { id: d.taskId },
          data: {
            progress: Math.round(d.completionPct),
            ...(isComplete ? { status: Status.COMPLETED, completedAt: new Date() } : {}),
          },
        });
        // If 100% done, delete ALL AI-generated study blocks for this task (past + future).
        // Match by taskId (new events) OR title (legacy events before taskId column existed).
        if (isComplete) {
          taskCompleted = true;
          const taskTitleForMatch = d.taskTitle ?? "";
          const orConditions: Prisma.EventWhereInput[] = [];
          if (d.taskId) orConditions.push({ taskId: d.taskId });
          if (taskTitleForMatch) orConditions.push({ title: { contains: taskTitleForMatch } });
          if (orConditions.length > 0) {
            await prisma.event.deleteMany({
              where: {
                userId: user.uid,
                aiGenerated: true,
                OR: orConditions,
              },
            });
          }
          await createNotification(
            user.uid,
            "✅ Task completed!",
            `"${d.taskTitle ?? "Task"}" is 100% done and has been removed from your schedule.`,
            "ACHIEVEMENT"
          );
        }
      }
    }


    // Notify: session completed
    const focusLabel = d.subject ?? d.taskTitle ?? "study session";
    await createNotification(
      user.uid,
      "Session complete ✓",
      `You studied ${focusLabel} for ${d.actualDurationMin} min and reached ${d.completionPct}% completion.`,
      "ACHIEVEMENT"
    );

    // 2. Load context for Gemini
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const nextWeek   = new Date(now.getTime() + 7 * 86400000);

    const [pendingTasks, upcomingEvents] = await Promise.all([
      prisma.task.findMany({
        where: { userId: user.uid, status: { not: Status.COMPLETED } },
        orderBy: [{ aiScore: "desc" }, { dueDate: "asc" }],
        take: 15,
      }),
      prisma.event.findMany({
        where: { userId: user.uid, startTime: { gte: now, lte: nextWeek } },
        orderBy: { startTime: "asc" },
      }),
    ]);

    // Build list of busy windows so Gemini doesn't suggest conflicting slots
    const busySlots = upcomingEvents
      .map(e => {
        const s = e.startTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        const en = e.endTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        const day = e.startTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return `  • ${e.title}: ${day} ${s}–${en}`;
      })
      .join("\n") || "  (none)";

    const taskList = pendingTasks.map((t, i) =>
      `${i + 1}. [${t.priority}] ${t.title}${t.subject ? ` (${t.subject})` : ""}` +
      (t.dueDate ? ` — due ${t.dueDate.toLocaleDateString("en-US", { dateStyle: "medium" })}` : "") +
      (t.aiScore != null ? ` — AI score ${t.aiScore.toFixed(0)}/100` : "")
    ).join("\n") || "  (none)";

    const currentTask = d.taskTitle ?? d.subject ?? "this session";
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");

    const prompt = `You are StudyFlow AI helping a student who just completed a study session.

⏰ CURRENT TIME: ${now.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })} (${hh}:${mm} local)

SESSION JUST COMPLETED:
- Task: ${currentTask}
- Scheduled duration: ${d.scheduledDurationMin} min
- Actual duration: ${d.actualDurationMin} min
- Task completion: ${d.completionPct}%
- Student note: "${d.note || "none"}"

REMAINING PENDING TASKS (AI-ranked):
${taskList}

UPCOMING CALENDAR EVENTS (do NOT suggest study blocks that overlap these):
${busySlots}

YOUR JOB:
1. Give a short (2–4 sentence) encouraging and specific response about this session's result.
2. Based on completion % and the task's due date, decide if a follow-up study block is needed.
3. If a follow-up is needed, suggest ONE specific time slot in the next 48 hours that does NOT conflict with any calendar events listed above.

CRITICAL RULES:
- NEVER suggest a time before ${hh}:${mm} today — those moments have passed.
- NEVER overlap with any listed calendar events.
- If task is 100% complete, say so and move on to the next priority task instead.
- Keep your text response under 120 words.

RESPONSE FORMAT (JSON only, no markdown, no extra text):
{
  "message": "your 2-4 sentence response here",
  "suggestReschedule": true or false,
  "reschedule": {
    "title": "Study: <task name>",
    "subject": "<subject or null>",
    "startISO": "<ISO 8601 datetime, e.g. 2025-05-21T19:00:00>",
    "endISO":   "<ISO 8601 datetime>",
    "reason": "one-line reason for this slot"
  }
}
If suggestReschedule is false, omit the "reschedule" key entirely.`;

    // 3. Call Gemini
    let aiMessage = "Great session! Keep up the momentum.";
    let newEvent: { id: number; title: string; startTime: Date; endTime: Date } | null = null;

    try {
      const gemini = getGeminiModel();
      const result = await gemini.generateContent(prompt);
      const raw = result.response.text().trim();

      // Strip markdown fences if Gemini wraps in ```json
      const jsonStr = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(jsonStr);

      aiMessage = parsed.message ?? aiMessage;

      if (parsed.suggestReschedule && parsed.reschedule) {
        const r = parsed.reschedule;
        const start = new Date(r.startISO);
        const end   = new Date(r.endISO);

        // Only create if valid future times and no collision
        if (start > now && end > start) {
          // Double-check no collision with DB events
          const collision = upcomingEvents.find(e =>
            e.startTime < end && e.endTime > start
          );
          if (!collision) {
            newEvent = await prisma.event.create({
              data: {
                userId: user.uid,
                title: sanitizeString(r.title ?? `Study: ${currentTask}`),
                description: sanitizeString(r.reason ?? "AI-suggested follow-up session"),
                startTime: start,
                endTime: end,
                eventType: EventType.STUDY_BLOCK,
                color: "#0d9488",
                aiGenerated: true,
              },
            });
            // Notify: AI added follow-up to calendar
            await createNotification(
              user.uid,
              "✦ AI added a follow-up session",
              `Based on your ${d.completionPct}% completion, the AI scheduled a follow-up: "${r.title}" on ${new Date(r.startISO).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}.`,
              "AI_ALERT"
            );
          } else {
            aiMessage += " (Note: suggested slot overlapped an existing event — please check your calendar.)";
          }
        }
      }
    } catch (aiErr) {
      // AI failure is non-fatal: session is already saved
      console.error("[timer/complete] Gemini error:", aiErr);
    }

    return NextResponse.json({
      session,
      aiMessage,
      taskCompleted,
      newEvent: newEvent
        ? {
            id: newEvent.id,
            title: newEvent.title,
            startTime: newEvent.startTime.toISOString(),
            endTime:   newEvent.endTime.toISOString(),
          }
        : null,
    }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
