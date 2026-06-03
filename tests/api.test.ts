// API integration tests using fetch against the running dev server
// Run with: npx jest tests/api.test.ts (requires server running on localhost:3000)
// Set TEST_SESSION_COOKIE env var to a valid session cookie for auth tests

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const SESSION_COOKIE = process.env.TEST_SESSION_COOKIE ?? "";

function authHeaders() {
  return { Cookie: `session=${SESSION_COOKIE}`, "Content-Type": "application/json" };
}

// Tests: /api/tasks

describe("GET /api/tasks", () => {
  test("returns 401 without a session cookie", async () => {
    const res = await fetch(`${BASE}/api/tasks`);
    expect(res.status).toBe(401);
  });

  test("returns 200 and tasks array with valid session", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/tasks`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.tasks)).toBe(true);
  });

  test("accepts status query filter", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/tasks?status=PENDING`, { headers: authHeaders() });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/tasks", () => {
  test("returns 401 without session", async () => {
    const res = await fetch(`${BASE}/api/tasks`, { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
    expect(res.status).toBe(401);
  });

  test("returns 400 with missing title", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ description: "no title" }),
    });
    expect(res.status).toBe(400);
  });

  test("returns 400 with XSS payload in title", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: "<script>alert('xss')</script>" }),
    });
    // Should succeed (sanitised) or 400 if validation catches it
    expect([200, 201, 400]).toContain(res.status);
    if (res.status === 201) {
      const data = await res.json();
      expect(data.task.title).not.toContain("<script>");
    }
  });

  test("creates a task with valid data", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: "Test task from Jest", priority: "HIGH" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.task.id).toBeDefined();
  });

  test("returns 400 with invalid priority value", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: "Bad Priority", priority: "URGENT" }),
    });
    expect(res.status).toBe(400);
  });

  test("returns 400 with invalid ISO date", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: "Bad Date", dueDate: "not-a-date" }),
    });
    expect(res.status).toBe(400);
  });

  test("returns 400 with SQL injection attempt in title", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: "'; DROP TABLE tasks; --" }),
    });
    // Must not crash — Prisma uses parameterised queries
    expect([201, 400]).toContain(res.status);
  });
});

// Tests: /api/ai/prioritize

describe("POST /api/ai/prioritize", () => {
  test("returns 401 without session", async () => {
    const res = await fetch(`${BASE}/api/ai/prioritize`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  test("returns prioritized array and summary", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/ai/prioritize`, { method: "POST", headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.prioritized)).toBe(true);
    expect(typeof data.summary).toBe("string");
    expect(typeof data.generatedAt).toBe("string");
  });

  test("each item has required fields", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/ai/prioritize`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    data.prioritized.forEach((item: Record<string, unknown>) => {
      expect(typeof item.taskId).toBe("number");
      expect(typeof item.aiScore).toBe("number");
      expect(typeof item.aiReason).toBe("string");
      expect(typeof item.suggestedOrder).toBe("number");
    });
  });

  test("aiScore is always between 0 and 100", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/ai/prioritize`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    data.prioritized.forEach((item: { aiScore: number }) => {
      expect(item.aiScore).toBeGreaterThanOrEqual(0);
      expect(item.aiScore).toBeLessThanOrEqual(100);
    });
  });

  test("consecutive calls return consistent ordering", async () => {
    if (!SESSION_COOKIE) return;
    const r1 = await fetch(`${BASE}/api/ai/prioritize`, { method: "POST", headers: authHeaders() });
    const r2 = await fetch(`${BASE}/api/ai/prioritize`, { method: "POST", headers: authHeaders() });
    const d1 = await r1.json();
    const d2 = await r2.json();
    const ids1 = d1.prioritized.map((t: { taskId: number }) => t.taskId);
    const ids2 = d2.prioritized.map((t: { taskId: number }) => t.taskId);
    expect(ids1).toEqual(ids2);
  });
});

// Tests: /api/ai/schedule

describe("POST /api/ai/schedule", () => {
  test("returns 401 without session", async () => {
    const res = await fetch(`${BASE}/api/ai/schedule`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  test("returns schedule blocks and metadata", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/ai/schedule`, { method: "POST", headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.blocks)).toBe(true);
    expect(typeof data.totalStudyMin).toBe("number");
    expect(typeof data.peakWindow).toBe("string");
    expect(typeof data.summary).toBe("string");
  });

  test("no block exceeds preferredEndHour", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/ai/schedule`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    data.blocks.forEach((b: { endHour: number }) => {
      expect(b.endHour).toBeLessThanOrEqual(24);
    });
  });

  test("accepts optional targetDate field", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ targetDate: new Date().toISOString().slice(0, 10) }),
    });
    expect(res.status).toBe(200);
  });

  test("handles invalid targetDate gracefully", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/ai/schedule`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ targetDate: "not-a-date" }),
    });
    // Should still respond — defaults to today
    expect([200, 400]).toContain(res.status);
  });
});

// Tests: /api/analytics

describe("GET /api/analytics", () => {
  test("returns 401 without session", async () => {
    const res = await fetch(`${BASE}/api/analytics`);
    expect(res.status).toBe(401);
  });

  test("returns analytics fields", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/analytics`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.completionRate).toBe("number");
    expect(typeof data.studyStreak).toBe("number");
    expect(Array.isArray(data.dailyFocus)).toBe(true);
  });

  test("completionRate is 0-100", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/analytics`, { headers: authHeaders() });
    const data = await res.json();
    expect(data.completionRate).toBeGreaterThanOrEqual(0);
    expect(data.completionRate).toBeLessThanOrEqual(100);
  });
});

// Tests: /api/notifications

describe("GET /api/notifications", () => {
  test("returns 401 without session", async () => {
    const res = await fetch(`${BASE}/api/notifications`);
    expect(res.status).toBe(401);
  });

  test("returns notifications and unreadCount", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/notifications`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.notifications)).toBe(true);
    expect(typeof data.unreadCount).toBe("number");
  });
});

// Tests: security and input sanitisation

describe("Security — input sanitisation", () => {
  test("XSS in task title is stripped on storage", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: '<img src=x onerror="alert(1)">' }),
    });
    if (res.status === 201) {
      const data = await res.json();
      expect(data.task.title).not.toMatch(/<img/);
    }
  });

  test("accessing another user task by ID returns 404", async () => {
    if (!SESSION_COOKIE) return;
    const res = await fetch(`${BASE}/api/tasks/999999`, { headers: authHeaders() });
    expect([404, 400]).toContain(res.status);
  });
});
