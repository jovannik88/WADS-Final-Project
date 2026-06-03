// Gemini client singleton for server-side use only.
// Never import this in client components.

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

let model: GenerativeModel | null = null;

export function getGeminiModel(): GenerativeModel {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set in .env");
  if (!model) {
    const genAI = new GoogleGenerativeAI(key);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }
  return model;
}

export async function generateContentSafe(prompt: string) {
  try {
    const model = getGeminiModel();
    return await model.generateContent(prompt);
  } catch (error: any) {
    const msg = error?.message || "";
    if (msg.includes("API_KEY") || msg.includes("permission") || msg.includes("auth") || msg.includes("403") || msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("request_increase")) {
      throw new Error("AI service is currently unavailable due to capacity limits or authentication issues.");
    }
    throw error;
  }
}

// Builds a rich system prompt so Gemini always has full task context,
// ensuring its responses stay consistent with the cached AI analysis panel.
export function buildSystemPrompt(
  tasks: Array<{ id: number; title: string; subject: string | null; priority: string; dueDate: string | null; status: string; aiScore: number | null }>,
  prioritizationSummary: string,
  scheduleSummary: string,
  todayEvents: Array<{ title: string; startTime: string; endTime: string }> = []
): string {
  const now = new Date();
  const localTime = now.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  const taskList =
    tasks.length === 0
      ? "No pending tasks."
      : tasks
        .map(
          (t, i) =>
            `${i + 1}. [${t.priority}] ${t.title}${t.subject ? ` (${t.subject})` : ""}` +
            `${t.dueDate ? ` \u2014 due ${new Date(t.dueDate).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}` : ""}` +
            `${t.aiScore != null ? ` \u2014 AI score ${t.aiScore.toFixed(0)}/100` : ""}`
        )
        .join("\n");

  const eventList =
    todayEvents.length === 0
      ? "No other events today."
      : todayEvents
          .map((e) => {
            const s = new Date(e.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
            const en = new Date(e.endTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
            return `  \u2022 ${e.title}: ${s}\u2013${en}`;
          })
          .join("\n");

  return `You are StudyFlow AI, a personal academic study assistant embedded in the StudyFlow productivity web app.

\u23F0 CURRENT DATE AND TIME: ${localTime} (${hh}:${mm} local)

⚠️ CRITICAL TIME RULE: It is currently ${hh}:${mm}. NEVER suggest study sessions whose END time has already passed — those windows are gone. A session that started before ${hh}:${mm} but ends after it is still valid and should be shown.

STUDENT\u2019S PENDING TASKS (AI-ranked):
${taskList}

AI PRIORITY ANALYSIS:
${prioritizationSummary}

TODAY\u2019S SUGGESTED STUDY SCHEDULE (from AI \u2014 already accounts for current time):
${scheduleSummary}

TODAY\u2019S CALENDAR EVENTS (user\u2019s existing commitments \u2014 do NOT schedule study during these):
${eventList}

GUIDELINES:
- Be concise, friendly and motivating (under 180 words unless detail is requested)
- Reference the task list and schedule above when relevant \u2014 do NOT invent tasks or deadlines
- If asked about priorities or schedule, use the analysis shown above; do not recalculate
- NEVER suggest a session whose end time has already passed — current time is ${hh}:${mm}. A session is still valid if it ends after ${hh}:${mm}, even if it started earlier
- Avoid scheduling study blocks during the calendar events listed above
- Give practical study tips, time-management advice, and encouragement
- If it\u2019s late at night and no study time remains, acknowledge that and encourage rest + planning for tomorrow
- Acknowledge when a question is outside your scope (you only know about tasks listed above)`;
}

