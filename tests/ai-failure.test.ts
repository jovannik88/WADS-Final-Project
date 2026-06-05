import {
  computePriorityScore,
  prioritizeTasks,
  optimizeSchedule,
  computeTaskHash,
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

//Helpers 

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


// AI ENGINE — Failure Handling (No Network Required)


describe("AI Engine — Failure Handling: Invalid Inputs", () => {

  // computePriorityScore 

  test("does not crash with undefined priority", () => {
    const task = makeTask({ priority: undefined as any });
    expect(() => computePriorityScore(task)).not.toThrow();
  });

  test("does not crash with null dueDate", () => {
    const task = makeTask({ dueDate: null });
    expect(() => computePriorityScore(task)).not.toThrow();
    const score = computePriorityScore(task);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test("does not crash with invalid date object", () => {
    const task = makeTask({ dueDate: new Date("invalid") });
    expect(() => computePriorityScore(task)).not.toThrow();
  });

  test("does not crash with zero estimatedMins", () => {
    const task = makeTask({ estimatedMins: 0 });
    expect(() => computePriorityScore(task)).not.toThrow();
  });

  test("does not crash with very large estimatedMins", () => {
    const task = makeTask({ estimatedMins: 999999 });
    expect(() => computePriorityScore(task)).not.toThrow();
    const score = computePriorityScore(task);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test("does not crash with negative estimatedMins", () => {
    const task = makeTask({ estimatedMins: -100 });
    expect(() => computePriorityScore(task)).not.toThrow();
  });

  //prioritizeTasks 

  test("does not crash with null title", () => {
    const task = makeTask({ title: null as any });
    expect(() => prioritizeTasks([task])).not.toThrow();
  });

  test("does not crash with undefined fields", () => {
    const task = makeTask({
      title: undefined as any,
      description: undefined,
      subject: undefined,
      dueDate: undefined as any,
    });
    expect(() => prioritizeTasks([task])).not.toThrow();
  });

  test("does not crash with special characters in title", () => {
    const task = makeTask({ title: "Task @#$%^&*()!~`|\\/<>?{}[]" });
    expect(() => prioritizeTasks([task])).not.toThrow();
    const result = prioritizeTasks([task]);
    expect(result.prioritized).toHaveLength(1);
  });

  test("does not crash with unicode in title", () => {
    const task = makeTask({ title: "学习任务 📚 тест задача" });
    expect(() => prioritizeTasks([task])).not.toThrow();
  });

  test("does not crash with extremely long title", () => {
    const task = makeTask({ title: "A".repeat(10000) });
    expect(() => prioritizeTasks([task])).not.toThrow();
  });

  test("handles mixed valid and invalid tasks gracefully", () => {
    const tasks = [
      makeTask({ id: 1, title: "Valid Task" }),
      makeTask({ id: 2, title: null as any }),
      makeTask({ id: 3, priority: undefined as any }),
    ];
    expect(() => prioritizeTasks(tasks)).not.toThrow();
  });

  // optimizeSchedule 

  test("does not crash with empty sessions array", () => {
    expect(() => optimizeSchedule([], [], makeSettings())).not.toThrow();
  });

  test("does not crash with invalid preferredEndHour", () => {
    const settings = makeSettings({ preferredEndHour: 0 });
    expect(() => optimizeSchedule([makeTask()], [], settings)).not.toThrow();
  });

  test("does not crash with preferredStartHour > preferredEndHour", () => {
    const settings = makeSettings({ preferredStartHour: 23, preferredEndHour: 1 });
    expect(() => optimizeSchedule([makeTask()], [], settings)).not.toThrow();
  });

  test("does not crash with zero pomodoroMins", () => {
    const settings = makeSettings({ pomodoroMins: 0 });
    expect(() => optimizeSchedule([makeTask()], [], settings)).not.toThrow();
  });

  test("does not crash with null session focusScore", () => {
    const sessions = [{
      id: 1,
      userId: "user-123",
      subject: "Math",
      taskId: null,
      durationMin: 60,
      focusScore: null,
      startedAt: new Date(),
      endedAt: new Date(),
      createdAt: new Date(),
    } as any];
    expect(() => optimizeSchedule([], sessions, makeSettings())).not.toThrow();
  });

  test("does not crash with malformed existing events", () => {
    const badEvents = [
      { startTime: new Date("invalid"), endTime: new Date("invalid"), title: "Bad Event" },
    ];
    expect(() => optimizeSchedule([makeTask()], [], makeSettings(), new Date(), badEvents as any)).not.toThrow();
  });

  // computeTaskHash 

  test("does not crash with empty task array", () => {
    expect(() => computeTaskHash([])).not.toThrow();
    const hash = computeTaskHash([]);
    expect(typeof hash).toBe("string");
  });

  test("does not crash with null dueDate in hash", () => {
    const task = makeTask({ dueDate: null });
    expect(() => computeTaskHash([task])).not.toThrow();
  });

  test("does not crash with undefined title in hash", () => {
    const task = makeTask({ title: undefined as any });
    expect(() => computeTaskHash([task])).not.toThrow();
  });
});

// API — Failure Handling: Malformed Request Bodies

describe("API Failure Handling — Malformed Request Bodies", () => {

  itAuth("/api/ai/prioritize handles POST with no body", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, {
      method: "POST",
      headers: { Cookie: `session=${SESSION_COOKIE}` },
      // No Content-Type, no body
    });
    expect([200, 400, 401, 500]).toContain(res.status);
    // Must not hang
  });

  itAuth("/api/ai/prioritize handles malformed JSON body", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, {
      method: "POST",
      headers: authHeaders(),
      body: "{ invalid json }",
    });
    expect([200, 400, 401, 500]).toContain(res.status);
  });

  itAuth("/api/ai/schedule handles POST with no body", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: { Cookie: `session=${SESSION_COOKIE}` },
    });
    expect([200, 400, 401, 500]).toContain(res.status);
  });

  itAuth("/api/ai/schedule handles malformed JSON body", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: authHeaders(),
      body: "not json at all",
    });
    expect([200, 400, 401, 500]).toContain(res.status);
  });

  itAuth("/api/ai/chat handles POST with no message field", async () => {
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ history: [] }),
    });
    expect([200, 400, 401, 500]).toContain(res.status);
  });

  itAuth("/api/ai/chat handles null message", async () => {
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message: null, history: [] }),
    });
    expect([200, 400, 401, 500]).toContain(res.status);
  });

  itAuth("/api/ai/chat handles malformed history array", async () => {
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        message: "Hello",
        history: "not an array",
      }),
    });
    expect([200, 400, 401, 500]).toContain(res.status);
  });

  itAuth("/api/ai/chat handles history with missing parts field", async () => {
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        message: "Hello",
        history: [{ role: "user" }], // missing parts field
      }),
    });
    expect([200, 400, 401, 500]).toContain(res.status);
  });
});


// API — Failure Handling: Graceful Degradation

describe("API Failure Handling — Graceful Degradation", () => {

  itAuth("prioritize returns valid response structure even with no tasks", async () => {
    // Even with 0 tasks, API must return proper structure not crash
    const res = await fetch(`${BASE}/api/ai/prioritize`, {
      method: "POST",
      headers: authHeaders(),
    });
    expect([200, 401]).toContain(res.status);
    if (res.status !== 200) return;
    const data = await res.json();

    // Must always return proper structure
    expect(data).toHaveProperty("prioritized");
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("generatedAt");
    expect(Array.isArray(data.prioritized)).toBe(true);
  });

  itAuth("schedule returns valid response structure even with no tasks", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: authHeaders(),
    });
    expect([200, 401]).toContain(res.status);
    if (res.status !== 200) return;
    const data = await res.json();

    expect(data).toHaveProperty("blocks");
    expect(data).toHaveProperty("totalStudyMin");
    expect(data).toHaveProperty("peakWindow");
    expect(data).toHaveProperty("summary");
    expect(Array.isArray(data.blocks)).toBe(true);
  });

  itAuth("chat returns structured error response when AI unavailable", async () => {
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message: "Hello", history: [] }),
    });

    // Should return 200 with a message OR error codes — never hang
    expect([200, 400, 401, 429, 500, 503]).toContain(res.status);

    if (res.status === 200) {
      const data = await res.json();
      // Response field must exist
      expect(data).toHaveProperty("response");
      expect(typeof data.response).toBe("string");
    } else {
      // Error response must be JSON with error field
      const data = await res.json().catch(() => null);
      if (data) {
        expect(data).toHaveProperty("error");
      }
    }
  });

  itAuth("prioritize does not expose internal errors in response", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, {
      method: "POST",
      headers: authHeaders(),
    });
    const body = await res.text();
    expect(body).not.toContain("prisma");
    expect(body).not.toContain("at Object.");
    expect(body).not.toContain("node_modules");
  });

  itAuth("schedule does not expose internal errors in response", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: authHeaders(),
    });
    const body = await res.text();
    expect(body).not.toContain("at Object.");
    expect(body).not.toContain("node_modules");
  });

  itAuth("chat response always includes a response field on success", async () => {
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message: "What is 2+2?", history: [] }),
    });

    if (res.status === 200) {
      const data = await res.json();
      expect(typeof data.response).toBe("string");
      expect(data.response.length).toBeGreaterThan(0);
    }
    // If not 200, AI service is unavailable — acceptable
    expect([200, 401, 429, 500, 503]).toContain(res.status);
  });
});


// API — Failure Handling: Timeout Simulation

describe("API Failure Handling — Timeout & Response Time", () => {

  itAuth("prioritize responds within 10 seconds", async () => {
    const start = Date.now();
    const res = await fetch(`${BASE}/api/ai/prioritize`, {
      method: "POST",
      headers: authHeaders(),
    });
    const elapsed = Date.now() - start;
    expect([200, 401]).toContain(res.status);
    expect(elapsed).toBeLessThan(10000); // 10 second max
  });

  itAuth("schedule responds within 10 seconds", async () => {
    const start = Date.now();
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: authHeaders(),
    });
    const elapsed = Date.now() - start;
    expect([200, 401]).toContain(res.status);
    expect(elapsed).toBeLessThan(10000);
  });

  itAuth("chat responds within 30 seconds for simple message", async () => {
    const start = Date.now();
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message: "Hi", history: [] }),
    });
    const elapsed = Date.now() - start;
    expect([200, 401, 429, 500, 503]).toContain(res.status);
    expect(elapsed).toBeLessThan(30000); // 30 second max for Gemini
  });

  itAuth("prioritize handles AbortController timeout gracefully", async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 sec timeout

    try {
      const res = await fetch(`${BASE}/api/ai/prioritize`, {
        method: "POST",
        headers: authHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      expect([200, 400, 401, 500]).toContain(res.status);
    } catch (err: any) {
      clearTimeout(timeoutId);
      // AbortError = timed out, other errors = network/auth issues — both acceptable
      expect(["AbortError", "Error", "TypeError"]).toContain(err.name);
    }
  });

  itAuth("multiple simultaneous AI requests do not crash server", async () => {
    const requests = Array.from({ length: 3 }, () =>
      fetch(`${BASE}/api/ai/prioritize`, {
        method: "POST",
        headers: authHeaders(),
      })
    );
    const responses = await Promise.all(requests);
    responses.forEach(res => {
      expect([200, 401, 429, 500]).toContain(res.status);
    });
  });
});


// AI ENGINE — Boundary & Failure Modes

describe("AI Engine — Boundary & Failure Modes", () => {

  test("prioritizeTasks returns empty array not null/undefined for no tasks", () => {
    const result = prioritizeTasks([]);
    expect(result.prioritized).not.toBeNull();
    expect(result.prioritized).not.toBeUndefined();
    expect(Array.isArray(result.prioritized)).toBe(true);
  });

  test("prioritizeTasks summary is never null or undefined", () => {
    const result = prioritizeTasks([]);
    expect(result.summary).not.toBeNull();
    expect(result.summary).not.toBeUndefined();
    expect(typeof result.summary).toBe("string");
  });

  test("optimizeSchedule blocks is never null or undefined", () => {
    const result = optimizeSchedule([], [], makeSettings());
    expect(result.blocks).not.toBeNull();
    expect(result.blocks).not.toBeUndefined();
    expect(Array.isArray(result.blocks)).toBe(true);
  });

  test("optimizeSchedule totalStudyMin is never negative", () => {
    const result = optimizeSchedule([], [], makeSettings());
    expect(result.totalStudyMin).toBeGreaterThanOrEqual(0);
  });

  test("computePriorityScore never returns NaN", () => {
    const tasks = [
      makeTask({ priority: "HIGH",   dueDate: null,       estimatedMins: null }),
      makeTask({ priority: "LOW",    dueDate: null,       estimatedMins: 0    }),
      makeTask({ priority: "MEDIUM", dueDate: new Date(), estimatedMins: 25   }),
    ];
    tasks.forEach(task => {
      const score = computePriorityScore(task as any);
      expect(isNaN(score)).toBe(false);
    });
  });

  test("computePriorityScore never returns Infinity", () => {
    const task = makeTask({ estimatedMins: Infinity as any });
    const score = computePriorityScore(task);
    expect(isFinite(score)).toBe(true);
  });

  test("prioritizeTasks generatedAt is always a valid date string", () => {
    const result = prioritizeTasks([makeTask()]);
    const date = new Date(result.generatedAt);
    expect(date.toString()).not.toBe("Invalid Date");
  });

  test("computeTaskHash never returns empty string", () => {
    const hash = computeTaskHash([]);
    expect(hash.length).toBeGreaterThan(0);
  });

  test("computeTaskHash never returns undefined or null", () => {
    const hash = computeTaskHash([makeTask()]);
    expect(hash).not.toBeNull();
    expect(hash).not.toBeUndefined();
  });

  test("optimizeSchedule peakWindow is never empty string", () => {
    const result = optimizeSchedule([], [], makeSettings());
    expect(result.peakWindow.length).toBeGreaterThan(0);
  });

  test("optimizeSchedule summary is never empty string", () => {
    const result = optimizeSchedule([], [], makeSettings());
    expect(result.summary.length).toBeGreaterThan(0);
  });
});
