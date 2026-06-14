export const getApiDocs = async () => {
  return {
    openapi: "3.0.0",
    info: {
      title: "StudyFlow API",
      version: "1.0.0",
      description:
        "REST API for StudyFlow - a study planner and productivity tracker. All protected routes require a session cookie obtained via POST /api/session.",
    },
    servers: [{ url: "https://e2526-wads-b4cc.csbihub.id", description: "Production" }],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "session",
          description: "Firebase session cookie set by POST /api/session",
        },
      },
      schemas: {
        Task: {
          type: "object",
          properties: {
            id: { type: "integer" },
            title: { type: "string" },
            subject: { type: "string", nullable: true },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
            dueDate: { type: "string", format: "date-time", nullable: true },
            estimatedMins: { type: "integer", nullable: true },
            aiScore: { type: "number", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Event: {
          type: "object",
          properties: {
            id: { type: "integer" },
            title: { type: "string" },
            description: { type: "string", nullable: true },
            startTime: { type: "string", format: "date-time" },
            endTime: { type: "string", format: "date-time" },
            aiGenerated: { type: "boolean" },
          },
        },
        Notification: {
          type: "object",
          properties: {
            id: { type: "integer" },
            type: { type: "string", enum: ["REMINDER", "AI_ALERT", "DEADLINE", "ACHIEVEMENT"] },
            title: { type: "string" },
            body: { type: "string" },
            read: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: { error: { type: "string" } },
        },
      },
    },
    security: [{ sessionCookie: [] }],
    paths: {
      "/api/session": {
        post: {
          tags: ["Auth"],
          summary: "Create session (login)",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { idToken: { type: "string", description: "Firebase ID token" } },
                  required: ["idToken"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Session cookie set, returns user info" },
            "400": { description: "Missing token" },
            "401": { description: "Invalid token" },
          },
        },
      },
      "/api/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout - clears session cookie",
          responses: { "200": { description: "Logged out" } },
        },
      },
      "/api/auth/send-reset-email": {
        post: {
          tags: ["Auth"],
          summary: "Send password reset email",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { email: { type: "string", format: "email" } },
                  required: ["email"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Reset email sent" },
            "400": { description: "Missing email" },
          },
        },
      },
      "/api/tasks": {
        get: {
          tags: ["Tasks"],
          summary: "List all tasks (optionally filter by status/priority)",
          parameters: [
            { name: "status", in: "query", schema: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED"] } },
            { name: "priority", in: "query", schema: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] } },
          ],
          responses: {
            "200": { description: "Array of tasks", content: { "application/json": { schema: { type: "object", properties: { tasks: { type: "array", items: { $ref: "#/components/schemas/Task" } } } } } } },
            "401": { description: "Unauthorized" },
          },
        },
        post: {
          tags: ["Tasks"],
          summary: "Create a new task",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    subject: { type: "string" },
                    priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
                    dueDate: { type: "string", format: "date-time" },
                    estimatedMins: { type: "integer" },
                  },
                  required: ["title"],
                },
              },
            },
          },
          responses: {
            "201": { description: "Task created" },
            "400": { description: "Validation error" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/tasks/{id}": {
        get: {
          tags: ["Tasks"],
          summary: "Get a single task",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: {
            "200": { description: "Task object", content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } } },
            "404": { description: "Not found" },
          },
        },
        put: {
          tags: ["Tasks"],
          summary: "Update a task",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
                    priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
                    dueDate: { type: "string", format: "date-time" },
                    estimatedMins: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Updated task" }, "404": { description: "Not found" } },
        },
        delete: {
          tags: ["Tasks"],
          summary: "Delete a task",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { "200": { description: "Deleted" }, "404": { description: "Not found" } },
        },
      },
      "/api/events": {
        get: {
          tags: ["Events"],
          summary: "List calendar events",
          parameters: [
            { name: "start", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "end", in: "query", schema: { type: "string", format: "date-time" } },
          ],
          responses: {
            "200": { description: "Array of events", content: { "application/json": { schema: { type: "object", properties: { events: { type: "array", items: { $ref: "#/components/schemas/Event" } } } } } } },
            "401": { description: "Unauthorized" },
          },
        },
        post: {
          tags: ["Events"],
          summary: "Create a calendar event",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    startTime: { type: "string", format: "date-time" },
                    endTime: { type: "string", format: "date-time" },
                  },
                  required: ["title", "startTime", "endTime"],
                },
              },
            },
          },
          responses: { "201": { description: "Event created" }, "400": { description: "Validation error" } },
        },
      },
      "/api/events/{id}": {
        put: {
          tags: ["Events"],
          summary: "Update an event (user-created only)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    startTime: { type: "string", format: "date-time" },
                    endTime: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Updated event" }, "403": { description: "Cannot edit AI generated events" } },
        },
        delete: {
          tags: ["Events"],
          summary: "Delete an event",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { "200": { description: "Deleted" }, "404": { description: "Not found" } },
        },
      },
      "/api/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "List notifications",
          parameters: [{ name: "unread", in: "query", schema: { type: "boolean" } }],
          responses: {
            "200": {
              description: "Notifications list",
              content: { "application/json": { schema: { type: "object", properties: { notifications: { type: "array", items: { $ref: "#/components/schemas/Notification" } }, unreadCount: { type: "integer" } } } } },
            },
          },
        },
        delete: {
          tags: ["Notifications"],
          summary: "Clear all notifications",
          responses: { "200": { description: "All cleared" } },
        },
      },
      "/api/notifications/{id}": {
        patch: {
          tags: ["Notifications"],
          summary: "Mark notification as read",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { "200": { description: "Marked as read" } },
        },
        delete: {
          tags: ["Notifications"],
          summary: "Delete a notification",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { "200": { description: "Deleted" } },
        },
      },
      "/api/notifications/read-all": {
        patch: {
          tags: ["Notifications"],
          summary: "Mark all notifications as read",
          responses: { "200": { description: "All marked as read" } },
        },
      },
      "/api/notifications/check-sessions": {
        post: {
          tags: ["Notifications"],
          summary: "Check upcoming AI sessions and fire time-based notifications",
          responses: { "200": { description: "Notifications checked/created" } },
        },
      },
      "/api/analytics": {
        get: {
          tags: ["Analytics"],
          summary: "Get productivity analytics",
          parameters: [{ name: "range", in: "query", schema: { type: "string", enum: ["week", "month", "all"] } }],
          responses: {
            "200": {
              description: "Analytics data including study hours, subject breakdown, peak hours, AI summary",
            },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/settings": {
        get: {
          tags: ["Settings"],
          summary: "Get user study settings",
          responses: { "200": { description: "Settings object" } },
        },
        put: {
          tags: ["Settings"],
          summary: "Update study settings",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    preferredStartHour: { type: "integer", minimum: 0, maximum: 23 },
                    preferredEndHour: { type: "integer", minimum: 0, maximum: 23 },
                    pomodoroMins: { type: "integer" },
                    shortBreakMins: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Settings updated" } },
        },
      },
      "/api/user/profile": {
        get: {
          tags: ["User"],
          summary: "Get user profile",
          responses: { "200": { description: "Profile object with name, email, bio, avatarUrl" } },
        },
        put: {
          tags: ["User"],
          summary: "Update user profile",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    bio: { type: "string" },
                    avatarUrl: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Profile updated" } },
        },
      },
      "/api/study-sessions": {
        get: {
          tags: ["Study Sessions"],
          summary: "List past study sessions",
          responses: { "200": { description: "Array of study sessions" } },
        },
      },
      "/api/timer/complete": {
        post: {
          tags: ["Study Sessions"],
          summary: "Complete a study session - saves to DB, triggers AI feedback and optional reschedule",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    eventId: { type: "integer" },
                    actualDurationMin: { type: "integer" },
                    completionPercent: { type: "integer", minimum: 0, maximum: 100 },
                    note: { type: "string" },
                  },
                  required: ["eventId", "actualDurationMin", "completionPercent"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Session saved, AI message and optional new calendar event returned" },
          },
        },
      },
      "/api/ai/prioritize": {
        post: {
          tags: ["AI"],
          summary: "AI task prioritization - scores all tasks by urgency, effort, importance",
          responses: {
            "200": { description: "Prioritized task list with AI scores and summary" },
            "503": { description: "Gemini API unavailable" },
          },
        },
      },
      "/api/ai/schedule": {
        post: {
          tags: ["AI"],
          summary: "AI schedule optimization - generates study blocks for today based on tasks and calendar",
          responses: {
            "200": { description: "Optimized schedule blocks saved to calendar" },
            "503": { description: "Gemini API unavailable" },
          },
        },
      },
      "/api/ai/chat": {
        post: {
          tags: ["AI"],
          summary: "AI assistant chat - multi-turn conversation aware of tasks and schedule",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", maxLength: 2000 },
                    history: { type: "array", items: { type: "object" } },
                    clientTime: { type: "string", format: "date-time", description: "Browser local time for accurate scheduling context" },
                  },
                  required: ["message"],
                },
              },
            },
          },
          responses: {
            "200": { description: "AI reply text" },
            "503": { description: "Gemini overloaded" },
            "429": { description: "Quota exceeded" },
          },
        },
      },
    },
  };
};