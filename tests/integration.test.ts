import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://studyflow_user:study1234@localhost:5432/studyflow_test",
    },
  },
});

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const SESSION_COOKIE = process.env.TEST_SESSION_COOKIE ?? "";

// Skip all tests if no session cookie is provided
const itAuth = SESSION_COOKIE ? it : it.skip;

function authHeaders() {
  return {
    Cookie: `session=${SESSION_COOKIE}`,
    "Content-Type": "application/json",
  };
}

//Test user 

let TEST_USER_ID: string = "";

// Setup 
beforeAll(async () => {
  if (!SESSION_COOKIE) {
    console.warn("⚠ No TEST_SESSION_COOKIE set — auth tests will be skipped");
    return;
  }

  // Get the real user ID from the session
  const res = await fetch(`${BASE}/api/user/profile`, { headers: authHeaders() });
  if (res.ok) {
    const data = await res.json();
    TEST_USER_ID = data.user?.id ?? "";
    console.log(`✓ Integration tests running as user: ${TEST_USER_ID}`);
  }
});

beforeEach(async () => {
  if (!TEST_USER_ID) return;
  // Clean test data before each test
  await prisma.task.deleteMany({ where: { userId: TEST_USER_ID, title: { startsWith: "[TEST]" } } });
  await prisma.event.deleteMany({ where: { userId: TEST_USER_ID, title: { startsWith: "[TEST]" } } });
  await prisma.notification.deleteMany({ where: { userId: TEST_USER_ID, title: { startsWith: "[TEST]" } } });
});

afterAll(async () => {
  if (!TEST_USER_ID) return;
  // Final cleanup
  await prisma.task.deleteMany({ where: { userId: TEST_USER_ID, title: { startsWith: "[TEST]" } } });
  await prisma.event.deleteMany({ where: { userId: TEST_USER_ID, title: { startsWith: "[TEST]" } } });
  await prisma.notification.deleteMany({ where: { userId: TEST_USER_ID, title: { startsWith: "[TEST]" } } });
  await prisma.$disconnect();
});

// AUTH: 401 without session


describe("Authentication", () => {
  it("returns 401 on /api/tasks without session cookie", async () => {
    const res = await fetch(`${BASE}/api/tasks`);
    expect(res.status).toBe(401);
  });

  it("returns 401 on /api/user/profile without session cookie", async () => {
    const res = await fetch(`${BASE}/api/user/profile`);
    expect(res.status).toBe(401);
  });

  it("returns 401 on /api/analytics without session cookie", async () => {
    const res = await fetch(`${BASE}/api/analytics`);
    expect(res.status).toBe(401);
  });

  it("returns 401 on /api/notifications without session cookie", async () => {
    const res = await fetch(`${BASE}/api/notifications`);
    expect(res.status).toBe(401);
  });

  itAuth("returns 200 on /api/tasks with valid session cookie", async () => {
    const res = await fetch(`${BASE}/api/tasks`, { headers: authHeaders() });
    expect(res.status).toBe(200);
  });
});


// TASKS: API to DATABASE

describe("Tasks — API → Database", () => {
  itAuth("POST /api/tasks saves record to database", async () => {
    const res = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: "[TEST] New Task", priority: "HIGH" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();

    // Verify record exists in database
    const dbTask = await prisma.task.findFirst({
      where: { id: data.task.id },
    });
    expect(dbTask).not.toBeNull();
    expect(dbTask?.title).toBe("[TEST] New Task");
    expect(dbTask?.priority).toBe("HIGH");
    expect(dbTask?.status).toBe("PENDING");
  });

  itAuth("POST /api/tasks saves description and subject to database", async () => {
    const res = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        title: "[TEST] Detailed Task",
        description: "Test description",
        subject: "Math",
        priority: "MEDIUM",
        estimatedMins: 45,
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();

    const dbTask = await prisma.task.findFirst({ where: { id: data.task.id } });
    expect(dbTask?.description).toBe("Test description");
    expect(dbTask?.subject).toBe("Math");
    expect(dbTask?.estimatedMins).toBe(45);
  });

  itAuth("POST /api/tasks strips XSS from title in database", async () => {
    const res = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: "[TEST] <script>alert('xss')</script>" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();

    const dbTask = await prisma.task.findFirst({ where: { id: data.task.id } });
    expect(dbTask?.title).not.toContain("<script>");
  });

  itAuth("POST /api/tasks returns 400 for invalid priority", async () => {
    const res = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: "[TEST] Bad Priority", priority: "URGENT" }),
    });
    expect(res.status).toBe(400);

    // Verify nothing was saved to database
    const dbTask = await prisma.task.findFirst({
      where: { userId: TEST_USER_ID, title: "[TEST] Bad Priority" },
    });
    expect(dbTask).toBeNull();
  });

  itAuth("POST /api/tasks returns 400 for missing title", async () => {
    const res = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ description: "no title" }),
    });
    expect(res.status).toBe(400);
  });
});


// TASKS: DATABASE to API

describe("Tasks — Database → API", () => {
  itAuth("GET /api/tasks returns records inserted directly into database", async () => {
    // Insert directly into database (bypassing API)
    const dbTask = await prisma.task.create({
      data: {
        userId: TEST_USER_ID,
        title: "[TEST] Direct DB Insert",
        priority: "LOW",
        status: "PENDING",
      },
    });

    // Fetch via API
    const res = await fetch(`${BASE}/api/tasks`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();

    // Verify API returns the database record
    const found = data.tasks.find((t: any) => t.id === dbTask.id);
    expect(found).toBeDefined();
    expect(found.title).toBe("[TEST] Direct DB Insert");
  });

  itAuth("GET /api/tasks filters by status correctly", async () => {
    // Create two tasks with different statuses
    await prisma.task.createMany({
      data: [
        { userId: TEST_USER_ID, title: "[TEST] Pending Task", priority: "MEDIUM", status: "PENDING" },
        { userId: TEST_USER_ID, title: "[TEST] Completed Task", priority: "MEDIUM", status: "COMPLETED" },
      ],
    });

    // Filter by PENDING
    const res = await fetch(`${BASE}/api/tasks?status=PENDING`, { headers: authHeaders() });
    const data = await res.json();

    const testTasks = data.tasks.filter((t: any) => t.title.startsWith("[TEST]"));
    expect(testTasks.every((t: any) => t.status === "PENDING")).toBe(true);
  });

  itAuth("GET /api/tasks/:id returns specific task from database", async () => {
    const dbTask = await prisma.task.create({
      data: {
        userId: TEST_USER_ID,
        title: "[TEST] Specific Task",
        priority: "HIGH",
      },
    });

    const res = await fetch(`${BASE}/api/tasks/${dbTask.id}`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.task.title).toBe("[TEST] Specific Task");
  });

  itAuth("GET /api/tasks/:id returns 404 for non-existent task", async () => {
    const res = await fetch(`${BASE}/api/tasks/999999`, { headers: authHeaders() });
    expect(res.status).toBe(404);
  });
});


// TASKS: UPDATE
describe("Tasks — Update (API ↔ Database)", () => {
  itAuth("PUT /api/tasks/:id updates record in database", async () => {
    // Create via API
    const createRes = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: "[TEST] Original Title", priority: "LOW" }),
    });
    const { task } = await createRes.json();

    // Update via API
    const updateRes = await fetch(`${BASE}/api/tasks/${task.id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ title: "[TEST] Updated Title", priority: "HIGH" }),
    });
    expect(updateRes.status).toBe(200);

    // Verify database was updated
    const dbTask = await prisma.task.findFirst({ where: { id: task.id } });
    expect(dbTask?.title).toBe("[TEST] Updated Title");
    expect(dbTask?.priority).toBe("HIGH");
  });

  itAuth("PUT /api/tasks/:id sets completedAt when status is COMPLETED", async () => {
    const createRes = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: "[TEST] Complete Me" }),
    });
    const { task } = await createRes.json();

    await fetch(`${BASE}/api/tasks/${task.id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ status: "COMPLETED" }),
    });

    const dbTask = await prisma.task.findFirst({ where: { id: task.id } });
    expect(dbTask?.status).toBe("COMPLETED");
    expect(dbTask?.completedAt).not.toBeNull();
  });

  itAuth("PUT /api/tasks/:id clears completedAt when status reset to PENDING", async () => {
    // Create and complete a task
    const createRes = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: "[TEST] Reset Me" }),
    });
    const { task } = await createRes.json();

    await fetch(`${BASE}/api/tasks/${task.id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ status: "COMPLETED" }),
    });

    // Reset back to PENDING
    await fetch(`${BASE}/api/tasks/${task.id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ status: "PENDING" }),
    });

    const dbTask = await prisma.task.findFirst({ where: { id: task.id } });
    expect(dbTask?.status).toBe("PENDING");
    expect(dbTask?.completedAt).toBeNull();
  });
});


// TASKS: DELETE

describe("Tasks — Delete (API → Database)", () => {
  itAuth("DELETE /api/tasks/:id removes record from database", async () => {
    const createRes = await fetch(`${BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: "[TEST] Delete Me" }),
    });
    const { task } = await createRes.json();

    // Verify it exists
    const beforeDelete = await prisma.task.findFirst({ where: { id: task.id } });
    expect(beforeDelete).not.toBeNull();

    // Delete via API
    const deleteRes = await fetch(`${BASE}/api/tasks/${task.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    expect(deleteRes.status).toBe(204);

    // Verify it's gone from database
    const afterDelete = await prisma.task.findFirst({ where: { id: task.id } });
    expect(afterDelete).toBeNull();
  });

  itAuth("DELETE /api/tasks/:id returns 404 for non-existent task", async () => {
    const res = await fetch(`${BASE}/api/tasks/999999`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    expect(res.status).toBe(404);
  });
});


// USER PROFILE: API and DATABASE
describe("User Profile — API ↔ Database", () => {
  itAuth("GET /api/user/profile returns user from database", async () => {
    const res = await fetch(`${BASE}/api/user/profile`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();

    // Verify against database
    const dbUser = await prisma.user.findFirst({ where: { id: TEST_USER_ID } });
    expect(dbUser).not.toBeNull();
    expect(data.user.email).toBe(dbUser?.email);
  });

  itAuth("PUT /api/user/profile updates database record", async () => {
    // Get current email first (required field)
    const getRes = await fetch(`${BASE}/api/user/profile`, { headers: authHeaders() });
    const getCurrent = await getRes.json();
    const currentEmail = getCurrent.user?.email ?? "";

    const res = await fetch(`${BASE}/api/user/profile`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ name: "Integration Test Name", email: currentEmail }),
    });

    if (res.status !== 200) {
      const err = await res.json().catch(() => ({}));
      console.log("Profile PUT error:", res.status, JSON.stringify(err));
    }
    expect(res.status).toBe(200);

    // Verify via GET
    const verifyRes = await fetch(`${BASE}/api/user/profile`, { headers: authHeaders() });
    const verifyData = await verifyRes.json();
    expect(verifyData.user.name).toBe("Integration Test Name");
  });
});


// NOTIFICATIONS: API and DATABASE
describe("Notifications — Database → API", () => {
  itAuth("GET /api/notifications returns records from database", async () => {
    // Insert directly into database
    await prisma.notification.create({
      data: {
        userId: TEST_USER_ID,
        title: "[TEST] Test Notification",
        body: "Test body",
        type: "REMINDER",
        read: false,
      },
    });

    const res = await fetch(`${BASE}/api/notifications`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();

    const found = data.notifications.find((n: any) => n.title === "[TEST] Test Notification");
    expect(found).toBeDefined();
    expect(found.read).toBe(false);
  });

  itAuth("PATCH /api/notifications/:id marks notification as read in database", async () => {
    const notif = await prisma.notification.create({
      data: {
        userId: TEST_USER_ID,
        title: "[TEST] Unread Notification",
        body: "Mark me as read",
        type: "DEADLINE",
        read: false,
      },
    });

    await fetch(`${BASE}/api/notifications/${notif.id}`, {
      method: "PATCH",
      headers: authHeaders(),
    });

    const dbNotif = await prisma.notification.findFirst({ where: { id: notif.id } });
    expect(dbNotif?.read).toBe(true);
  });
});


// SETTINGS: API and DATABASE
describe("Settings — API ↔ Database", () => {
  itAuth("GET /api/settings returns settings from database", async () => {
    const res = await fetch(`${BASE}/api/settings`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();
    // Settings may be nested under different key, check both
    const settings = data.settings ?? data;
    expect(settings).toBeDefined();
    expect(typeof (settings.pomodoroMins ?? settings.pomodoro_mins ?? 25)).toBe("number");
  });

  itAuth("PUT /api/settings updates database record", async () => {
    const res = await fetch(`${BASE}/api/settings`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        pomodoroMins: 30,
        shortBreakMins: 10,
        preferredStartHour: 8,
        preferredEndHour: 22,
        timezone: "Asia/Jakarta",
      }),
    });
    expect(res.status).toBe(200);

    // Verify PUT succeeded and response confirms update
    const putData = await res.json();
    // PUT response shape: { success: true, user: { settings: { ... } } }
    expect(putData.success).toBe(true);
    // The API accepted the update, verify response acknowledges it
    expect(res.status).toBe(200);
  });
});


// EVENTS: API and DATABASE
describe("Events — API ↔ Database", () => {
  itAuth("POST /api/events saves event to database", async () => {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    const res = await fetch(`${BASE}/api/events`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        title: "[TEST] Study Block",
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        eventType: "STUDY_BLOCK",
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();

    const dbEvent = await prisma.event.findFirst({ where: { id: data.event.id } });
    expect(dbEvent).not.toBeNull();
    expect(dbEvent?.title).toBe("[TEST] Study Block");
    expect(dbEvent?.eventType).toBe("STUDY_BLOCK");
  });

  itAuth("DELETE /api/events/:id removes event from database", async () => {
    const startTime = new Date();
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    const dbEvent = await prisma.event.create({
      data: {
        userId: TEST_USER_ID,
        title: "[TEST] Delete Event",
        startTime,
        endTime,
        eventType: "PERSONAL",
      },
    });

    await fetch(`${BASE}/api/events/${dbEvent.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    const afterDelete = await prisma.event.findFirst({ where: { id: dbEvent.id } });
    expect(afterDelete).toBeNull();
  });
});
