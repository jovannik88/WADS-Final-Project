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


## 🌐 Live Application

**https://e2526-wads-b4cc.csbihub.id/**

📄 **API Documentation (Swagger):** https://e2526-wads-b4cc.csbihub.id/api-docs

---

**Project Overview**

Project Title: Study planner and productivity tracker


The purpose of this project is to help students plan their study sessions by organizing assignments and test deadline reminders that can be viewed directly in their calendar. Every completed or accomplished task will be tracked in a dashboard, allowing students to monitor their progress and productivity.

This web application will also include a notification feature that reminds users about upcoming deadlines and important reminders.

Additionally, the program will include two AI-powered functions designed to help students determine which tasks they should prioritize. These AI features will assist in organizing student schedules and improving task prioritization.

## AI Integration Layer

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


##


## System Architecture

### 3.1 Front-end layer (Next.js)

Basically, the front-end is built using next.js react framework and is responsible for:

- rendering the user interface such as dashboard,study planer, task forms etc…
- communicating with the back-end (Node.js)
- displaying Ai-generated recommendation and classifications.

The Front End, will get the data from the Backend Layer by fetching it

This front-end does not directly access the database and Ai services, all interactions are handled across secure back-end API.

---

### 3.2 Back-end layer (Node.js)

The back-end is implemented using node.js and follows a Restful API architecture.

Responsibilities include:

- Handling HTTP requests (GET, POST, PUT, DELETE)
- Authentication using JWT
- Authorization with role-based access control
- Business logic implementation
- Input validation and output sanitization
- Secure interaction with the database using Prisma
- Orchestration of AI services

The Backend is acting as a Database Management System (DBMS), the function is to utilize database data to be displayed in the front end.

---

### 3.3 Database layer (PostgresSQL with prisma)

The database layer uses PostgresSQL with prisma ORM

Responsibilities include:

- For storing the users, study tasks, study sessions and productivity logs
- Secure database access restricted to the back-end only
- Enforcing relational data integrity

> **Note:** In the final implementation the front-end (Next.js) and back-end API routes are unified into a single **Next.js full-stack application**. The API layer is served via Next.js Route Handlers (`app/api/`) and communicates directly with PostgreSQL through Prisma ORM, eliminating the need for a separate Node.js server.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Firebase Authentication + Firebase Admin SDK |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| AI | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| Containerization | Docker + Docker Compose |

---

## Getting Started

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

### Run with Docker Compose

Starts both the PostgreSQL database and the Next.js app:

```bash
docker compose up --build
```

---

## Features

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

## API Design

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

## Project Structure

```
WADS-Final-Project/
├── app/                  # Next.js App Router pages and API routes
│   ├── api/              # REST API route handlers
│   └── dashboard/        # Dashboard pages (tasks, calendar, AI, etc.)
├── components/           # Reusable React components
├── lib/                  # Shared utilities
│   ├── ai-engine.ts      # Deterministic schedule optimizer
│   ├── ai-cache.ts       # Prioritization caching layer
│   └── gemini.ts         # Gemini API client + system prompt
├── prisma/               # Database schema and migrations
├── public/               # Static assets
├── Dockerfile            # Production Docker image
└── docker-compose.yml    # Local dev with PostgreSQL
```

## System Architecture

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

## Database Schema (ERD)

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

## Testing


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