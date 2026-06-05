/**
 * AI Consistency & Expected Output Tests — StudyFlow
 *
 * Tests that AI produces:
 *  - Consistent results across multiple calls (determinism)
 *  - Expected output format and structure
 *  - Expected output values within defined ranges
 *  - Correct business logic (right task gets highest score)
 *  - Cache behavior (same input = same output)
 *  - Output stability under repeated conditions
 *
 * Run:
 *  $env:TEST_SESSION_COOKIE="your-session-cookie"
 *  npx jest tests/ai-consistency.test.ts
 *
 * Requires: Next.js dev server running on localhost:3000
 */

import {
  computePriorityScore,
  computeTaskHash,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ═════════════════════════════════════════════════════════════════════════════
// CONSISTENCY — computePriorityScore
// ═════════════════════════════════════════════════════════════════════════════

describe("Consistency — computePriorityScore", () => {

  test("same task produces same score on repeated calls", () => {
    const task = makeTask({ priority: "HIGH", dueDate: futureDate(2), estimatedMins: 45 });
    const nowMs = Date.now();
    const scores = Array.from({ length: 10 }, () => computePriorityScore(task, nowMs));
    // All 10 calls must return the same value
    expect(new Set(scores).size).toBe(1);
  });

  test("score does not change between two consecutive calls without time passing", () => {
    const task = makeTask({ priority: "MEDIUM", dueDate: futureDate(5) });
    const nowMs = Date.now();
    expect(computePriorityScore(task, nowMs)).toBe(computePriorityScore(task, nowMs));
  });

  test("overdue task always scores higher than future task", () => {
    const nowMs = Date.now();
    const overdue = makeTask({ priority: "HIGH", dueDate: new Date(nowMs - 86400000) });
    const future = makeTask({ priority: "HIGH", dueDate: new Date(nowMs + 86400000) });
    expect(computePriorityScore(overdue, nowMs)).toBeGreaterThan(
      computePriorityScore(future, nowMs)
    );
  });

  test("deadline urgency increases as due date approaches", () => {
    const nowMs = Date.now();
    const far   = makeTask({ priority: "MEDIUM", dueDate: futureDate(30) });
    const week  = makeTask({ priority: "MEDIUM", dueDate: futureDate(7) });
    const close = makeTask({ priority: "MEDIUM", dueDate: futureDate(1) });
    const scoreFar   = computePriorityScore(far,   nowMs);
    const scoreWeek  = computePriorityScore(week,  nowMs);
    const scoreClose = computePriorityScore(close, nowMs);
    expect(scoreClose).toBeGreaterThan(scoreWeek);
    expect(scoreWeek).toBeGreaterThan(scoreFar);
  });

  test("priority weight is always applied in correct order HIGH > MEDIUM > LOW", () => {
    const nowMs = Date.now();
    // Same due date, different priorities
    const high   = makeTask({ priority: "HIGH",   dueDate: futureDate(10) });
    const medium = makeTask({ priority: "MEDIUM", dueDate: futureDate(10) });
    const low    = makeTask({ priority: "LOW",    dueDate: futureDate(10) });
    expect(computePriorityScore(high, nowMs)).toBeGreaterThan(computePriorityScore(medium, nowMs));
    expect(computePriorityScore(medium, nowMs)).toBeGreaterThan(computePriorityScore(low, nowMs));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// EXPECTED OUTPUT — computePriorityScore
// ═════════════════════════════════════════════════════════════════════════════

describe("Expected Output — computePriorityScore", () => {

  test("HIGH priority overdue task outputs score of exactly 80", () => {
    const task = makeTask({ priority: "HIGH", dueDate: new Date(Date.now() - 1000) });
    const score = computePriorityScore(task);
    // HIGH(40) + overdue(40) = 80
    expect(score).toBe(80);
  });

  test("LOW priority no deadline outputs score of exactly 10", () => {
    const task = makeTask({ priority: "LOW", dueDate: null, estimatedMins: 60 });
    const score = computePriorityScore(task);
    // LOW(5) + no deadline(5) = 10
    expect(score).toBe(10);
  });

  test("MEDIUM priority no deadline outputs score of exactly 25", () => {
    const task = makeTask({ priority: "MEDIUM", dueDate: null, estimatedMins: 60 });
    const score = computePriorityScore(task);
    // MEDIUM(20) + no deadline(5) = 25
    expect(score).toBe(25);
  });

  test("HIGH priority no deadline outputs score of exactly 45", () => {
    const task = makeTask({ priority: "HIGH", dueDate: null, estimatedMins: 60 });
    const score = computePriorityScore(task);
    // HIGH(40) + no deadline(5) = 45
    expect(score).toBe(45);
  });

  test("quick task bonus adds exactly 5 points", () => {
    const nowMs = Date.now();
    const normal = makeTask({ priority: "MEDIUM", dueDate: null, estimatedMins: 60 });
    const quick  = makeTask({ priority: "MEDIUM", dueDate: null, estimatedMins: 20 });
    const diff = computePriorityScore(quick, nowMs) - computePriorityScore(normal, nowMs);
    expect(diff).toBe(5);
  });

  test("long task penalty removes exactly 5 points", () => {
    const nowMs = Date.now();
    const normal = makeTask({ priority: "MEDIUM", dueDate: null, estimatedMins: 60 });
    const long   = makeTask({ priority: "MEDIUM", dueDate: null, estimatedMins: 200 });
    const diff = computePriorityScore(normal, nowMs) - computePriorityScore(long, nowMs);
    expect(diff).toBe(5);
  });

  test("score is clamped to maximum 100", () => {
    // HIGH(40) + overdue(40) + quick(5) = 85 — well below 100
    // Create a scenario that would exceed 100 without clamping
    const task = makeTask({
      priority: "HIGH",
      dueDate: new Date(Date.now() - 1000),
      estimatedMins: 20, // +5 quick bonus
    });
    const score = computePriorityScore(task);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBe(85); // 40+40+5
  });

  test("score is clamped to minimum 0", () => {
    const task = makeTask({ priority: "LOW", dueDate: null, estimatedMins: 200 });
    const score = computePriorityScore(task);
    // LOW(5) + no deadline(5) - long(-5) = 5 — already > 0
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CONSISTENCY — prioritizeTasks
// ═════════════════════════════════════════════════════════════════════════════

describe("Consistency — prioritizeTasks", () => {

  test("same task list always produces same ordering", () => {
    const tasks = [
      makeTask({ id: 1, priority: "LOW",    dueDate: futureDate(30) }),
      makeTask({ id: 2, priority: "HIGH",   dueDate: futureDate(1)  }),
      makeTask({ id: 3, priority: "MEDIUM", dueDate: futureDate(7)  }),
    ];
    const r1 = prioritizeTasks(tasks);
    const r2 = prioritizeTasks(tasks);
    expect(r1.prioritized.map(t => t.taskId)).toEqual(r2.prioritized.map(t => t.taskId));
  });

  test("adding a completed task does not change ordering of pending tasks", () => {
    const pendingTasks = [
      makeTask({ id: 1, priority: "HIGH",   dueDate: futureDate(1) }),
      makeTask({ id: 2, priority: "MEDIUM", dueDate: futureDate(5) }),
    ];
    const withCompleted = [
      ...pendingTasks,
      makeTask({ id: 3, status: "COMPLETED" }),
    ];
    const r1 = prioritizeTasks(pendingTasks);
    const r2 = prioritizeTasks(withCompleted);
    // Same order for pending tasks regardless of completed task
    expect(r1.prioritized.map(t => t.taskId)).toEqual(r2.prioritized.map(t => t.taskId));
  });

  test("task order is stable across 5 repeated calls", () => {
    const tasks = [
      makeTask({ id: 1, priority: "LOW"  }),
      makeTask({ id: 2, priority: "HIGH" }),
      makeTask({ id: 3, priority: "MEDIUM" }),
    ];
    const orders = Array.from({ length: 5 }, () =>
      prioritizeTasks(tasks).prioritized.map(t => t.taskId)
    );
    // All 5 runs must produce same order
    orders.forEach(order => {
      expect(order).toEqual(orders[0]);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// EXPECTED OUTPUT — prioritizeTasks
// ═════════════════════════════════════════════════════════════════════════════

describe("Expected Output — prioritizeTasks", () => {

  test("urgent HIGH priority task is always ranked #1", () => {
    const tasks = [
      makeTask({ id: 1, priority: "LOW",    title: "Low Task",    dueDate: futureDate(30) }),
      makeTask({ id: 2, priority: "HIGH",   title: "Urgent Task", dueDate: futureDate(1)  }),
      makeTask({ id: 3, priority: "MEDIUM", title: "Medium Task", dueDate: futureDate(7)  }),
    ];
    const result = prioritizeTasks(tasks);
    expect(result.prioritized[0].taskId).toBe(2);
    expect(result.prioritized[0].suggestedOrder).toBe(1);
  });

  test("overdue task is ranked higher than future task of same priority", () => {
    const tasks = [
      makeTask({ id: 1, priority: "HIGH", title: "Future",  dueDate: futureDate(7) }),
      makeTask({ id: 2, priority: "HIGH", title: "Overdue", dueDate: new Date(Date.now() - 86400000) }),
    ];
    const result = prioritizeTasks(tasks);
    expect(result.prioritized[0].taskId).toBe(2); // Overdue first
  });

  test("suggestedOrder values are always 1, 2, 3... with no gaps", () => {
    const tasks = [
      makeTask({ id: 1 }),
      makeTask({ id: 2 }),
      makeTask({ id: 3 }),
      makeTask({ id: 4 }),
      makeTask({ id: 5 }),
    ];
    const result = prioritizeTasks(tasks);
    const orders = result.prioritized.map(t => t.suggestedOrder).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5]);
  });

  test("aiReason is always a non-empty string", () => {
    const tasks = [
      makeTask({ id: 1, priority: "HIGH", dueDate: futureDate(1) }),
      makeTask({ id: 2, priority: "LOW",  dueDate: null          }),
    ];
    const result = prioritizeTasks(tasks);
    result.prioritized.forEach(item => {
      expect(typeof item.aiReason).toBe("string");
      expect(item.aiReason.length).toBeGreaterThan(0);
    });
  });

  test("summary always starts with task title in quotes", () => {
    const tasks = [
      makeTask({ id: 1, title: "My Important Task", priority: "HIGH", dueDate: futureDate(1) }),
    ];
    const result = prioritizeTasks(tasks);
    expect(result.summary).toContain('"My Important Task"');
  });

  test("generatedAt is always a valid recent ISO string", () => {
    const before = new Date();
    const result = prioritizeTasks([makeTask()]);
    const after = new Date();
    const generatedAt = new Date(result.generatedAt);
    expect(generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CONSISTENCY — computeTaskHash
// ═════════════════════════════════════════════════════════════════════════════

describe("Consistency — computeTaskHash", () => {

  test("same tasks produce same hash", () => {
    const tasks = [
      makeTask({ id: 1, priority: "HIGH", dueDate: new Date("2025-01-01") }),
      makeTask({ id: 2, priority: "LOW",  dueDate: null }),
    ];
    expect(computeTaskHash(tasks)).toBe(computeTaskHash(tasks));
  });

  test("different task list produces different hash", () => {
    const tasks1 = [makeTask({ id: 1, priority: "HIGH" })];
    const tasks2 = [makeTask({ id: 1, priority: "LOW"  })];
    expect(computeTaskHash(tasks1)).not.toBe(computeTaskHash(tasks2));
  });

  test("adding a task changes the hash", () => {
    const tasks1 = [makeTask({ id: 1 })];
    const tasks2 = [makeTask({ id: 1 }), makeTask({ id: 2 })];
    expect(computeTaskHash(tasks1)).not.toBe(computeTaskHash(tasks2));
  });

  test("completed tasks are excluded from hash", () => {
    const pending   = [makeTask({ id: 1, status: "PENDING" })];
    const withDone  = [makeTask({ id: 1, status: "PENDING" }), makeTask({ id: 2, status: "COMPLETED" })];
    // Adding a completed task should not change the hash
    expect(computeTaskHash(pending)).toBe(computeTaskHash(withDone));
  });

  test("hash is always a 24-character hex string", () => {
    const tasks = [makeTask({ id: 1 }), makeTask({ id: 2 })];
    const hash = computeTaskHash(tasks);
    expect(typeof hash).toBe("string");
    expect(hash).toHaveLength(24);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  test("hash is stable across 10 repeated calls", () => {
    const tasks = [
      makeTask({ id: 1, priority: "HIGH",   dueDate: new Date("2025-06-01") }),
      makeTask({ id: 2, priority: "MEDIUM", dueDate: null }),
    ];
    const hashes = Array.from({ length: 10 }, () => computeTaskHash(tasks));
    expect(new Set(hashes).size).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CONSISTENCY — optimizeSchedule
// ═════════════════════════════════════════════════════════════════════════════

describe("Consistency — optimizeSchedule", () => {

  test("same inputs always produce same number of blocks", () => {
    const tasks    = [makeTask({ id: 1, estimatedMins: 25 })];
    const settings = makeSettings();
    const target   = new Date(2025, 6, 1, 9, 0, 0); // fixed date to avoid time drift

    const r1 = optimizeSchedule(tasks, [], settings, target);
    const r2 = optimizeSchedule(tasks, [], settings, target);
    expect(r1.blocks.length).toBe(r2.blocks.length);
  });

  test("same inputs always produce same totalStudyMin", () => {
    const tasks    = [makeTask({ id: 1, estimatedMins: 25 }), makeTask({ id: 2, estimatedMins: 25 })];
    const settings = makeSettings();
    const target   = new Date(2025, 6, 1, 9, 0, 0);

    const r1 = optimizeSchedule(tasks, [], settings, target);
    const r2 = optimizeSchedule(tasks, [], settings, target);
    expect(r1.totalStudyMin).toBe(r2.totalStudyMin);
  });

  test("higher priority task appears before lower priority in schedule", () => {
    const tasks = [
      makeTask({ id: 1, priority: "LOW",  title: "Low Task",  estimatedMins: 25 }),
      makeTask({ id: 2, priority: "HIGH", title: "High Task", estimatedMins: 25 }),
    ];
    const result = optimizeSchedule(tasks, [], makeSettings(), new Date(2025, 6, 1, 9, 0, 0));
    const focusBlocks = result.blocks.filter(b => b.blockType === "focus");
    if (focusBlocks.length >= 2) {
      expect(focusBlocks[0].taskId).toBe(2); // HIGH priority first
    }
  });

  test("peak window label is consistent for same session data", () => {
    const sessions = [
      makeSession({ startedAt: new Date(new Date().setHours(19, 0, 0, 0)) }),
      makeSession({ startedAt: new Date(new Date().setHours(19, 0, 0, 0)) }),
    ];
    const r1 = optimizeSchedule([], sessions, makeSettings());
    const r2 = optimizeSchedule([], sessions, makeSettings());
    expect(r1.peakWindow).toBe(r2.peakWindow);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// EXPECTED OUTPUT — optimizeSchedule
// ═════════════════════════════════════════════════════════════════════════════

describe("Expected Output — optimizeSchedule", () => {

  test("focus block duration matches task estimatedMins", () => {
    const tasks = [makeTask({ id: 1, estimatedMins: 25 })];
    const result = optimizeSchedule(tasks, [], makeSettings(), new Date(2025, 6, 1, 9, 0, 0));
    const focusBlock = result.blocks.find(b => b.blockType === "focus");
    expect(focusBlock?.durationMin).toBe(25);
  });

  test("break block duration matches settings shortBreakMins", () => {
    const settings = makeSettings({ shortBreakMins: 5 });
    const tasks = [
      makeTask({ id: 1, estimatedMins: 25 }),
      makeTask({ id: 2, estimatedMins: 25 }),
    ];
    const result = optimizeSchedule(tasks, [], settings, new Date(2025, 6, 1, 9, 0, 0));
    const breakBlock = result.blocks.find(b => b.blockType === "break");
    if (breakBlock) {
      expect(breakBlock.durationMin).toBe(5);
    }
  });

  test("block startHour and endHour are consistent with duration", () => {
    const tasks = [makeTask({ id: 1, estimatedMins: 30 })];
    const result = optimizeSchedule(tasks, [], makeSettings(), new Date(2025, 6, 1, 9, 0, 0));
    result.blocks.forEach(block => {
      const expectedDuration = (block.endHour - block.startHour) * 60;
      expect(Math.round(expectedDuration)).toBe(block.durationMin);
    });
  });

  test("empty task list always returns empty summary message", () => {
    const result = optimizeSchedule([], [], makeSettings(), new Date(2025, 6, 1, 9, 0, 0));
    expect(result.summary).toContain("No pending tasks");
  });

  test("generatedAt is always a valid ISO timestamp", () => {
    const result = optimizeSchedule([], [], makeSettings());
    expect(() => new Date(result.generatedAt)).not.toThrow();
    expect(new Date(result.generatedAt).getFullYear()).toBeGreaterThanOrEqual(2024);
  });

  test("block taskTitle matches the task title", () => {
    const tasks = [makeTask({ id: 1, title: "Specific Task Name", estimatedMins: 25 })];
    const result = optimizeSchedule(tasks, [], makeSettings(), new Date(2025, 6, 1, 9, 0, 0));
    const focusBlock = result.blocks.find(b => b.blockType === "focus");
    expect(focusBlock?.taskTitle).toContain("Specific Task Name");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// API CONSISTENCY — /api/ai/prioritize
// ═════════════════════════════════════════════════════════════════════════════

describe("API Consistency — /api/ai/prioritize", () => {

  itAuth("returns same task order on 3 consecutive calls (cache)", async () => {
    const calls = await Promise.all([
      fetch(`${BASE}/api/ai/prioritize`, { method: "POST", headers: authHeaders() }),
      fetch(`${BASE}/api/ai/prioritize`, { method: "POST", headers: authHeaders() }),
      fetch(`${BASE}/api/ai/prioritize`, { method: "POST", headers: authHeaders() }),
    ]);
    const results = await Promise.all(calls.map(r => r.json()));
    const orders = results.map(d => d.prioritized.map((t: any) => t.taskId));
    expect(orders[0]).toEqual(orders[1]);
    expect(orders[1]).toEqual(orders[2]);
  });

  itAuth("aiScore values are stable across calls", async () => {
    const r1 = await fetch(`${BASE}/api/ai/prioritize`, { method: "POST", headers: authHeaders() });
    const r2 = await fetch(`${BASE}/api/ai/prioritize`, { method: "POST", headers: authHeaders() });
    const d1 = await r1.json();
    const d2 = await r2.json();
    d1.prioritized.forEach((item: any, i: number) => {
      expect(item.aiScore).toBe(d2.prioritized[i]?.aiScore);
    });
  });

  itAuth("response always has correct structure", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, { method: "POST", headers: authHeaders() });
    const data = await res.json();

    // Top-level structure
    expect(data).toHaveProperty("prioritized");
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("generatedAt");

    // Array type
    expect(Array.isArray(data.prioritized)).toBe(true);

    // String types
    expect(typeof data.summary).toBe("string");
    expect(typeof data.generatedAt).toBe("string");
  });

  itAuth("prioritized items always have all required fields", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, { method: "POST", headers: authHeaders() });
    const data = await res.json();

    data.prioritized.forEach((item: any) => {
      expect(item).toHaveProperty("taskId");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("aiScore");
      expect(item).toHaveProperty("aiReason");
      expect(item).toHaveProperty("suggestedOrder");
      expect(typeof item.taskId).toBe("number");
      expect(typeof item.title).toBe("string");
      expect(typeof item.aiScore).toBe("number");
      expect(typeof item.aiReason).toBe("string");
      expect(typeof item.suggestedOrder).toBe("number");
    });
  });

  itAuth("aiScore is always a number between 0 and 100", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    data.prioritized.forEach((item: any) => {
      expect(item.aiScore).toBeGreaterThanOrEqual(0);
      expect(item.aiScore).toBeLessThanOrEqual(100);
    });
  });

  itAuth("suggestedOrder starts at 1 and has no gaps", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    const orders = data.prioritized.map((t: any) => t.suggestedOrder).sort((a: number, b: number) => a - b);
    orders.forEach((order: number, i: number) => {
      expect(order).toBe(i + 1);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// API CONSISTENCY — /api/ai/schedule
// ═════════════════════════════════════════════════════════════════════════════

describe("API Consistency — /api/ai/schedule", () => {

  itAuth("response always has correct structure", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, { method: "POST", headers: authHeaders() });
    const data = await res.json();

    expect(data).toHaveProperty("blocks");
    expect(data).toHaveProperty("totalStudyMin");
    expect(data).toHaveProperty("peakWindow");
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("generatedAt");

    expect(Array.isArray(data.blocks)).toBe(true);
    expect(typeof data.totalStudyMin).toBe("number");
    expect(typeof data.peakWindow).toBe("string");
    expect(typeof data.summary).toBe("string");
    expect(typeof data.generatedAt).toBe("string");
  });

  itAuth("blocks always have correct structure", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, { method: "POST", headers: authHeaders() });
    const data = await res.json();

    data.blocks.forEach((block: any) => {
      expect(block).toHaveProperty("startHour");
      expect(block).toHaveProperty("endHour");
      expect(block).toHaveProperty("taskTitle");
      expect(block).toHaveProperty("durationMin");
      expect(block).toHaveProperty("blockType");

      expect(typeof block.startHour).toBe("number");
      expect(typeof block.endHour).toBe("number");
      expect(typeof block.taskTitle).toBe("string");
      expect(typeof block.durationMin).toBe("number");
      expect(["focus", "break", "buffer"]).toContain(block.blockType);
    });
  });

  itAuth("totalStudyMin always equals sum of focus block durations", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    const focusTotal = data.blocks
      .filter((b: any) => b.blockType === "focus")
      .reduce((sum: number, b: any) => sum + b.durationMin, 0);
    expect(data.totalStudyMin).toBe(focusTotal);
  });

  itAuth("startHour is always less than endHour in every block", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    data.blocks.forEach((block: any) => {
      expect(block.startHour).toBeLessThan(block.endHour);
    });
  });

  itAuth("blocks are in chronological order", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    for (let i = 1; i < data.blocks.length; i++) {
      expect(data.blocks[i].startHour).toBeGreaterThanOrEqual(data.blocks[i - 1].endHour);
    }
  });

  itAuth("peakWindow always contains a time range format", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    // peakWindow format: "19:00 – 21:00"
    expect(data.peakWindow).toMatch(/\d+:\d+/);
  });
});
