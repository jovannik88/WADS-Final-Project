import { PrismaClient } from "@prisma/client";
import { Priority, Status, EventType, NotifType, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed a demo user (mirrors a real Firebase UID — replace with yours)
  const demoUid = "demo-user-seed-001";

  await prisma.user.upsert({
    where: { id: demoUid },
    update: {},
    create: {
      id: demoUid,
      email: "demo@studyflow.app",
      name: "Jean Demo",
      role: Role.USER,
    },
  });

  // Seed user settings
  await prisma.userSettings.upsert({
    where: { userId: demoUid },
    update: {},
    create: {
      userId: demoUid,
      preferredStartHour: 7,
      preferredEndHour: 23,
      pomodoroMins: 25,
      shortBreakMins: 5,
      longBreakMins: 15,
      timezone: "Asia/Jakarta",
      updatedAt: new Date(),
    },
  });

  // Seed tasks
  const now = new Date();
  const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  await prisma.task.createMany({
    skipDuplicates: true,
    data: [
      {
        userId: demoUid,
        title: "CS Project Milestone",
        description: "Finish the frontend prototype and connect to the API",
        subject: "Computer Science",
        priority: Priority.HIGH,
        estimatedMins: 150,
        dueDate: in1Day,
        status: Status.PENDING,
        aiScore: 85,
        aiReason: "high priority, due within 24 hours",
      },
      {
        userId: demoUid,
        title: "Calculus Problem Set",
        description: "Complete exercises 1-20 from chapter 4",
        subject: "Math",
        priority: Priority.HIGH,
        estimatedMins: 90,
        dueDate: in2Days,
        status: Status.PENDING,
        aiScore: 65,
        aiReason: "high priority, due in 2 days",
      },
      {
        userId: demoUid,
        title: "English Essay Draft",
        description: "First draft of comparative essay on modernism",
        subject: "English",
        priority: Priority.MEDIUM,
        estimatedMins: 60,
        dueDate: in2Days,
        status: Status.PENDING,
        aiScore: 45,
        aiReason: "medium priority, due in 2 days",
      },
      {
        userId: demoUid,
        title: "Physics Lab Report",
        description: "Write up results from Tuesday's pendulum experiment",
        subject: "Physics",
        priority: Priority.MEDIUM,
        estimatedMins: 75,
        dueDate: in5Days,
        status: Status.PENDING,
        aiScore: 25,
        aiReason: "medium priority, due this week",
      },
      {
        userId: demoUid,
        title: "Calculus Review",
        description: "Review chapters 1-3 for upcoming quiz",
        subject: "Math",
        priority: Priority.LOW,
        estimatedMins: 45,
        dueDate: in5Days,
        status: Status.COMPLETED,
        aiScore: 10,
        aiReason: "low priority, due this week, quick win",
      },
    ],
  });

  // Seed study sessions (last 7 days, peak around 7-9 PM)
  const sessions = [];
  for (let i = 0; i < 7; i++) {
    const sessionDate = new Date(now);
    sessionDate.setDate(sessionDate.getDate() - i);
    sessionDate.setHours(19, 0, 0, 0);
    const end = new Date(sessionDate.getTime() + 90 * 60 * 1000);
    sessions.push({
      userId: demoUid,
      subject: ["Math", "Physics", "English", "Computer Science"][i % 4],
      durationMin: 25 + Math.floor(Math.random() * 50),
      focusScore: 70 + Math.random() * 25,
      startedAt: sessionDate,
      endedAt: end,
    });
  }
  await prisma.studySession.createMany({ data: sessions, skipDuplicates: true });

  // Seed events
  const todayStart = new Date(now);
  todayStart.setHours(9, 0, 0, 0);

  await prisma.event.createMany({
    skipDuplicates: true,
    data: [
      {
        userId: demoUid,
        title: "CS Lecture",
        startTime: new Date(todayStart.getTime() + 0),
        endTime: new Date(todayStart.getTime() + 90 * 60 * 1000),
        eventType: EventType.CLASS,
        color: "#14b8a6",
      },
      {
        userId: demoUid,
        title: "Calculus Exam",
        startTime: new Date(in5Days.setHours(10, 0, 0, 0)),
        endTime: new Date(in5Days.setHours(12, 0, 0, 0)),
        eventType: EventType.EXAM,
        color: "#ef4444",
      },
    ],
  });

  // Seed notifications
  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      {
        userId: demoUid,
        title: "AI Priority Update",
        body: 'Start with "CS Project Milestone" — high priority, due within 24 hours.',
        type: NotifType.AI_ALERT,
        read: false,
      },
      {
        userId: demoUid,
        title: "Deadline Tomorrow",
        body: "CS Project Milestone is due tomorrow at this time.",
        type: NotifType.DEADLINE,
        read: false,
      },
      {
        userId: demoUid,
        title: "5-Day Streak!",
        body: "You have studied 5 days in a row. Keep it up!",
        type: NotifType.ACHIEVEMENT,
        read: true,
      },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
