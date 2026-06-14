import {
  computePriorityScore,
  prioritizeTasks,
  optimizeSchedule,
} from "@/lib/ai-engine";
import type { Task, StudySession, UserSettings } from "@prisma/client";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const SESSION_COOKIE = process.env.TEST_SESSION_COOKIE ?? "";

const itAuth = SESSION_COOKIE ? it : it.skip;

function authHeaders() {
  return {
    Cookie: `session=${SESSION_COOKIE}`,
    "Content-Type": "application/json",
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    userId: "user-123",
    title: "Test Task",
    description: null,
    subject: null,
    priority: "MEDIUM",
    aiScore: null,
    aiReason: null,
    status: "PENDING",
    estimatedMins: 60,
    dueDate: null,
    completedAt: null,
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    id: 1,
    userId: "user-123",
    preferredStartHour: 8,
    preferredEndHour: 22,
    pomodoroMins: 25,
    shortBreakMins: 5,
    longBreakMins: 15,
    timezone: "UTC",
    notifDeadline: true,
    notifSession: true,
    notifAI: true,
    notifStreak: false,
    notifWeeklySummary: false,
    deadlineLeadHours: 24,
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSession(overrides: Partial<StudySession> = {}): StudySession {
  return {
    id: 1,
    userId: "user-123",
    subject: "Math",
    taskId: null,
    durationMin: 60,
    focusScore: 80,
    startedAt: new Date(),
    endedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

function futureDate(daysFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

// computePriorityScore: VALID INPUTS

describe("AI Engine — computePriorityScore (Valid Inputs)", () => {

  test("HIGH priority overdue task scores maximum", () => {
    const task = makeTask({
      priority: "HIGH",
      dueDate: new Date(Date.now() - 86400000), // 1 day ago
    });
    const score = computePriorityScore(task);
    expect(score).toBeGreaterThanOrEqual(75);
    expect(score).toBeLessThanOrEqual(100);
  });

  test("LOW priority task with no deadline scores low", () => {
    const task = makeTask({ priority: "LOW", dueDate: null });
    const score = computePriorityScore(task);
    expect(score).toBeLessThan(30);
  });

  test("MEDIUM priority task due in 3 days scores mid-range", () => {
    const task = makeTask({
      priority: "MEDIUM",
      dueDate: futureDate(3),
    });
    const score = computePriorityScore(task);
    expect(score).toBeGreaterThan(20);
    expect(score).toBeLessThan(60);
  });

  test("HIGH priority task due in 24 hours scores very high", () => {
    const task = makeTask({
      priority: "HIGH",
      dueDate: new Date(Date.now() + 3600000 * 20), // 20 hours
    });
    const score = computePriorityScore(task);
    expect(score).toBeGreaterThan(70);
  });

  test("quick task (< 30 mins) gets a bonus", () => {
    const quick = makeTask({ estimatedMins: 20 });
    const normal = makeTask({ estimatedMins: 60 });
    expect(computePriorityScore(quick)).toBeGreaterThan(computePriorityScore(normal));
  });

  test("long task (> 180 mins) gets a penalty", () => {
    const long = makeTask({ estimatedMins: 200 });
    const normal = makeTask({ estimatedMins: 60 });
    expect(computePriorityScore(long)).toBeLessThan(computePriorityScore(normal));
  });

  test("score is always between 0 and 100", () => {
    const tasks = [
      makeTask({ priority: "HIGH", dueDate: new Date(Date.now() - 1000) }),
      makeTask({ priority: "LOW", dueDate: futureDate(365) }),
      makeTask({ priority: "MEDIUM", dueDate: null }),
      makeTask({ priority: "HIGH", estimatedMins: 1 }),
      makeTask({ priority: "LOW", estimatedMins: 600 }),
    ];
    tasks.forEach(task => {
      const score = computePriorityScore(task);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  test("all three priority levels produce different scores", () => {
    const high = computePriorityScore(makeTask({ priority: "HIGH" }));
    const medium = computePriorityScore(makeTask({ priority: "MEDIUM" }));
    const low = computePriorityScore(makeTask({ priority: "LOW" }));
    expect(high).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(low);
  });
});


// computePriorityScore: EDGE CASES

describe("AI Engine — computePriorityScore (Edge Cases)", () => {

  test("task due exactly now scores high urgency", () => {
    const task = makeTask({ dueDate: new Date() });
    const score = computePriorityScore(task);
    expect(score).toBeGreaterThan(50);
  });

  test("task due 1 year from now scores low urgency", () => {
    const task = makeTask({ dueDate: futureDate(365) });
    const score = computePriorityScore(task);
    expect(score).toBeLessThan(50);
  });

  test("task with null estimatedMins still scores correctly", () => {
    const task = makeTask({ estimatedMins: null });
    expect(() => computePriorityScore(task as any)).not.toThrow();
    const score = computePriorityScore(task as any);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test("task due in exactly 24 hours scores high", () => {
    const task = makeTask({
      priority: "HIGH",
      dueDate: new Date(Date.now() + 3600000 * 24),
    });
    const score = computePriorityScore(task);
    expect(score).toBeGreaterThan(60);
  });

  test("same task scored twice returns same result (deterministic)", () => {
    const task = makeTask({
      priority: "HIGH",
      dueDate: futureDate(2),
      estimatedMins: 45,
    });
    const nowMs = Date.now();
    expect(computePriorityScore(task, nowMs)).toBe(computePriorityScore(task, nowMs));
  });
});

// prioritizeTasks: VALID INPUTS
describe("AI Engine — prioritizeTasks (Valid Inputs)", () => {

  test("returns empty result when no tasks", () => {
    const result = prioritizeTasks([]);
    expect(result.prioritized).toHaveLength(0);
    expect(result.summary).toContain("No pending");
  });

  test("excludes completed tasks from prioritization", () => {
    const tasks = [
      makeTask({ id: 1, status: "COMPLETED" }),
      makeTask({ id: 2, status: "PENDING" }),
    ];
    const result = prioritizeTasks(tasks);
    expect(result.prioritized).toHaveLength(1);
    expect(result.prioritized[0].taskId).toBe(2);
  });

  test("orders tasks by descending AI score", () => {
    const tasks = [
      makeTask({ id: 1, priority: "LOW", dueDate: futureDate(30) }),
      makeTask({ id: 2, priority: "HIGH", dueDate: futureDate(1) }),
      makeTask({ id: 3, priority: "MEDIUM", dueDate: futureDate(7) }),
    ];
    const result = prioritizeTasks(tasks);
    const scores = result.prioritized.map(t => t.aiScore);
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1]);
    expect(scores[1]).toBeGreaterThanOrEqual(scores[2]);
  });

  test("suggestedOrder starts at 1 and increments", () => {
    const tasks = [
      makeTask({ id: 1 }),
      makeTask({ id: 2 }),
      makeTask({ id: 3 }),
    ];
    const result = prioritizeTasks(tasks);
    result.prioritized.forEach((t, i) => {
      expect(t.suggestedOrder).toBe(i + 1);
    });
  });

  test("summary mentions the top task title", () => {
    const tasks = [
      makeTask({ id: 1, title: "Most Important Task", priority: "HIGH", dueDate: futureDate(1) }),
      makeTask({ id: 2, title: "Less Important", priority: "LOW" }),
    ];
    const result = prioritizeTasks(tasks);
    expect(result.summary).toContain("Most Important Task");
  });

  test("result includes generatedAt ISO timestamp", () => {
    const result = prioritizeTasks([makeTask()]);
    expect(() => new Date(result.generatedAt)).not.toThrow();
    expect(new Date(result.generatedAt).getFullYear()).toBe(new Date().getFullYear());
  });

  test("each result has required fields", () => {
    const result = prioritizeTasks([makeTask({ id: 1, title: "Task A" })]);
    const item = result.prioritized[0];
    expect(typeof item.taskId).toBe("number");
    expect(typeof item.aiScore).toBe("number");
    expect(typeof item.aiReason).toBe("string");
    expect(typeof item.suggestedOrder).toBe("number");
    expect(typeof item.title).toBe("string");
  });
});


// prioritizeTasks: EDGE CASES
describe("AI Engine — prioritizeTasks (Edge Cases)", () => {

  test("handles single task", () => {
    const result = prioritizeTasks([makeTask({ id: 1, title: "Solo Task" })]);
    expect(result.prioritized).toHaveLength(1);
    expect(result.prioritized[0].suggestedOrder).toBe(1);
  });

  test("handles all tasks completed", () => {
    const tasks = [
      makeTask({ id: 1, status: "COMPLETED" }),
      makeTask({ id: 2, status: "COMPLETED" }),
    ];
    const result = prioritizeTasks(tasks);
    expect(result.prioritized).toHaveLength(0);
    expect(result.summary).toContain("No pending");
  });

  test("handles task with empty title", () => {
    const task = makeTask({ title: "" });
    expect(() => prioritizeTasks([task])).not.toThrow();
  });

  test("handles 100 tasks without throwing", () => {
    const tasks = Array.from({ length: 100 }, (_, i) =>
      makeTask({ id: i + 1, title: `Task ${i + 1}` })
    );
    expect(() => prioritizeTasks(tasks)).not.toThrow();
    const result = prioritizeTasks(tasks);
    expect(result.prioritized).toHaveLength(100);
  });

  test("handles tasks with identical scores consistently", () => {
    const tasks = [
      makeTask({ id: 1, priority: "MEDIUM", dueDate: null }),
      makeTask({ id: 2, priority: "MEDIUM", dueDate: null }),
      makeTask({ id: 3, priority: "MEDIUM", dueDate: null }),
    ];
    const result = prioritizeTasks(tasks);
    expect(result.prioritized).toHaveLength(3);
    // All get unique suggestedOrder values
    const orders = result.prioritized.map(t => t.suggestedOrder);
    expect(new Set(orders).size).toBe(3);
  });

  test("IN_PROGRESS tasks are included in prioritization", () => {
    const tasks = [
      makeTask({ id: 1, status: "IN_PROGRESS" }),
      makeTask({ id: 2, status: "PENDING" }),
    ];
    const result = prioritizeTasks(tasks);
    expect(result.prioritized).toHaveLength(2);
  });
});

// optimizeSchedule: VALID INPUTS

describe("AI Engine — optimizeSchedule (Valid Inputs)", () => {

  const settings = makeSettings();

  test("returns empty blocks when no pending tasks", () => {
    const result = optimizeSchedule([], [], settings);
    expect(result.blocks).toHaveLength(0);
    expect(result.totalStudyMin).toBe(0);
  });

  test("generates focus blocks for pending tasks", () => {
    const tasks = [
      makeTask({ id: 1, status: "PENDING", estimatedMins: 25 }),
    ];
    const result = optimizeSchedule(tasks, [], settings);
    const focusBlocks = result.blocks.filter(b => b.blockType === "focus");
    expect(focusBlocks.length).toBeGreaterThan(0);
  });

  test("excludes completed tasks from schedule", () => {
    const tasks = [
      makeTask({ id: 1, status: "COMPLETED" }),
      makeTask({ id: 2, status: "PENDING", estimatedMins: 25 }),
    ];
    const result = optimizeSchedule(tasks, [], settings);
    const taskIds = result.blocks.filter(b => b.taskId).map(b => b.taskId);
    expect(taskIds).not.toContain(1);
  });

  test("no block exceeds preferredEndHour", () => {
    const tasks = [makeTask({ id: 1, estimatedMins: 30 })];
    const result = optimizeSchedule(tasks, [], settings);
    result.blocks.forEach(block => {
      expect(block.endHour).toBeLessThanOrEqual(settings.preferredEndHour);
    });
  });

  test("totalStudyMin equals sum of focus block durations", () => {
    const tasks = [
      makeTask({ id: 1, estimatedMins: 25 }),
      makeTask({ id: 2, estimatedMins: 25 }),
    ];
    const result = optimizeSchedule(tasks, [], settings);
    const focusTotal = result.blocks
      .filter(b => b.blockType === "focus")
      .reduce((sum, b) => sum + b.durationMin, 0);
    expect(result.totalStudyMin).toBe(focusTotal);
  });

  test("result includes peakWindow string", () => {
    const result = optimizeSchedule([], [], settings);
    expect(typeof result.peakWindow).toBe("string");
    expect(result.peakWindow.length).toBeGreaterThan(0);
  });

  test("result includes summary string", () => {
    const result = optimizeSchedule([], [], settings);
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
  });

  test("uses session history to compute peak window", () => {
    const sessions = [
      makeSession({ startedAt: new Date(new Date().setHours(20, 0, 0, 0)), focusScore: 95 }),
      makeSession({ startedAt: new Date(new Date().setHours(20, 0, 0, 0)), focusScore: 90 }),
    ];
    const result = optimizeSchedule([], sessions, settings);
    expect(result.peakWindow).toContain("20");
  });
});


// optimizeSchedule: EDGE CASES

describe("AI Engine — optimizeSchedule (Edge Cases)", () => {

  test("handles sessions with null focusScore", () => {
    const sessions = [makeSession({ focusScore: null })];
    expect(() => optimizeSchedule([], sessions, makeSettings())).not.toThrow();
  });

  test("handles 50 tasks without throwing", () => {
    const tasks = Array.from({ length: 50 }, (_, i) =>
      makeTask({ id: i + 1, estimatedMins: 25 })
    );
    expect(() => optimizeSchedule(tasks, [], makeSettings())).not.toThrow();
  });

  test("handles preferredStartHour equal to preferredEndHour", () => {
    const settings = makeSettings({ preferredStartHour: 22, preferredEndHour: 22 });
    const tasks = [makeTask({ id: 1 })];
    expect(() => optimizeSchedule(tasks, [], settings)).not.toThrow();
  });

  test("handles task with no estimatedMins", () => {
    const task = makeTask({ estimatedMins: null });
    expect(() => optimizeSchedule([task], [], makeSettings())).not.toThrow();
  });

  test("handles future target date correctly", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tasks = [makeTask({ id: 1, estimatedMins: 25 })];
    expect(() => optimizeSchedule(tasks, [], makeSettings(), tomorrow)).not.toThrow();
  });

  test("inserts break blocks between focus blocks", () => {
    const tasks = [
      makeTask({ id: 1, estimatedMins: 25 }),
      makeTask({ id: 2, estimatedMins: 25 }),
    ];
    const result = optimizeSchedule(tasks, [], makeSettings());
    const hasBreak = result.blocks.some(b => b.blockType === "break");
    expect(hasBreak).toBe(true);
  });
});


// /api/ai/prioritize: API TESTS


describe("API — /api/ai/prioritize", () => {

  it("returns 401 without session cookie", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  itAuth("returns 200 with valid session", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, {
      method: "POST",
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
  });

  itAuth("response contains prioritized array", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    expect(Array.isArray(data.prioritized)).toBe(true);
  });

  itAuth("response contains summary string", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    expect(typeof data.summary).toBe("string");
  });

  itAuth("response contains generatedAt timestamp", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    expect(typeof data.generatedAt).toBe("string");
    expect(() => new Date(data.generatedAt)).not.toThrow();
  });

  itAuth("each prioritized item has required fields", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    data.prioritized.forEach((item: any) => {
      expect(typeof item.taskId).toBe("number");
      expect(typeof item.aiScore).toBe("number");
      expect(typeof item.aiReason).toBe("string");
      expect(typeof item.suggestedOrder).toBe("number");
    });
  });

  itAuth("aiScore is always between 0 and 100", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    data.prioritized.forEach((item: any) => {
      expect(item.aiScore).toBeGreaterThanOrEqual(0);
      expect(item.aiScore).toBeLessThanOrEqual(100);
    });
  });

  itAuth("consecutive calls return consistent ordering (cached)", async () => {
    const r1 = await fetch(`${BASE}/api/ai/prioritize`, {
      method: "POST", headers: authHeaders(),
    });
    const r2 = await fetch(`${BASE}/api/ai/prioritize`, {
      method: "POST", headers: authHeaders(),
    });
    const d1 = await r1.json();
    const d2 = await r2.json();
    const ids1 = d1.prioritized.map((t: any) => t.taskId);
    const ids2 = d2.prioritized.map((t: any) => t.taskId);
    expect(ids1).toEqual(ids2);
  });
});


// /api/ai/schedule: API TESTS
describe("API — /api/ai/schedule", () => {

  it("returns 401 without session cookie", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  itAuth("returns 200 with valid session", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
  });

  itAuth("response contains blocks array", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    expect(Array.isArray(data.blocks)).toBe(true);
  });

  itAuth("response contains totalStudyMin number", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    expect(typeof data.totalStudyMin).toBe("number");
    expect(data.totalStudyMin).toBeGreaterThanOrEqual(0);
  });

  itAuth("response contains peakWindow string", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    expect(typeof data.peakWindow).toBe("string");
  });

  itAuth("accepts valid targetDate input", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ targetDate: tomorrow.toISOString().slice(0, 10) }),
    });
    expect(res.status).toBe(200);
  });

  itAuth("handles invalid targetDate gracefully", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ targetDate: "not-a-date" }),
    });
    expect([200, 400]).toContain(res.status);
  });

  itAuth("no block exceeds 24 hours", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    data.blocks.forEach((b: any) => {
      expect(b.endHour).toBeLessThanOrEqual(24);
    });
  });

  itAuth("handles empty body gracefully", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: authHeaders(),
      body: "{}",
    });
    expect(res.status).toBe(200);
  });
});


// /api/ai/chat: API TESTS

describe("API — /api/ai/chat", () => {

  it("returns 401 without session cookie", async () => {
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });
    expect(res.status).toBe(401);
  });

  itAuth("returns response for valid message", async () => {
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message: "What tasks should I focus on today?", history: [] }),
    });
    expect([200, 503]).toContain(res.status); // 503 if Gemini unavailable
    if (res.status === 200) {
      const data = await res.json();
      expect(typeof data.response).toBe("string");
      expect(data.response.length).toBeGreaterThan(0);
    }
  });

  itAuth("handles empty message gracefully", async () => {
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message: "", history: [] }),
    });
    expect([200, 400, 503]).toContain(res.status);
  });

  itAuth("handles very long message", async () => {
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message: "A".repeat(5000), history: [] }),
    });
    expect([200, 400, 413, 503]).toContain(res.status);
  });

  itAuth("handles missing history field", async () => {
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message: "Hello" }),
    });
    expect([200, 400, 503]).toContain(res.status);
  });

  itAuth("handles XSS in message safely", async () => {
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message: "<script>alert('xss')</script>", history: [] }),
    });
    expect([200, 400, 503]).toContain(res.status);
    if (res.status === 200) {
      const data = await res.json();
      expect(data.response).not.toContain("<script>");
    }
  });

  itAuth("handles multi-turn conversation history", async () => {
    const history = [
      { role: "user", parts: [{ text: "I have 3 tasks due tomorrow" }] },
      { role: "model", parts: [{ text: "I can help you prioritize those tasks." }] },
    ];
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message: "Which should I do first?", history }),
    });
    expect([200, 400, 503]).toContain(res.status);
  });
});
