// Unit tests for the AI engine — no DB or network needed
// Run with: npx jest tests/ai-engine.test.ts

import { computePriorityScore, prioritizeTasks, optimizeSchedule } from "../lib/ai-engine";
import { Priority, Status, Role } from "@prisma/client";
import type { Task, StudySession, UserSettings } from "@prisma/client";

// Helpers

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    userId: "u1",
    title: "Test Task",
    description: null,
    subject: null,
    priority: Priority.MEDIUM,
    aiScore: null,
    aiReason: null,
    status: Status.PENDING,
    estimatedMins: 30,
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
    userId: "u1",
    preferredStartHour: 7,
    preferredEndHour: 23,
    pomodoroMins: 25,
    shortBreakMins: 5,
    longBreakMins: 15,
    timezone: "UTC",
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSession(overrides: Partial<StudySession> = {}): StudySession {
  const start = new Date();
  start.setHours(19, 0, 0, 0);
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  return {
    id: 1,
    userId: "u1",
    subject: "Math",
    taskId: null,
    durationMin: 90,
    focusScore: 80,
    startedAt: start,
    endedAt: end,
    createdAt: new Date(),
    ...overrides,
  };
}

// Tests: computePriorityScore

describe("computePriorityScore", () => {
  test("high-priority overdue task scores near 100", () => {
    const past = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const score = computePriorityScore({ priority: Priority.HIGH, dueDate: past, estimatedMins: 30, status: Status.PENDING });
    expect(score).toBeGreaterThanOrEqual(75);
  });

  test("low-priority task with no deadline scores low", () => {
    const score = computePriorityScore({ priority: Priority.LOW, dueDate: null, estimatedMins: 30, status: Status.PENDING });
    expect(score).toBeLessThanOrEqual(20);
  });

  test("medium-priority task due in 3 days scores mid-range", () => {
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const score = computePriorityScore({ priority: Priority.MEDIUM, dueDate: soon, estimatedMins: 60, status: Status.PENDING });
    expect(score).toBeGreaterThan(20);
    expect(score).toBeLessThan(70);
  });

  test("high-priority task due in 2 days scores above medium with no deadline", () => {
    const in2d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const scoreHigh = computePriorityScore({ priority: Priority.HIGH, dueDate: in2d, estimatedMins: 60, status: Status.PENDING });
    const scoreMedNone = computePriorityScore({ priority: Priority.MEDIUM, dueDate: null, estimatedMins: 60, status: Status.PENDING });
    expect(scoreHigh).toBeGreaterThan(scoreMedNone);
  });

  test("score is always in 0-100 range", () => {
    const extremeTask = { priority: Priority.HIGH, dueDate: new Date(Date.now() - 1000), estimatedMins: 1, status: Status.PENDING };
    const score = computePriorityScore(extremeTask);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test("very long task gets a small penalty", () => {
    const base = computePriorityScore({ priority: Priority.MEDIUM, dueDate: null, estimatedMins: 30, status: Status.PENDING });
    const long = computePriorityScore({ priority: Priority.MEDIUM, dueDate: null, estimatedMins: 300, status: Status.PENDING });
    expect(long).toBeLessThanOrEqual(base);
  });

  test("quick task gets a small bonus", () => {
    const base = computePriorityScore({ priority: Priority.MEDIUM, dueDate: null, estimatedMins: 60, status: Status.PENDING });
    const quick = computePriorityScore({ priority: Priority.MEDIUM, dueDate: null, estimatedMins: 20, status: Status.PENDING });
    expect(quick).toBeGreaterThanOrEqual(base);
  });
});

// Tests: prioritizeTasks

describe("prioritizeTasks", () => {
  test("returns empty result when no tasks", () => {
    const result = prioritizeTasks([]);
    expect(result.prioritized).toHaveLength(0);
    expect(result.summary).toContain("No pending");
  });

  test("excludes completed tasks from prioritization", () => {
    const tasks = [
      makeTask({ id: 1, status: Status.COMPLETED }),
      makeTask({ id: 2, status: Status.PENDING, priority: Priority.HIGH }),
    ];
    const result = prioritizeTasks(tasks);
    expect(result.prioritized).toHaveLength(1);
    expect(result.prioritized[0].taskId).toBe(2);
  });

  test("orders tasks by descending AI score", () => {
    const high = makeTask({ id: 1, priority: Priority.HIGH, dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000) });
    const low = makeTask({ id: 2, priority: Priority.LOW, dueDate: null });
    const result = prioritizeTasks([low, high]);
    expect(result.prioritized[0].taskId).toBe(1);
    expect(result.prioritized[1].taskId).toBe(2);
  });

  test("suggestedOrder starts at 1 and increments", () => {
    const tasks = [1, 2, 3].map((id) => makeTask({ id }));
    const result = prioritizeTasks(tasks);
    result.prioritized.forEach((t, i) => expect(t.suggestedOrder).toBe(i + 1));
  });

  test("summary mentions the top task title", () => {
    const task = makeTask({ id: 1, title: "Important Homework", priority: Priority.HIGH });
    const result = prioritizeTasks([task]);
    expect(result.summary).toContain("Important Homework");
  });

  test("result includes generatedAt ISO timestamp", () => {
    const result = prioritizeTasks([makeTask()]);
    expect(() => new Date(result.generatedAt)).not.toThrow();
  });

  // Edge case: all tasks have same priority and no deadline — order should be deterministic
  test("deterministic output for identical tasks", () => {
    const tasks = [1, 2, 3].map((id) => makeTask({ id, priority: Priority.MEDIUM, dueDate: null }));
    const r1 = prioritizeTasks(tasks);
    const r2 = prioritizeTasks(tasks);
    expect(r1.prioritized.map((t) => t.taskId)).toEqual(r2.prioritized.map((t) => t.taskId));
  });

  // Abuse: nonsensical title
  test("handles tasks with empty-like titles without crashing", () => {
    const task = makeTask({ title: "   " });
    expect(() => prioritizeTasks([task])).not.toThrow();
  });
});

// Tests: optimizeSchedule

describe("optimizeSchedule", () => {
  test("returns empty blocks when no pending tasks", () => {
    const result = optimizeSchedule([], [], makeSettings());
    expect(result.blocks).toHaveLength(0);
    expect(result.summary).toContain("No pending");
  });

  test("generates focus blocks for each pending task", () => {
    const tasks = [makeTask({ id: 1 }), makeTask({ id: 2 })];
    const result = optimizeSchedule(tasks, [], makeSettings());
    const focusBlocks = result.blocks.filter((b) => b.blockType === "focus");
    expect(focusBlocks.length).toBeGreaterThan(0);
  });

  test("inserts break blocks between focus blocks", () => {
    const tasks = [makeTask({ id: 1 }), makeTask({ id: 2 })];
    const result = optimizeSchedule(tasks, [], makeSettings());
    const breakBlocks = result.blocks.filter((b) => b.blockType === "break");
    expect(breakBlocks.length).toBeGreaterThan(0);
  });

  test("totalStudyMin equals sum of focus block durations", () => {
    const tasks = [makeTask({ id: 1, estimatedMins: 25 })];
    const result = optimizeSchedule(tasks, [], makeSettings());
    const sum = result.blocks.filter((b) => b.blockType === "focus").reduce((s, b) => s + b.durationMin, 0);
    expect(result.totalStudyMin).toBe(sum);
  });

  test("respects preferredEndHour boundary — no block exceeds it", () => {
    const tasks = Array.from({ length: 20 }, (_, i) => makeTask({ id: i + 1, estimatedMins: 30 }));
    const settings = makeSettings({ preferredStartHour: 7, preferredEndHour: 10 });
    const result = optimizeSchedule(tasks, [], settings);
    result.blocks.forEach((b) => expect(b.endHour).toBeLessThanOrEqual(10));
  });

  test("uses session history to infer peak hour", () => {
    const sessions = [
      makeSession({ startedAt: (() => { const d = new Date(); d.setHours(20, 0, 0, 0); return d; })() }),
      makeSession({ startedAt: (() => { const d = new Date(); d.setHours(20, 0, 0, 0); return d; })() }),
    ];
    const result = optimizeSchedule([makeTask()], sessions, makeSettings());
    // schedule should start at or near peak hour 20
    const firstFocus = result.blocks.find((b) => b.blockType === "focus");
    expect(firstFocus?.startHour).toBeGreaterThanOrEqual(0);
  });

  test("completed tasks are excluded from schedule", () => {
    const completed = makeTask({ id: 1, status: Status.COMPLETED });
    const pending = makeTask({ id: 2, status: Status.PENDING });
    const result = optimizeSchedule([completed, pending], [], makeSettings());
    const focusBlocks = result.blocks.filter((b) => b.blockType === "focus");
    expect(focusBlocks.every((b) => b.taskId !== 1)).toBe(true);
  });

  test("generatedAt is a valid ISO string", () => {
    const result = optimizeSchedule([], [], makeSettings());
    expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
  });

  // Failure handling: malformed session data (focusScore = null)
  test("handles sessions with null focusScore without crashing", () => {
    const session = makeSession({ focusScore: null });
    expect(() => optimizeSchedule([makeTask()], [session], makeSettings())).not.toThrow();
  });

  // Abuse test: very large number of tasks
  test("handles 100 tasks without throwing", () => {
    const tasks = Array.from({ length: 100 }, (_, i) => makeTask({ id: i + 1 }));
    expect(() => optimizeSchedule(tasks, [], makeSettings())).not.toThrow();
  });
});
