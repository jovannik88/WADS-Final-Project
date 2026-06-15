## Final Project – Web Application Development and Security

Course Code: COMP6703001

Course Name: Web Application Development and Security

Institution: BINUS University International

Class : L4CC

Group Members :

| Name |Student ID |Github Username|
|-----------|-----------|-----------|
| Jovan Nikholas| 2902641811 | jovannik88| 
| Lyonnel Judson Saputra | 2802505853| LyonelJS|
| MANJAKAMANANA MAMY JEAN |2902639832| Mamy32| 

---

## 2. Instructor & Repository Access

This repository must be shared with:

- Instructor: Ida Bagus Kerthyayana Manuaba
  - Email: imanuaba@binus.edu
  - GitHub: bagzcode
- Instructor Assistant: Juwono
  - Email: juwono@binus.edu
  - GitHub: Juwono136

---

## 3. Project Overview

Project Title: Study planner and productivity tracker

Project Domain: Study Planner & Productivity Tracker

### 3.1 Problem Statement

The purpose of this project is to help students plan their study sessions by organizing assignments and test deadline reminders that can be viewed directly in their calendar. Every completed or accomplished task will be tracked in a dashboard, allowing students to monitor their progress and productivity.

This web application will also include a notification feature that reminds users about upcoming deadlines and important reminders.

Additionally, the program will include two AI-powered functions designed to help students determine which tasks they should prioritize. These AI features will assist in organizing student schedules and improving task prioritization.

### 3.2 Solution Overview

| Feature | Description |
|---|---|
| **Dashboard** | Overview of tasks, study time, focus score, and AI suggestions |
| **Task Manager** | Create, edit, delete tasks with priority, due date/time, and subject |
| **Calendar** | Monthly view of events and AI-generated study blocks |
| **AI Assistant** | Gemini-powered chatbot aware of your tasks and schedule |
| **Smart Prioritization** | AI scores each task (0–100) based on urgency, effort, and importance |
| **Schedule Optimizer** | Generates study blocks from current time, respects existing calendar events |
| **Study Timer** | Pomodoro-style focus timer with session logging |
| **Analytics** | Weekly productivity charts and study habit insights |
| **Notifications** | In-app alerts for deadlines and AI-generated schedules |

---

## 4. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Firebase Authentication + Firebase Admin SDK |
| Database | PostgreSQL 16 (Neon) |
| ORM | Prisma 6 |
| AI | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| Containerization | Docker + Docker Compose |
| Version Control | GitHub |
| CI/CD | GitHub Actions |
| Deployment | VPS via Docker + Cloudflare Domain |
| API | REST API via Next.js Route Handlers (`app/api/`) |

---

## 5. System Architecture

### 5.1 Front-end layer (Next.js)

The front-end is built using the Next.js React framework (App Router) and is responsible for:

- Rendering the user interface for dashboard, task manager, calendar, AI chat, timer, notifications
- Communicating with the back-end via REST API calls using `fetch`
- Displaying AI-generated recommendations and study schedules
- Handling Firebase Authentication on the client side (sign-in, Google OAuth)

The front-end does not directly access the database or AI services — all interactions go through the secure Next.js API routes.

---

### 5.2 Back-end layer (Next.js API Routes)

The back-end is built inside the **same Next.js application** using **Route Handlers** (`app/api/`). There is no separate Node.js server. All API routes run server-side within Next.js.

Responsibilities include:

- Handling HTTP requests (GET, POST, PUT, DELETE) and returning JSON responses
- Session-based authentication using **Firebase Admin SDK** + **HttpOnly session cookies**
- Role-based access control (USER vs ADMIN)
- Input validation using **Zod schemas**
- Output sanitization to prevent XSS
- Database access via **Prisma ORM** (parameterized queries — no SQL injection)
- AI orchestration — calling the Gemini API and the deterministic AI engine

---

### 5.3 Database layer (PostgreSQL with Prisma)

The database layer uses **PostgreSQL 16** (hosted on Neon) with **Prisma ORM**.

Responsibilities include:

- Storing users, tasks, events, study sessions, notifications, settings, and AI cache
- Secure access restricted to server-side API routes only — never exposed to the browser
- Enforcing relational data integrity via Prisma schema constraints

---


### 5.4 Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Browser (Next.js Frontend)"]
        UI["Pages & Components\nDashboard / Tasks / Calendar / AI / Timer"]
        FC["Firebase Client SDK\nEmail + Google Auth"]
    end

    subgraph Server["Next.js Server (App Router)"]
        API["API Routes\n/api/tasks /api/events /api/ai/* /api/admin/*"]
        FA["Firebase Admin SDK\nSession cookie verification"]
        PRISMA["Prisma ORM\nType-safe DB queries"]
        AI_LIB["AI Engine\nlib/gemini.ts + lib/ai-engine.ts"]
    end

    subgraph External["External Services"]
        FIREBASE["Firebase Auth\nUser identity"]
        GEMINI["Google Gemini API\nTask prioritization / schedule / chat"]
        DB["PostgreSQL\nNeon cloud database"]
    end

    subgraph DevOps["DevOps"]
        GH["GitHub Repository"]
        CI["GitHub Actions CI/CD"]
        DOCKER["Docker + docker-compose"]
        DEPLOY["Live Deployment\ne2526-wads-b4cc.csbihub.id"]
    end

    UI -->|"Firebase sign-in"| FC
    FC -->|"POST /api/session with idToken"| API
    UI -->|"Authenticated API calls with session cookie"| API
    API -->|"Verify session cookie"| FA
    FA -->|"Validate with"| FIREBASE
    API -->|"DB queries"| PRISMA
    PRISMA -->|"SQL"| DB
    API -->|"AI requests"| AI_LIB
    AI_LIB -->|"Gemini API calls"| GEMINI
    GH --> CI
    CI --> DOCKER
    DOCKER --> DEPLOY
```

---

## 6. API Design

### API Documentation (Swagger)

📄 **Interactive Docs:** https://e2526-wads-b4cc.csbihub.id/api-docs

---

### API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/session` | Create session (login) | No |
| POST | `/api/logout` | Logout, clears session cookie | Yes |
| POST | `/api/auth/send-reset-email` | Send password reset email | No |
| GET | `/api/tasks` | List all tasks (filter by status/priority) | Yes |
| POST | `/api/tasks` | Create a new task | Yes |
| GET | `/api/tasks/{id}` | Get a single task | Yes |
| PUT | `/api/tasks/{id}` | Update a task | Yes |
| DELETE | `/api/tasks/{id}` | Delete a task | Yes |
| GET | `/api/events` | List calendar events | Yes |
| POST | `/api/events` | Create a calendar event | Yes |
| PUT | `/api/events/{id}` | Update a user-created event | Yes |
| DELETE | `/api/events/{id}` | Delete an event | Yes |
| GET | `/api/notifications` | List notifications | Yes |
| DELETE | `/api/notifications` | Clear all notifications | Yes |
| PATCH | `/api/notifications/{id}` | Mark a notification as read | Yes |
| DELETE | `/api/notifications/{id}` | Delete a notification | Yes |
| PATCH | `/api/notifications/read-all` | Mark all notifications as read | Yes |
| POST | `/api/notifications/check-sessions` | Check and trigger time-based notifications | Yes |
| GET | `/api/analytics` | Get productivity analytics | Yes |
| GET | `/api/settings` | Get user study settings | Yes |
| PUT | `/api/settings` | Update study settings | Yes |
| GET | `/api/user/profile` | Get user profile | Yes |
| PUT | `/api/user/profile` | Update user profile | Yes |
| GET | `/api/study-sessions` | List past study sessions | Yes |
| POST | `/api/timer/complete` | Complete a session, save to DB, trigger AI feedback | Yes |
| POST | `/api/ai/prioritize` | AI task prioritization | Yes |
| POST | `/api/ai/schedule` | AI study schedule optimization | Yes |
| POST | `/api/ai/chat` | AI assistant chat (multi-turn) | Yes |
| POST | `/api/ai-optimize` | Trigger AI schedule regeneration and save to calendar | Yes |
| GET | `/api/export` | Export user data (tasks, sessions, events) | Yes |
| GET | `/api/user/notifications` | Get notification preferences for current user | Yes |
| GET | `/api/admin/users` | List all users with counts — admin only | Yes (Admin) |
| DELETE | `/api/admin/users/{uid}` | Delete a user and all their data — admin only | Yes (Admin) |
| PATCH | `/api/admin/users/{uid}` | Deactivate or reactivate a user — admin only | Yes (Admin) |
| GET | `/api/admin/analytics` | System-wide stats: users, tasks, sessions, AI — admin only | Yes (Admin) |
| POST | `/api/admin/notifications/broadcast` | Send a notification to all users — admin only | Yes (Admin) |
| GET | `/api/admin/ai-usage` | AI usage stats: requests, scores, activity — admin only | Yes (Admin) |

---

### Example Request & Response

#### POST `/api/session` — Login

**Request:**
```json
{
  "idToken": "<firebase-id-token>"
}
```

**Response `200`:**
```json
{
  "success": true,
  "user": {
    "uid": "abc123",
    "email": "user@example.com"
  }
}
```

---

#### POST `/api/tasks` — Create Task

**Request:**
```json
{
  "title": "Finish WADS Final Report",
  "subject": "WADS",
  "priority": "HIGH",
  "dueDate": "2026-06-20T23:59:00.000Z",
  "estimatedMins": 120
}
```

**Response `201`:**
```json
{
  "task": {
    "id": 42,
    "title": "Finish WADS Final Report",
    "subject": "WADS",
    "priority": "HIGH",
    "status": "PENDING",
    "dueDate": "2026-06-20T23:59:00.000Z",
    "estimatedMins": 120,
    "aiScore": null,
    "createdAt": "2026-06-15T00:00:00.000Z"
  }
}
```

---

#### POST `/api/ai/prioritize` — AI Task Prioritization

**Request:** *(no body required, reads tasks from DB for authenticated user)*

**Response `200`:**
```json
{
  "tasks": [
    {
      "id": 42,
      "title": "Finish WADS Final Report",
      "aiScore": 91,
      "suggestedOrder": 1,
      "priority": "HIGH"
    },
    {
      "id": 38,
      "title": "Read Chapter 5",
      "aiScore": 54,
      "suggestedOrder": 2,
      "priority": "MEDIUM"
    }
  ],
  "summary": "Prioritized 2 tasks. Finish WADS Final Report is most urgent due to its upcoming deadline.",
  "analyzedAt": "2026-06-15T00:00:00.000Z"
}
```

---

#### POST `/api/ai/chat` — AI Chat

**Request:**
```json
{
  "message": "What should I study first today?",
  "history": [],
  "clientTime": "2026-06-15T07:30:00+07:00"
}
```

**Response `200`:**
```json
{
  "reply": "Based on your tasks, I recommend starting with 'Finish WADS Final Report' since it is due in 5 days and rated HIGH priority. You have a 2-hour study block scheduled at 9:00 AM today."
}
```

---

## 7. Database Design

```mermaid
erDiagram
    User {
        string id PK
        string email
        string name
        enum role
        datetime createdAt
    }
    Task {
        int id PK
        string userId FK
        string title
        string subject
        enum priority
        float aiScore
        string aiReason
        enum status
        int estimatedMins
        datetime dueDate
        datetime completedAt
        int progress
        datetime createdAt
    }
    Event {
        int id PK
        string userId FK
        string title
        datetime startTime
        datetime endTime
        enum eventType
        boolean aiGenerated
        int taskId
        datetime createdAt
    }
    StudySession {
        int id PK
        string userId FK
        string subject
        int taskId
        int durationMin
        float focusScore
        datetime startedAt
        datetime endedAt
    }
    Notification {
        int id PK
        string userId FK
        string title
        string body
        enum type
        boolean read
        datetime createdAt
    }
    UserSettings {
        int id PK
        string userId FK
        int preferredStartHour
        int preferredEndHour
        int pomodoroMins
        int shortBreakMins
        int longBreakMins
        boolean notifDeadline
        boolean notifSession
        boolean notifAI
    }
    AiCache {
        int id PK
        string userId FK
        string taskHash
        json prioritization
        json schedule
        datetime generatedAt
        datetime expiresAt
    }

    User ||--o{ Task : "has"
    User ||--o{ Event : "has"
    User ||--o{ StudySession : "has"
    User ||--o{ Notification : "has"
    User ||--o| UserSettings : "has"
    User ||--o| AiCache : "has"
```

---

## 8. AI Features

### 8.1 AI Feature List

| AI Feature | Purpose | AI Type |
|---|---|---|
| **Smart Task Prioritization** | Scores and ranks tasks (0–100) based on urgency, importance, effort, and deadline proximity so students know what to work on first | Recommendation |
| **Study Schedule Optimization** | Generates an optimized daily study schedule by analyzing pending tasks, existing calendar events, and past study session focus scores | Recommendation |

---

### AI Integration Layer


The AI Integration Layer is part of the back-end service layer and includes the following intelligent features:

---

### Smart Task Prioritization

This AI feature determines which task should be completed first based on several key parameters:

- **Importance**  
  The weight of the task, such as how impactful it is toward the final grade.

- **Urgency**  
  How close the task is to its deadline.

- **Effort**  
  The level of difficulty required to complete the task.

- **Dependency**  
  Whether completing a task is required before starting or finishing other tasks.

The AI evaluates these parameters to generate a prioritized task list. The results will be displayed on the frontend of the web application.

#### AI Model
This feature will use **Gemini API** or other **LLM-based APIs**. LLMs allow users to describe task parameters using natural language, making prioritization more accurate and personalized.

---

### Study Schedule Optimization

This AI feature helps students generate the most optimal study schedule by analyzing three main factors:

- **Hard Blocks**  
  Fixed activities that cannot be changed, such as classes or mandatory events.

- **Tasks**  
  Assignments, projects, or study activities that need to be completed.

- **Energy Levels**  
  Identifies when the user is most productive (e.g., morning or night).

The AI processes these factors to create an optimized study schedule, which will be displayed on the frontend of the web application.

#### AI Model
This feature will also use **Gemini API** or other **LLM-based APIs**. By allowing users to describe their productivity habits and preferences in natural language, the AI can generate more realistic and personalized schedules.

### AI FLOW

```
                        User Data
              (tasks, sessions, settings, calendar)
                              |
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
  Task Prioritization   Schedule Optimizer   AI Chat Assistant
  (ai-engine.ts)        (ai-engine.ts)       (Gemini 2.5 Flash)
          |                   |                   |
          ▼                   ▼                   ▼
   Priority Scores       Study Blocks         Chat Response
   aiScore 0–100         Focus + breaks       Context-aware
   aiReason per task     Peak window          Task-aware reply
          |                   |                   |
          ▼                   ▼                   ▼
  Task.aiScore saved    Events created        Shown in UI
  Cached in AiCache     aiGenerated=true      No DB storage
          |                   |
          ▼                   ▼
  AiCache (24h TTL)     Calendar view
  taskHash invalidation  Blocks visible
          |                   |
          ▼                   ▼
   Dashboard list        Study timer
   Ordered by aiScore    Pomodoro sessions
          |                   |
          ▼                   ▼
   Tasks updated         Session logged
   Cache invalidated     Improves peak window
          |
          └──────────────────────────────────────┐
                ↻ re-scores on next              │
                  AI analysis request            │
                        ▲                        │
                        └────────────────────────┘
```

---

### Feature 1 — Task Prioritization

| Step | Detail |
|---|---|
| **Input** | All pending tasks (title, priority, dueDate, estimatedMins) |
| **Processing** | `computePriorityScore()` in `lib/ai-engine.ts` — weights priority (HIGH=40, MEDIUM=20, LOW=5) + deadline urgency + estimatedMins bonus/penalty |
| **Output** | `aiScore` (0–100) + `aiReason` string per task |
| **Saved to DB** | `Task.aiScore`, `Task.aiReason` fields + full result in `AiCache` |
| **Used in UI** | Dashboard task list ordered by `aiScore` descending |
| **Cache** | `AiCache` stores result for 24h, invalidated when `taskHash` changes |

---

### Feature 2 — Schedule Optimizer

| Step | Detail |
|---|---|
| **Input** | Pending tasks + past `StudySession` records + `UserSettings` (preferredStartHour, preferredEndHour, pomodoroMins) |
| **Processing** | `optimizeSchedule()` in `lib/ai-engine.ts` — assigns focus blocks by priority, inserts breaks, detects peak window from session `focusScore` history |
| **Output** | Array of blocks `{ startHour, endHour, taskTitle, durationMin, blockType }` + `peakWindow` string + `totalStudyMin` |
| **Saved to DB** | `Event` records with `aiGenerated=true` and `taskId` reference |
| **Used in UI** | Calendar view shows AI-generated study blocks |
| **Feedback** | Completed `StudySession` records improve future `peakWindow` detection |

---

### Feature 3 — AI Chat Assistant

| Step | Detail |
|---|---|
| **Input** | User message + conversation history + current task list injected into system prompt |
| **Processing** | `lib/gemini.ts` sends request to Gemini 2.5 Flash API with task-aware system prompt |
| **Output** | Natural language response aware of user's tasks and schedule |
| **Saved to DB** | Nothing — responses are stateless |
| **Used in UI** | Shown directly in the AI assistant chat panel |

---

### Cache Strategy

```
User triggers AI analysis
        |
        ▼
Compute taskHash (SHA-256 of task IDs + priorities + dueDates)
        |
        ▼
AiCache exists AND not expired AND hash matches?
        |
   Yes ─┴─ No
   |          |
   ▼          ▼
Return     Run AI engine
cached     Save to AiCache
result     Set expiresAt = now + 24h
```

The cache ensures consistent AI suggestions throughout a work session while automatically refreshing when tasks actually change.

---

## 9. Security Implementation

### 1. Authentication

StudyFlow uses **Firebase Authentication + Firebase Admin SDK** for session-based authentication.

#### Flow
```
User logs in → Firebase issues ID token → POST /api/session
→ Server verifies ID token via Firebase Admin SDK
→ Server creates HttpOnly session cookie (14 days)
→ All subsequent requests verified via session cookie
```

#### Implementation
```typescript
// app/api/session/route.ts
const decodedToken = await getAdminAuth().verifyIdToken(idToken, true);
const sessionCookie = await getAdminAuth().createSessionCookie(idToken, { expiresIn });

response.cookies.set("session", sessionCookie, {
  httpOnly: true,                                    // not accessible via JS
  secure: process.env.NODE_ENV === "production",     // HTTPS only in prod
  sameSite: "lax",                                   // CSRF protection
  path: "/",
  maxAge: expiresIn / 1000,
});
```

#### Session Verification
Every protected API route calls `verifySession()` before processing:
```typescript
// lib/api-helpers.ts
export async function verifySession(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  if (!session) return null;
  return await getAdminAuth().verifySessionCookie(session, true);
}
```

---

### 2. Authorization (Role-Based Access Control)

The `User` model has a `role` field: `USER` or `ADMIN`.

```prisma
model User {
  role Role @default(USER)
}
enum Role {
  USER
  ADMIN
}
```

#### User-level authorization
All data endpoints verify the authenticated user owns the requested resource:
```typescript
// app/api/tasks/[id]/route.ts
const task = await prisma.task.findFirst({
  where: { id: taskId, userId: user.uid }  // user can only access their own tasks
});
if (!task) return notFound("Task");
```

#### Admin-level authorization
Admin routes check the user's role before granting access:
```typescript
// lib/admin.ts
export async function requireAdmin(req: NextRequest) {
  const user = await verifySession(req);
  if (!user) return unauthorized();
  const dbUser = await prisma.user.findUnique({ where: { id: user.uid } });
  if (dbUser?.role !== "ADMIN") return unauthorized();
  return dbUser;
}
```

#### IDOR Prevention
Every database query includes `userId: user.uid` to prevent Insecure Direct Object Reference — users can never access another user's data by guessing IDs.

---

### 3. Input Validation

All API inputs are validated using **Zod schemas** before reaching the database.

```typescript
// app/api/tasks/route.ts
const TaskSchema = z.object({
  title: z.string().min(1).max(200),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  estimatedMins: z.number().min(1).max(600).optional(),
  dueDate: z.string().datetime().optional(),
});

const parsed = TaskSchema.safeParse(body);
if (!parsed.success) return badRequest("Invalid input");
```

Validated fields include:
- Title: required, 1–200 characters
- Priority: must be `HIGH`, `MEDIUM`, or `LOW`
- EstimatedMins: must be between 1–600
- DueDate: must be valid ISO datetime format
- Status: must be `PENDING`, `IN_PROGRESS`, or `COMPLETED`

---

### 4. SQL / NoSQL Injection Prevention

StudyFlow uses **Prisma ORM** which uses parameterized queries by default — user input is never interpolated directly into SQL strings.

```typescript
// Safe — Prisma parameterizes automatically
const task = await prisma.task.findFirst({
  where: {
    id: taskId,       // parameterized
    userId: user.uid  // parameterized
  }
});
```

Even if a user passes SQL injection payloads like `'; DROP TABLE tasks; --` as a task title, Prisma treats it as plain text data — it is never executed as SQL.

---

### 5. XSS Prevention

All user-supplied string inputs are sanitized using `sanitizeString()` before being stored in the database:

```typescript
// lib/api-helpers.ts
export function sanitizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, "")  // strips all HTML tags
    .trim()
    .slice(0, 2000);           // truncates to max length
}
```

Applied to all text fields before database writes:
```typescript
const title = sanitizeString(body.title);       // <script>alert(1)</script> → ""
const description = sanitizeString(body.description);
const subject = sanitizeString(body.subject);
```

This prevents stored XSS — malicious scripts injected into form fields are stripped before storage and can never be served back to other users.

---

### 6. CSRF Prevention

StudyFlow uses two layers of CSRF protection:

#### Layer 1 — SameSite cookie
The session cookie is set with `sameSite: "lax"` — browsers will not send it on cross-site POST requests initiated by third-party sites.

#### Layer 2 — HttpOnly cookie
The session cookie is `httpOnly: true` — it cannot be read or manipulated by JavaScript, preventing cookie theft via XSS.

#### Layer 3 — Content-Type validation
All mutation endpoints expect `Content-Type: application/json` — standard HTML form submissions (the classic CSRF vector) use `application/x-www-form-urlencoded` and are rejected.

---

### 7. Secure API Key Handling

All sensitive credentials are stored as **environment variables** and never committed to the repository.

| Secret | Storage | Usage |
|---|---|---|
| `FIREBASE_PRIVATE_KEY` | GitHub Secrets → container env | Firebase Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | GitHub Secrets → container env | Firebase Admin SDK |
| `GEMINI_API_KEY` | GitHub Secrets → container env | Gemini AI API |
| `DATABASE_URL` | GitHub Secrets → container env | Neon PostgreSQL |

#### .gitignore protection
```
.env
.env.*
!.env.example
```

#### Runtime injection
Secrets are injected at container runtime via Docker Compose `environment:` section — they are never baked into the Docker image at build time.

#### NEXT_PUBLIC_* separation
Firebase client-side keys (`NEXT_PUBLIC_FIREBASE_*`) are intentionally public — they are baked into the frontend bundle at build time. They are protected by Firebase Security Rules, not by secrecy.

Server-side secrets (`FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `DATABASE_URL`, `GEMINI_API_KEY`) are never exposed to the browser.

---

### 8. Security Testing

Security was verified with automated tests in `tests/security.test.ts` (44 tests):

| Category | Tests |
|---|---|
| Authentication | 9 protected routes blocked without cookie, fake/malformed tokens rejected |
| Authorization (IDOR) | Cannot access another user's tasks/events/notifications by guessing IDs |
| XSS Prevention | 8 XSS payloads in all text fields — all stripped before storage |
| SQL Injection | 8 SQL payloads in title/ID/query params — Prisma prevents all |
| Input Validation | Title too long, negative values, invalid enums, null values all rejected |
| Sensitive Data | No stack traces or DB internals in error responses |
| Abuse Prevention | 10 rapid requests — server stays stable |

---

## 10. Testing Documentation

### Overview

| Suite | Tests | Type | Requires Server |
|---|---|---|---|
| `ai-engine.test.ts` | 25 | AI engine unit | No |
| `unit.test.ts` | 71 | API route unit + Admin RBAC | No |
| `frontend.test.tsx` | 74 | Frontend UI | No |
| `integration.test.ts` | 27 | API ↔ Database | Yes |
| `security.test.ts` | 44 | Security | Yes |
| `ai.test.ts` | 64 | AI input variations | Yes |
| `ai-consistency.test.ts` | 70 | AI consistency & output | Yes |
| `ai-failure.test.ts` | 51 | AI failure handling | Yes |
| `ai-abuse.test.ts` | 50 | AI abuse & misuse | Yes |
| **Total** | **476** | **Full stack** | |

---

### unit.test.ts — API Route Unit + Admin RBAC (71 tests) (BACKEND)

![Backend Tests](<Test Screenshot/Backend Testing.png>)

| Category | What it tests |
|---|---|
| `sanitizeString` | XSS stripping, whitespace trim, truncation, non-string input |
| `verifySession` | No cookie, valid cookie, expired cookie |
| `parseBody` | Valid body, invalid body, malformed JSON |
| Response helpers | `unauthorized` 401, `badRequest` 400, `notFound` 404, `serverError` 500 |
| `GET /api/tasks` | 401, 200, status filter, priority filter, DB error |
| `POST /api/tasks` | 401, missing title, empty title, bad priority, bad date, XSS strip, deadline notification |
| `GET/PUT/DELETE /api/tasks/[id]` | 401, 404, 400 bad id, 200, completedAt logic, AI event cleanup |
| `POST /api/session` | No token, invalid token, valid token, Bearer header |
| `POST /api/auth/send-reset-email` | 401, no email, success, Firebase error |
| `GET/PUT /api/user/profile` | 401, 200, upsert on first login, DB error |

---

### frontend.test.tsx — Frontend UI (74 tests)

![Frontend Tests](<Test Screenshot/front end.png>)

| Page | What it tests |
|---|---|
| Login | Empty fields, invalid email, inline error, password toggle, loading state, Firebase errors, forgot password, Enter key |
| Register | Empty name, short password, password mismatch, live feedback, email taken, loading state, redirect on success |
| Tasks | Empty state, modal open/close, submit disabled, search filter, tab filters, success/error toasts, 401 redirect |
| Settings | Tab switching, profile fields, delete confirmation, DELETE typing, cancel delete, save profile toast |
| Dashboard | Loading state, empty state, stat cards, AI button, task list, 401 redirect |
| Analytics | Range filters, error state, retry button, stat cards, 401 redirect |
| Notifications | Unread badge, filter tabs, unread only toggle, mark all read, clear all, empty state, 401 redirect |

---

### integration.test.ts — API ↔ Database (27 tests)

![Integration Tests](<Test Screenshot/Integration.png>)

| Category | What it tests |
|---|---|
| Authentication | 401 without cookie on all routes, 200 with valid cookie |
| Tasks API→DB | POST saves to DB, XSS stripped, invalid data rejected and not saved |
| Tasks DB→API | Direct DB insert returned by API, status filter, 404 for missing |
| Tasks Update | PUT updates DB, completedAt set/cleared correctly |
| Tasks Delete | DELETE removes from DB, 404 for non-existent task |
| User Profile | GET returns DB data, PUT updates DB record |
| Notifications | DB→API returns records, PATCH marks as read in DB |
| Settings | GET returns DB settings, PUT updates DB |
| Events | POST saves to DB, DELETE removes from DB |

---

### security.test.ts — Security (44 tests)

![Security Tests](<Test Screenshot/Security testing.png>)

| Category | What it tests |
|---|---|
| Authentication | 9 protected routes blocked without cookie, fake/malformed/injected tokens all rejected |
| Authorization (IDOR) | Cannot read/edit/delete another user's tasks, notifications, events by guessing IDs |
| XSS Prevention | 8 XSS payloads in title/description/subject/event title all stripped or rejected |
| SQL Injection | 8 SQL payloads in title/ID/query params — Prisma parameterized queries prevent all |
| Input Validation | Title too long, negative minutes, invalid date/enum, empty body, malformed JSON, null values |
| Sensitive Data | No stack traces in errors, no DB internals, no passwords in responses |
| Abuse Prevention | 10 rapid unauthenticated + 10 authenticated requests — server stays stable |

---

### ai.test.ts — AI Input Variations (64 tests)

![AI Tests](<Test Screenshot/AITEST.png>)

| Category | What it tests |
|---|---|
| `computePriorityScore` valid | HIGH/MEDIUM/LOW scoring, deadline urgency, quick/long task bonuses, 0-100 range |
| `computePriorityScore` edge | Due exactly now, 1 year away, null estimatedMins, deterministic output |
| `prioritizeTasks` valid | Empty list, ordering, summary, timestamps, required fields |
| `prioritizeTasks` edge | 100 tasks, all completed, identical scores, empty title |
| `optimizeSchedule` valid | Focus blocks, breaks, endHour boundary, peak window |
| `optimizeSchedule` edge | Null focusScore, 50 tasks, no estimatedMins, future date |
| `/api/ai/prioritize` | 401, response shape, aiScore 0-100, caching across calls |
| `/api/ai/schedule` | 401, valid/invalid date, empty body, block hour limits |
| `/api/ai/chat` | 401, valid message, empty/long message, XSS, multi-turn history |

---

### ai-consistency.test.ts — AI Consistency & Expected Output (70 tests)

![AI Consistency Tests](<Test Screenshot/ai consistency test.png>)

| Category | What it tests |
|---|---|
| `computePriorityScore` consistency | Same task = same score 10x, urgency increases as deadline approaches |
| `computePriorityScore` expected output | HIGH+overdue = exactly 80, quick bonus = exactly +5, long penalty = exactly -5 |
| `prioritizeTasks` consistency | Same list = same order every time, stable across 5 repeated calls |
| `prioritizeTasks` expected output | Urgent task always #1, overdue beats future, suggestedOrder has no gaps |
| `computeTaskHash` consistency | Same tasks = same hash, completed tasks excluded from hash, always 24-char hex |
| `optimizeSchedule` consistency | Same inputs = same block count and study minutes, HIGH before LOW always |
| `optimizeSchedule` expected output | Block duration matches estimatedMins, break matches shortBreakMins |
| `/api/ai/prioritize` consistency | 3 parallel calls = identical order, aiScores stable, all fields present |
| `/api/ai/schedule` consistency | Blocks chronological, startHour < endHour, totalStudyMin = sum of focus blocks |

---

### ai-failure.test.ts — AI Failure Handling (51 tests)

![AI Failure Tests](<Test Screenshot/AI-Failure Test.png>)

| Category | What it tests |
|---|---|
| Invalid inputs (engine) | undefined priority, null dueDate, invalid dates, zero/negative/huge estimatedMins |
| Invalid task data | null/undefined title, special chars, unicode, 10,000-char title, mixed valid/invalid |
| Invalid schedule data | empty sessions, invalid hours, start > end, zero pomodoroMins, malformed events |
| Malformed API requests | No body, invalid JSON, null message, wrong history format — all handled without crash |
| Graceful degradation | AI returns valid structure even with 0 tasks, no stack traces exposed in responses |
| Timeout & response time | Prioritize/schedule within 10s, chat within 30s, AbortController handled |
| Boundary modes | Never returns null/NaN/Infinity/empty string from any AI function |

---

### ai-abuse.test.ts — AI Abuse & Misuse (50 tests)

![AI Abuse Tests](<Test Screenshot/ai promp injection.png>)

| Category | What it tests |
|---|---|
| Prompt injection (engine) | 12 injection payloads in title/description/subject — scoring and ordering unaffected |
| Nonsensical input (engine) | 18 garbage inputs — engine never crashes, valid tasks still ranked correctly |
| Chat prompt injection | Server responds without crashing, no system prompt revealed, no user data leaked |
| Chat jailbreak attempts | 8 jailbreak payloads — AI behavior unchanged, server stays stable |
| Chat nonsensical messages | Empty/whitespace/emoji/garbage messages — no crash |
| Chat abuse patterns | Repeated identical messages, 50-turn malicious history, role manipulation — all safe |
| Prioritize abuse | Rapid calls, unknown fields, prototype pollution — response shape always correct |
| Schedule abuse | Extra fields ignored, extreme dates (1970/2099) handled, rapid calls stable |
| Task creation abuse | Injection titles sanitized, nonsensical titles stored/rejected cleanly, 10 rapid creates |

---

### Running Tests

```bash
# No server needed
npm test

# Requires: npm run dev + valid session cookie
$env:TEST_SESSION_COOKIE="your-session-cookie"
npx jest tests/integration.test.ts
npx jest tests/security.test.ts
npx jest tests/ai.test.ts
npx jest tests/ai-consistency.test.ts
npx jest tests/ai-failure.test.ts
npx jest tests/ai-abuse.test.ts
```

---

## 11. Deployment & Production Setup

## 🌐 Live Application

**https://e2526-wads-b4cc.csbihub.id/**

📄 **API Documentation (Swagger):** https://e2526-wads-b4cc.csbihub.id/api-docs

### Docker Setup

- Dockerfile included ✓
- docker-compose.yml included ✓

### Production Environment

All sensitive credentials are stored as environment variables and never committed to the repository. Secrets are injected at container runtime via Docker Compose `environment:` section — they are never baked into the Docker image at build time.

| Secret | Storage | Usage |
|---|---|---|
| `FIREBASE_PRIVATE_KEY` | GitHub Secrets → container env | Firebase Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | GitHub Secrets → container env | Firebase Admin SDK |
| `GEMINI_API_KEY` | GitHub Secrets → container env | Gemini AI API |
| `DATABASE_URL` | GitHub Secrets → container env | Neon PostgreSQL |

HTTPS is enforced in production. Session cookies are set with `secure: true` in production, ensuring they are only transmitted over HTTPS.

---

## 12. GitHub Contribution Summary

### Jovan Nikholas (jovannik88)

**Features implemented:**
- Firebase Authentication integration (login, register, Google sign-in, password reset)
- Settings page — profile management, notification preferences, account deletion
- Docker containerization — multi-stage Dockerfile, docker-compose.yml
- CI/CD pipeline — GitHub Actions (quality → build → deploy)
- Neon PostgreSQL migration and production database setup
- VPS Setup (Configering Docker, cicd.yml)

**API endpoints handled:**
- `DELETE /api/user` — Delete user account

**Tests written:**
- `tests/unit.test.ts` — 63 API route unit tests
- `tests/frontend.test.tsx` — 74 frontend UI tests
- `tests/integration.test.ts` — 27 API ↔ Database integration tests
- `tests/security.test.ts` — 44 security tests (XSS, SQL injection, auth, IDOR)
- `tests/ai.test.ts` — 64 AI input variation tests
- `tests/ai-consistency.test.ts` — 70 AI consistency and expected output tests
- `tests/ai-failure.test.ts` — 51 AI failure handling tests
- `tests/ai-abuse.test.ts` — 50 AI abuse and misuse tests

**Security work:**
- Configured HttpOnly, Secure, SameSite session cookies
- Set up GitHub Secrets for secure environment variable handling
- Wrote 44 automated security tests covering auth, IDOR, XSS, SQL injection

**AI-related work:**
- AI Help me to make the testing scripts, as well as reviewing my code if there is any erorr
- It help me sets up github workflows cicd.yml, Dockerfile

---

### Lyonnel Judson Saputra (LyonelJS)

**Features implemented:**
- Set up the initial Next.js project structure and App Router routing
- Dashboard page — overview stats, task summary, AI suggestions (frontend + backend)
- Calendar page — monthly view, AI-generated study blocks, event creation (frontend + backend)
- Study Timer page — Pomodoro-style focus timer, session logging (frontend + backend)
- AI Assistant page — multi-turn chat with Gemini, context-aware responses (frontend + backend)
- Notifications page — in-app alerts, read/unread, filter tabs, clear all (frontend + backend)
- Admin panel — users, analytics, broadcast notifications, AI monitor (all 4 pages + all API routes)

**API endpoints handled:**
- `GET /api/analytics` — Productivity stats (study hours, task completion, focus scores)
- `GET /api/events`, `POST /api/events`, `DELETE /api/events/{id}` — Calendar events
- `POST /api/timer/complete` — Save study session and trigger AI feedback
- `GET /api/study-sessions` — Study session history
- `POST /api/ai/prioritize` — AI task prioritization
- `POST /api/ai/schedule` — AI schedule optimization
- `POST /api/ai/chat` — AI chat assistant
- `POST /api/ai-optimize` — Generate and save AI schedule to calendar
- `GET /api/notifications`, `POST /api/notifications`, `PATCH /api/notifications/{id}`, `DELETE /api/notifications/{id}`, `PATCH /api/notifications/read-all`, `DELETE /api/notifications`, `POST /api/notifications/check-sessions` — Full notifications system
- `GET /api/admin/users`, `DELETE /api/admin/users/{uid}`, `PATCH /api/admin/users/{uid}` — Admin user management
- `GET /api/admin/analytics` — System-wide stats for admin
- `POST /api/admin/notifications/broadcast` — Broadcast notification to all users
- `GET /api/admin/ai-usage` — AI usage monitoring

**Tests written:**
- 8 admin RBAC tests added to `tests/unit.test.ts` — unauthenticated and non-admin blocked
- Swagger API documentation (`lib/swagger.ts` + `/api-docs` page) — documents all endpoints

**Security work:**
- Role-based access control — all admin routes require `role === ADMIN` before any action
- Admin access restricted to a single authorized email, verified on every request
- Input sanitization on all user submitted data (task titles, chat messages, notification content)
- All dashboard and AI endpoints verify session before responding

**AI-related work:**
- Used AI to brainstorm the overall system architecture and feature breakdown
- Used AI for debugging UI and API issues during development
- Used AI as a checklist tool to verify all project requirements were met

---

### MANJAKAMANANA MAMY JEAN (Mamy32)

**Features implemented:**
- Write Here

**API endpoints handled:**
- Write Here

**Tests written:**
- Contributed to AI engine test coverage

**Security work:**
- Write Here

**AI-related work:**
- Write Here

---

## 13. AI Usage Disclosure

| Tool | Purpose | Parts assisted |
|---|---|---|
| **Claude (Anthropic)** | Reviewing testing code , setting up VPS | |
| **Gemini 2.5 Flash (Google)** | In-app AI feature — task prioritization reasoning and schedule optimization | Runtime AI feature only, not development assistance |

**Disclosure statement:**

Claude (Anthropic) was used extensively during development to assist with:
- helping testing, aswell creating payload for testing the AI

All AI-assisted code was reviewed, understood, and modified by the team before being committed. The core application logic, database schema, UI components, and AI engine algorithms were designed and implemented by the team. AI tools were used as a development accelerator, not as a replacement for understanding.

Gemini 2.5 Flash is used as a runtime feature within the application itself — it powers the AI chat assistant, task prioritization reasoning, and schedule optimization suggestions shown to end users.

---

## 14. Known Limitations & Future Improvements

### Current Limitations

**AI limitations:**
- Task prioritization uses a deterministic scoring algorithm — not a true ML model. Scores are based on fixed weights (priority, deadline, estimated time) and do not learn from user behaviour over time
- Schedule optimizer does not account for user energy levels beyond historical session focus scores
- Gemini API has rate limits — heavy concurrent usage may result in delayed responses
- AI cache is per-user only — no shared learning across users

**Application limitations:**
- No real-time collaboration features — multi-user study groups not supported
- Notifications are in-app only — no push notifications or email alerts
- Calendar view does not sync with external calendars (Google Calendar, iCal)
- Study timer does not resume after page refresh
- No offline support — requires active internet connection

**Infrastructure limitations:**
- Single VPS deployment — no horizontal scaling or load balancing
- No automated database backups configured for Neon
- Session cookie expires after 14 days — no refresh token mechanism

### Possible Future Enhancements

- **ML-based prioritization** — replace deterministic scoring with a model that learns from user completion patterns
- **External calendar sync** — Google Calendar / iCal integration for importing classes and exams
- **Push notifications** — browser push or email reminders for upcoming deadlines
- **Study groups** — collaborative study sessions with shared task boards
- **Mobile app** — React Native version for iOS and Android
- **Offline mode** — service worker caching for basic functionality without internet
- **Analytics export** — PDF/CSV export of productivity reports
- **Voice input** — voice-to-text for adding tasks via AI chat

### AI Limitations and Risks

| Risk | Description | Mitigation |
|---|---|---|
| Hallucination | Gemini may give incorrect study advice | Responses are advisory only, not authoritative |
| Prompt injection | Users may attempt to manipulate AI via task titles | Inputs sanitized before DB storage; engine scoring is deterministic |
| API dependency | App degrades if Gemini API is unavailable | Graceful error handling — app functions without AI features |
| Data privacy | Task content sent to Gemini API | Only task titles and metadata sent, no personal identifiable data beyond what Firebase already holds |
| Cache staleness | AI scores may be outdated if tasks change rapidly | `taskHash` invalidates cache on any task change |

---

## 15. Final Declaration

We declare that:

- This project is our own original work, completed as part of the WADS final project requirement at BINUS University International
- All AI tool usage has been honestly disclosed in Section 13 above
- All group members have reviewed, understood, and can explain the system they contributed to
- The codebase, architecture decisions, and design choices reflect the team's own understanding and judgment
- Any external libraries, frameworks, and APIs used are properly attributed in the tech stack section

**Signed by Group Members:**

| Name | Student ID | GitHub |
|---|---|---|
| Jovan Nikholas | 2902641811 | @jovannik88 |
| Lyonnel Judson Saputra | 2802505853 | @LyonelJS |
| MANJAKAMANANA MAMY JEAN | 2902639832 | @Mamy32 |

*BINUS University International — Web Application Development and Security (COMP6703001) — Class L4CC — June 2026*

---

## 16. Setup Instructions

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (or use Docker Compose)
- A [Google AI Studio](https://aistudio.google.com/) API key
- A Firebase project with Authentication enabled

### 1. Clone the repository

```bash
git clone https://github.com/jovannik88/WADS-Final-Project.git
cd WADS-Final-Project
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file at the project root (copy from `.env.example` if provided):

```env
# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/studyflow"

# Firebase (client-side — prefix NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-side)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Gemini AI
GEMINI_API_KEY=
```

### 4. Run database migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 17. Deployment Instructions

### Run with Docker Compose

Starts both the PostgreSQL database and the Next.js app:

```bash
docker compose up --build
```

---

## 18. Presentation Video

📹 **YouTube:** [add link here]

> 6–8 minute walkthrough of the application and its features. Includes face, voice, and captions. No code explanation.

---

## Project Structure

```
WADS-Final-Project/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout (Toaster, metadata)
│   ├── globals.css               # Global styles
│   ├── login/                    # Login page
│   ├── register/                 # Sign-up page
│   ├── api-docs/                 # Swagger UI page (/api-docs)
│   ├── admin/                    # Admin panel (lyonel@gmail.com only)
│   │   ├── layout.tsx            # Admin sidebar layout
│   │   ├── users/                # User management
│   │   ├── analytics/            # System-wide analytics
│   │   ├── notifications/        # Broadcast notifications
│   │   └── ai-monitor/           # AI usage monitoring
│   ├── dashboard/                # Main user dashboard
│   │   ├── page.tsx              # Dashboard home
│   │   ├── layout.tsx            # Dashboard sidebar + nav
│   │   ├── tasks/                # Task manager
│   │   ├── calendar/             # Calendar view
│   │   ├── ai/                   # AI assistant chat
│   │   ├── analytics/            # Productivity analytics
│   │   ├── timer/                # Pomodoro study timer
│   │   ├── notifications/        # In-app notifications
│   │   └── settings/             # User preferences
│   └── api/                      # REST API route handlers
│       ├── session/              # Login session (POST)
│       ├── logout/               # Logout (POST)
│       ├── tasks/                # Tasks CRUD
│       ├── events/               # Calendar events CRUD
│       ├── notifications/        # Notifications CRUD
│       ├── study-sessions/       # Study session history
│       ├── timer/                # Complete timer session
│       ├── analytics/            # Productivity stats
│       ├── settings/             # User settings
│       ├── user/                 # Profile + preferences
│       ├── export/               # Data export
│       ├── auth/                 # Password reset
│       ├── ai-optimize/          # Trigger AI schedule generation
│       ├── ai/                   # AI endpoints
│       │   ├── prioritize/       # Task prioritization
│       │   ├── schedule/         # Schedule optimization
│       │   └── chat/             # AI chat assistant
│       └── admin/                # Admin-only endpoints
│           ├── users/            # List / delete / deactivate users
│           ├── analytics/        # System-wide stats
│           ├── ai-usage/         # AI monitoring
│           └── notifications/    # Broadcast notifications
│               └── broadcast/
├── lib/                          # Shared server utilities
│   ├── admin.ts                  # Admin email constant
│   ├── ai-cache.ts               # AI result caching (24h TTL)
│   ├── ai-engine.ts              # Deterministic schedule optimizer
│   ├── ai-sync-context.tsx       # Client-side AI sync state
│   ├── api-helpers.ts            # verifySession, sanitize, response helpers
│   ├── auth.ts                   # Auth utilities
│   ├── firebase-admin.ts         # Firebase Admin SDK init
│   ├── firebase.ts               # Firebase client SDK init
│   ├── gemini.ts                 # Gemini API client + system prompt
│   ├── notify.ts                 # createNotification helper
│   ├── prisma.ts                 # Prisma client singleton
│   ├── swagger.ts                # OpenAPI 3.0 spec (manual)
│   └── utils.ts                  # Misc utilities
├── prisma/                       # Database
│   ├── schema.prisma             # Data models and relations
│   └── migrations/               # SQL migration history
├── tests/                        # Automated test suite (476 tests)
│   ├── unit.test.ts              # API route unit + Admin RBAC (71)
│   ├── frontend.test.tsx         # UI component tests (74)
│   ├── integration.test.ts       # API ↔ DB integration (27)
│   ├── security.test.ts          # Security tests (44)
│   ├── ai-engine.test.ts         # AI engine unit (25)
│   ├── ai.test.ts                # AI input variations (64)
│   ├── ai-consistency.test.ts    # AI consistency (70)
│   ├── ai-failure.test.ts        # AI failure handling (51)
│   └── ai-abuse.test.ts          # AI abuse & misuse (50)
├── components/                   # Reusable React components
├── public/                       # Static assets
├── Dockerfile                    # Production Docker image
├── docker-compose.yml            # Local dev with PostgreSQL
└── .github/workflows/cicd.yml   # GitHub Actions CI/CD pipeline
```