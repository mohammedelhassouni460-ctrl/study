/**
 * Study planner — "Que dois-je réviser aujourd'hui ?".
 * Pure function: distributes revision sessions over the coming days,
 * prioritising (1) close exams, (2) weak topics, (3) due flashcards.
 */

import { addDays, daysBetween } from "./dates";

export type SessionKind = "flashcards" | "review" | "quiz" | "exercise";

export interface PlannerTopic {
  id: string;
  name: string;
  mastery: number;
}

export interface PlannerSubject {
  id: string;
  name: string;
  examDate: string | null;
  topics: PlannerTopic[];
  dueFlashcards: number;
}

export interface PlannerInput {
  /** First planned day, "YYYY-MM-DD". */
  startDate: string;
  dailyMinutes: number;
  subjects: PlannerSubject[];
  /** Number of days to plan (defaults to the last exam, capped at 30). */
  horizonDays?: number;
}

export interface PlannedSession {
  date: string;
  subjectId: string;
  topicId: string | null;
  kind: SessionKind;
  title: string;
  durationMinutes: number;
  position: number;
}

export const SESSION_KIND_LABELS: Record<SessionKind, string> = {
  flashcards: "Flashcards",
  review: "Cours",
  quiz: "QCM",
  exercise: "Exercice",
};

const MIN_BLOCK = 10;
const MAX_SUBJECTS_PER_DAY = 3;
const DEFAULT_HORIZON = 14;
const MAX_HORIZON = 30;

/** 0..1, higher when the exam is close. Subjects without exam get a low baseline. */
export function examUrgency(daysUntilExam: number | null): number {
  if (daysUntilExam === null) return 0.2;
  if (daysUntilExam < 0) return 0;
  return Math.min(1, Math.max(0.15, 1 - daysUntilExam / 45));
}

export function subjectPriority(
  subject: PlannerSubject,
  today: string,
  masteries: Map<string, number>,
): number {
  const days = subject.examDate ? daysBetween(today, subject.examDate) : null;
  if (days !== null && days < 0) return 0;
  const scores = subject.topics.map((t) => masteries.get(t.id) ?? t.mastery);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 30;
  const weakness = 1 - avg / 100;
  const flashcardBoost = Math.min(0.15, subject.dueFlashcards / 100);
  return 0.55 * examUrgency(days) + 0.4 * weakness + flashcardBoost;
}

function defaultHorizon(input: PlannerInput): number {
  if (input.horizonDays) return Math.min(MAX_HORIZON, Math.max(1, input.horizonDays));
  const exams = input.subjects
    .map((s) => (s.examDate ? daysBetween(input.startDate, s.examDate) : -1))
    .filter((d) => d >= 0);
  if (exams.length === 0) return DEFAULT_HORIZON;
  return Math.min(MAX_HORIZON, Math.max(1, Math.max(...exams) + 1));
}

/** Splits a subject block into concrete activities for its weakest topic. */
function activitiesFor(
  subject: PlannerSubject,
  topic: PlannerTopic | null,
  mastery: number,
  minutes: number,
  includeFlashcards: boolean,
): { kind: SessionKind; title: string; minutes: number; topicId: string | null }[] {
  const out: { kind: SessionKind; title: string; minutes: number; topicId: string | null }[] = [];
  let remaining = minutes;
  const topicName = topic?.name ?? subject.name;

  if (includeFlashcards && remaining >= MIN_BLOCK) {
    const m = Math.min(10, remaining);
    out.push({ kind: "flashcards", title: `Flashcards — ${subject.name}`, minutes: m, topicId: null });
    remaining -= m;
  }

  const plan: SessionKind[] =
    mastery < 40 ? ["review", "quiz", "exercise"] : mastery < 75 ? ["quiz", "exercise", "review"] : ["quiz", "flashcards"];

  for (const kind of plan) {
    if (remaining < MIN_BLOCK) break;
    const share = kind === "review" ? 15 : kind === "exercise" ? 10 : 12;
    const m = Math.min(remaining, share);
    out.push({
      kind,
      title: `${SESSION_KIND_LABELS[kind]} — ${topicName}`,
      minutes: m,
      topicId: topic?.id ?? null,
    });
    remaining -= m;
  }
  // Leftover minutes extend the last activity.
  if (remaining > 0 && out.length > 0) out[out.length - 1].minutes += remaining;
  return out;
}

export function generateStudyPlan(input: PlannerInput): PlannedSession[] {
  const dailyMinutes = Math.max(MIN_BLOCK, Math.round(input.dailyMinutes));
  const horizon = defaultHorizon(input);
  const masteries = new Map<string, number>();
  const lastScheduled = new Map<string, number>(); // topicId -> day index
  input.subjects.forEach((s) => s.topics.forEach((t) => masteries.set(t.id, t.mastery)));
  const flashcardsDue = new Map(input.subjects.map((s) => [s.id, s.dueFlashcards]));

  const sessions: PlannedSession[] = [];

  for (let day = 0; day < horizon; day++) {
    const date = addDays(input.startDate, day);
    const ranked = input.subjects
      .map((s) => ({ subject: s, priority: subjectPriority(s, date, masteries) }))
      .filter((r) => r.priority > 0)
      .sort((a, b) => b.priority - a.priority);
    if (ranked.length === 0) continue;

    // Fewer, longer blocks when time is short.
    const maxSubjects = Math.max(1, Math.min(MAX_SUBJECTS_PER_DAY, Math.floor(dailyMinutes / 20)));
    // Proportional split; subjects whose share would be under 15 min are dropped.
    let chosen = ranked.slice(0, maxSubjects);
    const share = (list: typeof chosen) => {
      const total = list.reduce((sum, r) => sum + r.priority, 0);
      return list.map((r) => (r.priority / total) * dailyMinutes);
    };
    const firstShares = share(chosen);
    chosen = chosen.filter((_, i) => i === 0 || firstShares[i] >= 15);
    const minutesPerSubject = share(chosen).map((m) => Math.round(m));
    minutesPerSubject[0] += dailyMinutes - minutesPerSubject.reduce((a, b) => a + b, 0);

    let position = 0;
    chosen.forEach((entry, index) => {
      const minutes = minutesPerSubject[index];

      // Weakest topic not practised in the last 2 days (rotation).
      const topic =
        [...entry.subject.topics]
          .map((t) => ({
            t,
            score:
              (masteries.get(t.id) ?? t.mastery) +
              (day - (lastScheduled.get(t.id) ?? -10) < 2 ? 40 : 0),
          }))
          .sort((a, b) => a.score - b.score)[0]?.t ?? null;
      const mastery = topic ? (masteries.get(topic.id) ?? topic.mastery) : 30;
      const due = flashcardsDue.get(entry.subject.id) ?? 0;

      for (const activity of activitiesFor(entry.subject, topic, mastery, minutes, due > 0)) {
        sessions.push({
          date,
          subjectId: entry.subject.id,
          topicId: activity.topicId,
          kind: activity.kind,
          title: activity.title,
          durationMinutes: activity.minutes,
          position: position++,
        });
      }

      if (due > 0) flashcardsDue.set(entry.subject.id, Math.max(0, due - 15));
      if (topic) {
        lastScheduled.set(topic.id, day);
        // Assume some progress so other topics get attention too.
        masteries.set(topic.id, Math.min(100, mastery + 8));
      }
    });
  }

  return sessions;
}

/** Today's recommended session (same engine, one day). */
export function buildDailySession(
  input: Omit<PlannerInput, "horizonDays">,
): { items: PlannedSession[]; totalMinutes: number } {
  const items = generateStudyPlan({ ...input, horizonDays: 1 });
  return { items, totalMinutes: items.reduce((sum, s) => sum + s.durationMinutes, 0) };
}
