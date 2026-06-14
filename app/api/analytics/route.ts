// GET handler for /api/analytics: returns all productivity stats for the analytics dashboard

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession, unauthorized, serverError } from "@/lib/api-helpers";
import { Status, Priority } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await verifySession(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") ?? "week";
    const days = range === "week" ? 7 : range === "month" ? 30 : 365;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const prevSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);

    const [allTasks, sessions, prevSessions, prevCompleted] = await Promise.all([
      prisma.task.findMany({ where: { userId: user.uid } }),
      prisma.studySession.findMany({
        where: { userId: user.uid, startedAt: { gte: since } },
        orderBy: { startedAt: "asc" },
      }),
      prisma.studySession.findMany({
        where: { userId: user.uid, startedAt: { gte: prevSince, lt: since } },
      }),
      prisma.task.count({ where: { userId: user.uid, status: Status.COMPLETED, completedAt: { gte: prevSince, lt: since } } }),
    ]);

    // Stat cards
    const completedTasks = allTasks.filter(t => t.status === Status.COMPLETED);
    const completedInPeriod = allTasks.filter(t =>
      t.status === Status.COMPLETED && t.completedAt && t.completedAt >= since
    );
    const completedPrevPeriod = prevCompleted;

    const totalFocusMin = sessions.reduce((s, x) => s + x.durationMin, 0);
    const prevFocusMin  = prevSessions.reduce((s, x) => s + x.durationMin, 0);

    const avgDailyFocusMin = sessions.length > 0 ? totalFocusMin / days : 0;
    const prevAvgDailyFocusMin = prevSessions.length > 0 ? prevFocusMin / days : 0;
    const avgDailyDiff = avgDailyFocusMin - prevAvgDailyFocusMin;

    const subjects = [...new Set(allTasks.map(t => t.subject).filter(Boolean))];

    // Daily study hours (bar chart)
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < Math.min(days, 30); i++) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = 0;
    }
    sessions.forEach(s => {
      const day = s.startedAt.toISOString().slice(0, 10);
      if (dailyMap[day] !== undefined) dailyMap[day] += s.durationMin;
    });
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyStudyHours = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, mins]) => ({
        day: dayLabels[new Date(date + "T12:00:00").getDay()],
        hours: parseFloat((mins / 60).toFixed(2)),
      }));

    // Subject breakdown (pie)
    const COLORS = ["#3b82f6","#8b5cf6","#10b981","#0d9488","#f59e0b","#ef4444","#6366f1","#ec4899"];
    const subjectMinMap: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.subject) subjectMinMap[s.subject] = (subjectMinMap[s.subject] ?? 0) + s.durationMin;
    });
    // Also count tasks without sessions by subject
    allTasks.forEach(t => {
      if (t.subject && !subjectMinMap[t.subject]) subjectMinMap[t.subject] = 0;
    });
    const subjectBreakdown = Object.entries(subjectMinMap)
      .filter(([, m]) => m > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([subject, mins], i) => ({
        subject,
        hours: parseFloat((mins / 60).toFixed(1)),
        color: COLORS[i % COLORS.length],
      }));

    // Tasks by priority
    const tasksByPriority = ([Priority.HIGH, Priority.MEDIUM, Priority.LOW] as Priority[]).map(p => ({
      priority: p.charAt(0) + p.slice(1).toLowerCase(),
      completed: allTasks.filter(t => t.priority === p && t.status === Status.COMPLETED).length,
      pending: allTasks.filter(t => t.priority === p && t.status !== Status.COMPLETED).length,
    }));

    // Scheduled vs actual duration (by subject)
    const scheduledMap: Record<string, number[]> = {};
    const actualMap: Record<string, number[]> = {};
    allTasks.forEach(t => {
      if (t.subject && t.estimatedMins) {
        if (!scheduledMap[t.subject]) scheduledMap[t.subject] = [];
        scheduledMap[t.subject].push(t.estimatedMins);
      }
    });
    sessions.forEach(s => {
      if (s.subject) {
        if (!actualMap[s.subject]) actualMap[s.subject] = [];
        actualMap[s.subject].push(s.durationMin);
      }
    });
    const allSubjectsForComparison = new Set([...Object.keys(scheduledMap), ...Object.keys(actualMap)]);
    const scheduledVsActual = [...allSubjectsForComparison].map(subject => ({
      subject: subject.length > 8 ? subject.slice(0, 8) : subject,
      scheduled: scheduledMap[subject]
        ? Math.round(scheduledMap[subject].reduce((a, b) => a + b, 0) / scheduledMap[subject].length)
        : 0,
      actual: actualMap[subject]
        ? Math.round(actualMap[subject].reduce((a, b) => a + b, 0) / actualMap[subject].length)
        : 0,
    })).filter(r => r.scheduled > 0 || r.actual > 0);

    // Peak study hours
    const hourCount: Record<number, number> = {};
    sessions.forEach(s => {
      const h = new Date(s.startedAt).getHours();
      hourCount[h] = (hourCount[h] ?? 0) + 1;
    });
    const hourLabels = ["12AM","1AM","2AM","3AM","4AM","5AM","6AM","7AM","8AM","9AM","10AM","11AM",
                        "12PM","1PM","2PM","3PM","4PM","5PM","6PM","7PM","8PM","9PM","10PM","11PM"];
    const peakHours = Array.from({ length: 24 }, (_, h) => ({
      hour: hourLabels[h],
      sessions: hourCount[h] ?? 0,
    })).filter((_, h) => h >= 6); // show 6AM onward

    // Study streak
    const allSessions = await prisma.studySession.findMany({
      where: { userId: user.uid },
      select: { startedAt: true },
    });
    const sessionDays = new Set(allSessions.map(s => s.startedAt.toISOString().slice(0, 10)));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (sessionDays.has(d.toISOString().slice(0, 10))) streak++;
      else if (i > 0) break;
    }

    // AI summary stats
    // Peak focus window: find the 2-hour window with most sessions
    const peakHour = Object.entries(hourCount).sort(([,a],[,b]) => b - a)[0]?.[0];
    const peakFocusWindow = peakHour
      ? `${hourLabels[parseInt(peakHour)]} – ${hourLabels[(parseInt(peakHour) + 2) % 24]}`
      : "No sessions yet";

    // Completion rate
    const completionRate = allTasks.length > 0
      ? Math.round((completedTasks.length / allTasks.length) * 100)
      : 0;
    const prevCompletionRate = allTasks.length > 0
      ? Math.round(((completedTasks.length - completedInPeriod.length) / Math.max(allTasks.length - completedInPeriod.length, 1)) * 100)
      : 0;

    // Accuracy gap: subject where actual > scheduled most
    const gapSubject = scheduledVsActual
      .sort((a, b) => (b.actual - b.scheduled) - (a.actual - a.scheduled))[0];
    const accuracyGap = gapSubject && gapSubject.actual > gapSubject.scheduled
      ? `${gapSubject.subject} +${gapSubject.actual - gapSubject.scheduled}m`
      : "On schedule";

    return NextResponse.json({
      // Stat cards
      completedTasksCount: completedInPeriod.length,
      completedTasksDiff: completedInPeriod.length - completedPrevPeriod,
      avgDailyFocusHours: parseFloat((avgDailyFocusMin / 60).toFixed(1)),
      avgDailyFocusDiff: parseFloat((avgDailyDiff / 60).toFixed(1)),
      totalFocusHours: parseFloat((totalFocusMin / 60).toFixed(1)),
      subjectCount: subjects.length,
      studyStreak: streak,
      // Charts
      weeklyStudyHours,
      subjectBreakdown,
      tasksByPriority,
      scheduledVsActual,
      peakHours,
      // AI Summary
      aiSummary: {
        peakFocusWindow,
        completionRate,
        completionRateDiff: completionRate - prevCompletionRate,
        accuracyGap,
        totalSessions: sessions.length,
        avgFocusScore: sessions.length > 0
          ? Math.round(sessions.reduce((s, x) => s + (x.focusScore ?? 70), 0) / sessions.length)
          : 0,
      },
      // Recent sessions
      recentSessions: (await prisma.studySession.findMany({
        where: { userId: user.uid },
        orderBy: { startedAt: "desc" },
        take: 5,
        include: { user: { select: { name: true } } },
      })).map(s => ({
        subject: s.subject ?? "General",
        duration: `${Math.floor(s.durationMin / 60)}h ${s.durationMin % 60}m`.replace("0h ", ""),
        focusScore: s.focusScore ?? null,
        date: formatRelativeDate(s.startedAt),
        startedAt: s.startedAt.toISOString(),
      })),
    }, { status: 200 });
  } catch (err) {
    return serverError(err);
  }
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (diffDays === 1) return "Yesterday";
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  if (diffDays < 7) return days[date.getDay()];
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
