import "server-only";

import { addDays, daysBetween, toISODate } from "@/lib/learning/dates";
import { averageMastery } from "@/lib/learning/mastery";
import { buildDailySession, type PlannedSession } from "@/lib/learning/planner";
import { computeStreak, computeXp, estimateStudyMinutes } from "@/lib/learning/stats";
import { createClient } from "@/lib/supabase/server";

import { listSubjectOverviews, type SubjectOverview } from "./subjects";

export interface DashboardData {
  subjects: SubjectOverview[];
  globalMastery: number;
  nextExam: { subjectId: string; subjectName: string; date: string; daysLeft: number } | null;
  dueFlashcards: number;
  todaySession: { items: (PlannedSession & { subjectName: string })[]; totalMinutes: number; fromPlan: boolean };
  recentAttempts: {
    id: string;
    quizId: string;
    title: string;
    subjectId: string;
    percentage: number;
    score: number;
    total: number;
    completedAt: string;
  }[];
  studyMinutesThisWeek: number;
  streak: number;
  xp: number;
}

export async function getDashboardData(userId: string, timezone: string, dailyMinutes: number): Promise<DashboardData> {
  const supabase = await createClient();
  const today = toISODate(new Date(), timezone);
  const since60 = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [subjects, attemptsRes, reviewsRes, sessionsRes, doneRes] = await Promise.all([
    listSubjectOverviews(),
    supabase
      .from("quiz_attempts")
      .select("id, quiz_id, score, total, percentage, started_at, completed_at, quizzes(title, subject_id)")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .gte("completed_at", since60)
      .order("completed_at", { ascending: false })
      .limit(200),
    supabase.from("flashcard_reviews").select("reviewed_at").eq("user_id", userId).gte("reviewed_at", since60).limit(5000),
    supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("scheduled_date", today)
      .order("position"),
    supabase
      .from("study_sessions")
      .select("duration_minutes, completed_at")
      .eq("user_id", userId)
      .eq("status", "done")
      .gte("completed_at", since60),
  ]);

  const attempts = attemptsRes.data ?? [];
  const reviews = reviewsRes.data ?? [];
  const doneSessions = doneRes.data ?? [];
  const subjectNames = new Map(subjects.map((s) => [s.id, s.name]));

  // Next exam
  const upcoming = subjects
    .filter((s) => s.exam_date && daysBetween(today, s.exam_date) >= 0)
    .sort((a, b) => (a.exam_date! < b.exam_date! ? -1 : 1));
  const next = upcoming[0];

  // Today's session: the saved plan if there is one, otherwise computed live.
  const planned = sessionsRes.data ?? [];
  const todaySession = planned.length
    ? {
        items: planned.map((s) => ({
          date: s.scheduled_date,
          subjectId: s.subject_id,
          topicId: s.topic_id,
          kind: s.kind as PlannedSession["kind"],
          title: s.title,
          durationMinutes: s.duration_minutes,
          position: s.position,
          subjectName: subjectNames.get(s.subject_id) ?? "",
        })),
        totalMinutes: planned.reduce((sum, s) => sum + s.duration_minutes, 0),
        fromPlan: true,
      }
    : (() => {
        const live = buildDailySession({
          startDate: today,
          dailyMinutes,
          subjects: subjects.map((s) => ({
            id: s.id,
            name: s.name,
            examDate: s.exam_date,
            dueFlashcards: s.dueFlashcards,
            topics: s.topics.map((t) => ({ id: t.id, name: t.name, mastery: t.mastery_score })),
          })),
        });
        return {
          items: live.items.map((i) => ({ ...i, subjectName: subjectNames.get(i.subjectId) ?? "" })),
          totalMinutes: live.totalMinutes,
          fromPlan: false,
        };
      })();

  // Engagement
  const activityDays = new Set<string>([
    ...reviews.map((r) => toISODate(new Date(r.reviewed_at), timezone)),
    ...attempts.map((a) => toISODate(new Date(a.completed_at!), timezone)),
    ...doneSessions.filter((s) => s.completed_at).map((s) => toISODate(new Date(s.completed_at!), timezone)),
  ]);
  const weekStart = addDays(today, -6);
  const inWeek = (iso: string) => iso >= since7;

  return {
    subjects,
    globalMastery: averageMastery(subjects.flatMap((s) => s.topics.map((t) => t.mastery_score))),
    nextExam: next
      ? { subjectId: next.id, subjectName: next.name, date: next.exam_date!, daysLeft: daysBetween(today, next.exam_date!) }
      : null,
    dueFlashcards: subjects.reduce((sum, s) => sum + s.dueFlashcards, 0),
    todaySession,
    recentAttempts: attempts.slice(0, 5).map((a) => ({
      id: a.id,
      quizId: a.quiz_id,
      title: a.quizzes?.title ?? "Quiz",
      subjectId: a.quizzes?.subject_id ?? "",
      percentage: Number(a.percentage),
      score: a.score,
      total: a.total,
      completedAt: a.completed_at!,
    })),
    studyMinutesThisWeek: estimateStudyMinutes({
      quizAttempts: attempts.filter((a) => inWeek(a.completed_at!)),
      flashcardReviews: reviews.filter((r) => inWeek(r.reviewed_at)).length,
      completedSessionMinutes: doneSessions
        .filter((s) => s.completed_at && toISODate(new Date(s.completed_at), timezone) >= weekStart)
        .reduce((sum, s) => sum + s.duration_minutes, 0),
    }),
    streak: computeStreak(activityDays, today),
    xp: computeXp({
      flashcardReviews: reviews.length,
      quizCorrectAnswers: attempts.reduce((sum, a) => sum + a.score, 0),
      sessionsDone: doneSessions.length,
    }),
  };
}
