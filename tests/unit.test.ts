const mockAdminAuth = {
  verifySessionCookie: jest.fn(),
  verifyIdToken: jest.fn(),
  getUser: jest.fn(),
  generatePasswordResetLink: jest.fn(),
  createSessionCookie: jest.fn(),
};

jest.mock("@/lib/firebase-admin", () => ({
  getAdminAuth: jest.fn(() => mockAdminAuth),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: { upsert: jest.fn(), update: jest.fn() },
    userSettings: { findUnique: jest.fn() },
    event: { deleteMany: jest.fn() },
  },
}));

jest.mock("@/lib/notify", () => ({
  createNotification: jest.fn(),
}));

// user/verify used by send-reset-email route
jest.mock("@/app/api/user/verify", () => ({
  verifySession: jest.fn(),
}));

// Partially mock api-helpers: keep all real helpers, mock only verifySession
jest.mock("@/lib/api-helpers", () => ({
  ...jest.requireActual("@/lib/api-helpers"),
  verifySession: jest.fn(),
}));

//Imports 
import { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { verifySession as verifySessionFromVerify } from "@/app/api/user/verify";

import {
  sanitizeString,
  parseBody,
  unauthorized,
  badRequest,
  notFound,
  serverError,
  verifySession,
} from "@/lib/api-helpers";

import { GET as tasksGET, POST as tasksPOST } from "@/app/api/tasks/route";
import {
  GET as taskByIdGET,
  PUT as taskByIdPUT,
  DELETE as taskByIdDELETE,
} from "@/app/api/tasks/[id]/route";
import { POST as sessionPOST } from "@/app/api/session/route";
import { POST as resetEmailPOST } from "@/app/api/auth/send-reset-email/route";
import { GET as profileGET, PUT as profilePUT } from "@/app/api/user/profile/route";

import { z } from "zod";

//Helpers 

const mockedAdminAuth = mockAdminAuth;
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedCreateNotification = createNotification as jest.Mock;
const mockedVerifySessionFromVerify = verifySessionFromVerify as jest.Mock;
const mockedVerifySession = verifySession as jest.Mock;

/** Decoded token returned for an authenticated user */
const MOCK_USER = {
  uid: "user-123",
  email: "test@example.com",
  name: "Test User",
} as any;

/** Build a minimal NextRequest */
function makeReq(
  url: string,
  options: {
    method?: string;
    body?: object | null;
    cookie?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = "GET", body, cookie, headers = {} } = options;
  const reqHeaders: Record<string, string> = { "Content-Type": "application/json", ...headers };
  if (cookie) reqHeaders["Cookie"] = `session=${cookie}`;

  return new NextRequest(url, {
    method,
    headers: reqHeaders,
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
  });
}

/** Params wrapper expected by [id] route handlers */
function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

//Reset mocks between tests 

beforeEach(() => {
  jest.clearAllMocks();
});


// lib/api-helpers
describe("lib/api-helpers — sanitizeString", () => {
  test("strips HTML tags", () => {
    expect(sanitizeString("<script>alert(1)</script>")).toBe("alert(1)");
  });

  test("strips img XSS payload", () => {
    expect(sanitizeString('<img src=x onerror="alert(1)">')).toBe("");
  });

  test("preserves plain text", () => {
    expect(sanitizeString("Hello World")).toBe("Hello World");
  });

  test("trims surrounding whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });

  test("returns empty string for non-string input", () => {
    expect(sanitizeString(123)).toBe("");
    expect(sanitizeString(null)).toBe("");
    expect(sanitizeString(undefined)).toBe("");
  });

  test("truncates strings longer than 2000 chars", () => {
    const long = "a".repeat(3000);
    expect(sanitizeString(long).length).toBe(2000);
  });
});

describe("lib/api-helpers — response helpers", () => {
  test("unauthorized() returns 401", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  test("badRequest() returns 400 with message", async () => {
    const res = badRequest("Bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Bad input");
  });

  test("notFound() returns 404 with resource name", async () => {
    const res = notFound("Task");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/Task/);
  });

  test("serverError() returns 500", async () => {
    const res = serverError(new Error("boom"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("boom");
  });

  test("serverError() returns 500 for non-Error", async () => {
    const res = serverError("unknown");
    expect(res.status).toBe(500);
  });
});

describe("lib/api-helpers — parseBody", () => {
  const schema = z.object({ title: z.string().min(1) });

  test("returns success for valid body", async () => {
    const req = makeReq("http://localhost/api/tasks", {
      method: "POST",
      body: { title: "Hello" },
    });
    const result = await parseBody(req, schema);
    expect(result.success).toBe(true);
  });

  test("returns failure for invalid body", async () => {
    const req = makeReq("http://localhost/api/tasks", {
      method: "POST",
      body: { title: "" },
    });
    const result = await parseBody(req, schema);
    expect(result.success).toBe(false);
  });

  test("returns failure for malformed JSON", async () => {
    const req = new NextRequest("http://localhost/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ bad json }",
    });
    const result = await parseBody(req, schema);
    expect(result.success).toBe(false);
  });
});

describe("lib/api-helpers — verifySession", () => {
  test("returns mocked value when set", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    const req = makeReq("http://localhost/api/tasks", { cookie: "valid-cookie" });
    const result = await verifySession(req);
    expect(result).toEqual(MOCK_USER);
  });

  test("returns null when mocked to return null", async () => {
    mockedVerifySession.mockResolvedValueOnce(null);
    const req = makeReq("http://localhost/api/tasks");
    const result = await verifySession(req);
    expect(result).toBeNull();
  });

  test("returns falsy when no mock set (default jest.fn() behavior)", async () => {
    const req = makeReq("http://localhost/api/tasks");
    const result = await verifySession(req);
    expect(result).toBeFalsy();
  });
});


// GET /api/tasks
describe("GET /api/tasks", () => {
  test("returns 401 when not authenticated", async () => {
    mockedVerifySession.mockResolvedValueOnce(null);
    const req = makeReq("http://localhost/api/tasks");
    const res = await tasksGET(req);
    expect(res.status).toBe(401);
  });

  test("returns 200 and tasks array when authenticated", async () => {
    mockedVerifySession.mockResolvedValue(MOCK_USER);
    mockedPrisma.task.findMany.mockResolvedValue([
      { id: 1, title: "Task A", userId: MOCK_USER.uid },
    ] as any);

    const req = makeReq("http://localhost/api/tasks", { cookie: "valid" });
    const res = await tasksGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.tasks)).toBe(true);
    expect(body.tasks[0].title).toBe("Task A");
  });

  test("filters by status query param", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.task.findMany.mockResolvedValueOnce([]);

    const req = makeReq("http://localhost/api/tasks?status=PENDING", { cookie: "valid" });
    await tasksGET(req);

    expect(mockedPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PENDING" }),
      })
    );
  });

  test("filters by priority query param", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.task.findMany.mockResolvedValueOnce([]);

    const req = makeReq("http://localhost/api/tasks?priority=HIGH", { cookie: "valid" });
    await tasksGET(req);

    expect(mockedPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ priority: "HIGH" }),
      })
    );
  });

  test("returns 500 when prisma throws", async () => {
    mockedVerifySession.mockResolvedValue(MOCK_USER);
    mockedPrisma.task.findMany.mockRejectedValueOnce(new Error("db error"));

    const req = makeReq("http://localhost/api/tasks", { cookie: "valid" });
    const res = await tasksGET(req);
    expect(res.status).toBe(500);
  });
});


// POST /api/tasks
describe("POST /api/tasks", () => {
  test("returns 401 when not authenticated", async () => {
    mockedVerifySession.mockResolvedValueOnce(null);
    const req = makeReq("http://localhost/api/tasks", {
      method: "POST",
      body: { title: "My Task" },
    });
    const res = await tasksPOST(req);
    expect(res.status).toBe(401);
  });

  test("returns 400 when title is missing", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    const req = makeReq("http://localhost/api/tasks", {
      method: "POST",
      body: { description: "no title" },
      cookie: "valid",
    });
    const res = await tasksPOST(req);
    expect(res.status).toBe(400);
  });

  test("returns 400 when title is empty string", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    const req = makeReq("http://localhost/api/tasks", {
      method: "POST",
      body: { title: "" },
      cookie: "valid",
    });
    const res = await tasksPOST(req);
    expect(res.status).toBe(400);
  });

  test("returns 400 when title exceeds 200 chars", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    const req = makeReq("http://localhost/api/tasks", {
      method: "POST",
      body: { title: "a".repeat(201) },
      cookie: "valid",
    });
    const res = await tasksPOST(req);
    expect(res.status).toBe(400);
  });

  test("returns 400 with invalid priority value", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    const req = makeReq("http://localhost/api/tasks", {
      method: "POST",
      body: { title: "Task", priority: "URGENT" },
      cookie: "valid",
    });
    const res = await tasksPOST(req);
    expect(res.status).toBe(400);
  });

  test("returns 400 with invalid ISO date", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    const req = makeReq("http://localhost/api/tasks", {
      method: "POST",
      body: { title: "Task", dueDate: "not-a-date" },
      cookie: "valid",
    });
    const res = await tasksPOST(req);
    expect(res.status).toBe(400);
  });

  test("returns 400 when estimatedMins exceeds 600", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    const req = makeReq("http://localhost/api/tasks", {
      method: "POST",
      body: { title: "Task", estimatedMins: 601 },
      cookie: "valid",
    });
    const res = await tasksPOST(req);
    expect(res.status).toBe(400);
  });

  test("creates task and returns 201", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.user.upsert.mockResolvedValueOnce({} as any);
    mockedPrisma.userSettings.findUnique.mockResolvedValueOnce(null);
    mockedPrisma.task.create.mockResolvedValueOnce({
      id: 1,
      title: "My Task",
      priority: "MEDIUM",
      userId: MOCK_USER.uid,
    } as any);

    const req = makeReq("http://localhost/api/tasks", {
      method: "POST",
      body: { title: "My Task" },
      cookie: "valid",
    });
    const res = await tasksPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.task.id).toBe(1);
  });

  test("strips XSS from title before saving", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.user.upsert.mockResolvedValueOnce({} as any);
    mockedPrisma.userSettings.findUnique.mockResolvedValueOnce(null);
    mockedPrisma.task.create.mockResolvedValueOnce({
      id: 2,
      title: "alert(1)",
      userId: MOCK_USER.uid,
    } as any);

    const req = makeReq("http://localhost/api/tasks", {
      method: "POST",
      body: { title: "<script>alert(1)</script>" },
      cookie: "valid",
    });
    await tasksPOST(req);

    const createCall = mockedPrisma.task.create.mock.calls[0][0];
    expect(createCall.data.title).not.toContain("<script>");
  });

  test("fires deadline notification when due within 3 days", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.user.upsert.mockResolvedValueOnce({} as any);
    mockedPrisma.userSettings.findUnique.mockResolvedValueOnce({
      notifDeadline: true,
    } as any);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

    mockedPrisma.task.create.mockResolvedValueOnce({
      id: 3,
      title: "Due Soon",
      userId: MOCK_USER.uid,
    } as any);

    const req = makeReq("http://localhost/api/tasks", {
      method: "POST",
      body: { title: "Due Soon", dueDate: tomorrow.toISOString() },
      cookie: "valid",
    });
    await tasksPOST(req);
    expect(mockedCreateNotification).toHaveBeenCalledTimes(1);
  });

  test("does NOT fire notification when notifDeadline is false", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.user.upsert.mockResolvedValueOnce({} as any);
    mockedPrisma.userSettings.findUnique.mockResolvedValueOnce({
      notifDeadline: false,
    } as any);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    mockedPrisma.task.create.mockResolvedValueOnce({ id: 4, title: "Task" } as any);

    const req = makeReq("http://localhost/api/tasks", {
      method: "POST",
      body: { title: "Task", dueDate: tomorrow.toISOString() },
      cookie: "valid",
    });
    await tasksPOST(req);
    expect(mockedCreateNotification).not.toHaveBeenCalled();
  });

  test("does NOT fire notification when due date is more than 3 days away", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.user.upsert.mockResolvedValueOnce({} as any);
    mockedPrisma.userSettings.findUnique.mockResolvedValueOnce({
      notifDeadline: true,
    } as any);

    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 10);

    mockedPrisma.task.create.mockResolvedValueOnce({ id: 5, title: "Far Task" } as any);

    const req = makeReq("http://localhost/api/tasks", {
      method: "POST",
      body: { title: "Far Task", dueDate: farFuture.toISOString() },
      cookie: "valid",
    });
    await tasksPOST(req);
    expect(mockedCreateNotification).not.toHaveBeenCalled();
  });
});


// GET /api/tasks/[id]
describe("GET /api/tasks/[id]", () => {
  test("returns 401 when not authenticated", async () => {
    mockedVerifySession.mockResolvedValueOnce(null);
    const req = makeReq("http://localhost/api/tasks/1");
    const res = await taskByIdGET(req, makeParams("1"));
    expect(res.status).toBe(401);
  });

  test("returns 400 for non-numeric id", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    const req = makeReq("http://localhost/api/tasks/abc", { cookie: "valid" });
    const res = await taskByIdGET(req, makeParams("abc"));
    expect(res.status).toBe(400);
  });

  test("returns 404 when task does not belong to user", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.task.findFirst.mockResolvedValueOnce(null);
    const req = makeReq("http://localhost/api/tasks/999", { cookie: "valid" });
    const res = await taskByIdGET(req, makeParams("999"));
    expect(res.status).toBe(404);
  });

  test("returns 200 and task when found", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.task.findFirst.mockResolvedValueOnce({
      id: 1,
      title: "My Task",
      userId: MOCK_USER.uid,
    } as any);

    const req = makeReq("http://localhost/api/tasks/1", { cookie: "valid" });
    const res = await taskByIdGET(req, makeParams("1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.task.id).toBe(1);
  });
});


// PUT /api/tasks/[id]
describe("PUT /api/tasks/[id]", () => {
  test("returns 401 when not authenticated", async () => {
    mockedVerifySession.mockResolvedValueOnce(null);
    const req = makeReq("http://localhost/api/tasks/1", {
      method: "PUT",
      body: { title: "Updated" },
    });
    const res = await taskByIdPUT(req, makeParams("1"));
    expect(res.status).toBe(401);
  });

  test("returns 404 when task not found", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.task.findFirst.mockResolvedValueOnce(null);
    const req = makeReq("http://localhost/api/tasks/999", {
      method: "PUT",
      body: { title: "Updated" },
      cookie: "valid",
    });
    const res = await taskByIdPUT(req, makeParams("999"));
    expect(res.status).toBe(404);
  });

  test("returns 400 for invalid update data", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.task.findFirst.mockResolvedValueOnce({ id: 1 } as any);
    const req = makeReq("http://localhost/api/tasks/1", {
      method: "PUT",
      body: { status: "INVALID_STATUS" },
      cookie: "valid",
    });
    const res = await taskByIdPUT(req, makeParams("1"));
    expect(res.status).toBe(400);
  });

  test("updates task and returns 200", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.task.findFirst.mockResolvedValueOnce({
      id: 1,
      title: "Old",
      completedAt: null,
      userId: MOCK_USER.uid,
    } as any);
    mockedPrisma.task.update.mockResolvedValueOnce({ id: 1, title: "Updated" } as any);

    const req = makeReq("http://localhost/api/tasks/1", {
      method: "PUT",
      body: { title: "Updated" },
      cookie: "valid",
    });
    const res = await taskByIdPUT(req, makeParams("1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.task.title).toBe("Updated");
  });

  test("deletes AI events when task marked COMPLETED", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.task.findFirst.mockResolvedValueOnce({
      id: 1,
      title: "Study task",
      completedAt: null,
      userId: MOCK_USER.uid,
    } as any);
    mockedPrisma.task.update.mockResolvedValueOnce({ id: 1, status: "COMPLETED" } as any);
    mockedPrisma.event.deleteMany.mockResolvedValueOnce({ count: 2 } as any);

    const req = makeReq("http://localhost/api/tasks/1", {
      method: "PUT",
      body: { status: "COMPLETED" },
      cookie: "valid",
    });
    await taskByIdPUT(req, makeParams("1"));
    expect(mockedPrisma.event.deleteMany).toHaveBeenCalledTimes(1);
  });

  test("sets completedAt when status is COMPLETED", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.task.findFirst.mockResolvedValueOnce({
      id: 1,
      completedAt: null,
      userId: MOCK_USER.uid,
    } as any);
    mockedPrisma.task.update.mockResolvedValueOnce({ id: 1 } as any);
    mockedPrisma.event.deleteMany.mockResolvedValueOnce({ count: 0 } as any);

    const req = makeReq("http://localhost/api/tasks/1", {
      method: "PUT",
      body: { status: "COMPLETED" },
      cookie: "valid",
    });
    await taskByIdPUT(req, makeParams("1"));

    const updateCall = mockedPrisma.task.update.mock.calls[0][0];
    expect(updateCall.data.completedAt).toBeDefined();
  });

  test("clears completedAt when status reset to PENDING", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.task.findFirst.mockResolvedValueOnce({
      id: 1,
      completedAt: new Date(),
      userId: MOCK_USER.uid,
    } as any);
    mockedPrisma.task.update.mockResolvedValueOnce({ id: 1 } as any);

    const req = makeReq("http://localhost/api/tasks/1", {
      method: "PUT",
      body: { status: "PENDING" },
      cookie: "valid",
    });
    await taskByIdPUT(req, makeParams("1"));

    const updateCall = mockedPrisma.task.update.mock.calls[0][0];
    expect(updateCall.data.completedAt).toBeNull();
  });
});


// DELETE /api/tasks/[id]
describe("DELETE /api/tasks/[id]", () => {
  test("returns 401 when not authenticated", async () => {
    mockedVerifySession.mockResolvedValueOnce(null);
    const req = makeReq("http://localhost/api/tasks/1", { method: "DELETE" });
    const res = await taskByIdDELETE(req, makeParams("1"));
    expect(res.status).toBe(401);
  });

  test("returns 404 when task not found", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.task.findFirst.mockResolvedValueOnce(null);
    const req = makeReq("http://localhost/api/tasks/999", {
      method: "DELETE",
      cookie: "valid",
    });
    const res = await taskByIdDELETE(req, makeParams("999"));
    expect(res.status).toBe(404);
  });

  test("returns 204 on successful delete", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.task.findFirst.mockResolvedValueOnce({ id: 1 } as any);
    mockedPrisma.task.delete.mockResolvedValueOnce({} as any);

    const req = makeReq("http://localhost/api/tasks/1", {
      method: "DELETE",
      cookie: "valid",
    });
    const res = await taskByIdDELETE(req, makeParams("1"));
    expect(res.status).toBe(204);
  });

  test("returns 400 for non-numeric id", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    const req = makeReq("http://localhost/api/tasks/abc", {
      method: "DELETE",
      cookie: "valid",
    });
    const res = await taskByIdDELETE(req, makeParams("abc"));
    expect(res.status).toBe(400);
  });
});


// POST /api/session
describe("POST /api/session", () => {
  test("returns 400 when no token is provided", async () => {
    const req = makeReq("http://localhost/api/session", {
      method: "POST",
      body: {},
    });
    const res = await sessionPOST(req);
    expect(res.status).toBe(400);
  });

  test("returns 401 when token is invalid", async () => {
    mockedAdminAuth.verifyIdToken.mockRejectedValueOnce(new Error("invalid token"));
    const req = makeReq("http://localhost/api/session", {
      method: "POST",
      body: { idToken: "bad-token" },
    });
    const res = await sessionPOST(req);
    expect(res.status).toBe(401);
  });

  test("returns 200 and sets session cookie on valid token", async () => {
    mockedAdminAuth.verifyIdToken.mockResolvedValueOnce({
      uid: "user-123",
      email: "test@example.com",
    } as any);
    mockedAdminAuth.createSessionCookie.mockResolvedValueOnce("session-cookie-value");

    const req = makeReq("http://localhost/api/session", {
      method: "POST",
      body: { idToken: "valid-id-token" },
    });
    const res = await sessionPOST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.uid).toBe("user-123");
  });

  test("accepts token from Authorization Bearer header", async () => {
    mockedAdminAuth.verifyIdToken.mockResolvedValueOnce({
      uid: "user-123",
      email: "test@example.com",
    } as any);
    mockedAdminAuth.createSessionCookie.mockResolvedValueOnce("session-cookie-value");

    const req = makeReq("http://localhost/api/session", {
      method: "POST",
      headers: { Authorization: "Bearer valid-id-token" },
    });
    const res = await sessionPOST(req);
    expect(res.status).toBe(200);
  });
});


// POST /api/auth/send-reset-email
describe("POST /api/auth/send-reset-email", () => {
  test("returns 401 when not authenticated", async () => {
    mockedVerifySessionFromVerify.mockResolvedValueOnce(null);
    const req = makeReq("http://localhost/api/auth/send-reset-email", { method: "POST" });
    const res = await resetEmailPOST(req);
    expect(res.status).toBe(401);
  });

  test("returns 400 when Firebase user has no email", async () => {
    mockedVerifySessionFromVerify.mockResolvedValueOnce(MOCK_USER);
    mockedAdminAuth.getUser.mockResolvedValueOnce({ email: null } as any);

    const req = makeReq("http://localhost/api/auth/send-reset-email", {
      method: "POST",
      cookie: "valid",
    });
    const res = await resetEmailPOST(req);
    expect(res.status).toBe(400);
  });

  test("returns 200 on successful reset email send", async () => {
    mockedVerifySessionFromVerify.mockResolvedValueOnce(MOCK_USER);
    mockedAdminAuth.getUser.mockResolvedValueOnce({ email: "test@example.com" } as any);
    mockedAdminAuth.generatePasswordResetLink.mockResolvedValueOnce("https://reset-link");

    const req = makeReq("http://localhost/api/auth/send-reset-email", {
      method: "POST",
      cookie: "valid",
    });
    const res = await resetEmailPOST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("returns 500 when Firebase throws", async () => {
    mockedVerifySessionFromVerify.mockResolvedValueOnce(MOCK_USER);
    mockedAdminAuth.getUser.mockRejectedValueOnce(new Error("firebase error"));

    const req = makeReq("http://localhost/api/auth/send-reset-email", {
      method: "POST",
      cookie: "valid",
    });
    const res = await resetEmailPOST(req);
    expect(res.status).toBe(500);
  });
});


// GET /api/user/profile
describe("GET /api/user/profile", () => {
  test("returns 401 when not authenticated", async () => {
    mockedVerifySession.mockResolvedValueOnce(null);
    const req = makeReq("http://localhost/api/user/profile");
    const res = await profileGET(req);
    expect(res.status).toBe(401);
  });

  test("returns 200 and user profile", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.user.upsert.mockResolvedValueOnce({
      id: MOCK_USER.uid,
      email: MOCK_USER.email,
      name: MOCK_USER.name,
    } as any);

    const req = makeReq("http://localhost/api/user/profile", { cookie: "valid" });
    const res = await profileGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe(MOCK_USER.email);
  });

  test("upserts user on first login", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.user.upsert.mockResolvedValueOnce({ id: MOCK_USER.uid } as any);

    const req = makeReq("http://localhost/api/user/profile", { cookie: "valid" });
    await profileGET(req);

    expect(mockedPrisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MOCK_USER.uid },
        create: expect.objectContaining({ id: MOCK_USER.uid }),
      })
    );
  });
});


// PUT /api/user/profile
describe("PUT /api/user/profile", () => {
  test("returns 401 when not authenticated", async () => {
    mockedVerifySession.mockResolvedValueOnce(null);
    const req = makeReq("http://localhost/api/user/profile", {
      method: "PUT",
      body: { name: "New Name" },
    });
    const res = await profilePUT(req);
    expect(res.status).toBe(401);
  });

  test("updates profile and returns 200", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.user.update.mockResolvedValueOnce({
      id: MOCK_USER.uid,
      name: "New Name",
      email: "new@example.com",
    } as any);

    const req = makeReq("http://localhost/api/user/profile", {
      method: "PUT",
      body: { name: "New Name", email: "new@example.com" },
      cookie: "valid",
    });
    const res = await profilePUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.name).toBe("New Name");
  });

  test("returns 500 when prisma throws", async () => {
    mockedVerifySession.mockResolvedValueOnce(MOCK_USER);
    mockedPrisma.user.update.mockRejectedValueOnce(new Error("db error"));

    const req = makeReq("http://localhost/api/user/profile", {
      method: "PUT",
      body: { name: "Fail" },
      cookie: "valid",
    });
    const res = await profilePUT(req);
    expect(res.status).toBe(500);
  });
});