/** Engagement statistics (streak, study time). Pure functions. */

import { addDays } from "./dates";

/**
 * Consecutive days with at least one activity, ending today (or yesterday,
 * so the streak isn't shown as broken before the user studied today).
 */
export function computeStreak(activityDays: Iterable<string>, today: string): number {
  const days = new Set(activityDays);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export const SECONDS_PER_FLASHCARD_REVIEW = 20;

/** Estimated study minutes from quiz durations, flashcard reviews and completed planner sessions. */
export function estimateStudyMinutes(input: {
  quizAttempts: { started_at: string; completed_at: string | null }[];
  flashcardReviews: number;
  completedSessionMinutes: number;
}): number {
  const quizMinutes = input.quizAttempts.reduce((sum, attempt) => {
    if (!attempt.completed_at) return sum;
    const minutes = (new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime()) / 60_000;
    // Ignore abandoned tabs: cap one attempt at 90 minutes.
    return sum + Math.min(90, Math.max(0, minutes));
  }, 0);
  const reviewMinutes = (input.flashcardReviews * SECONDS_PER_FLASHCARD_REVIEW) / 60;
  return Math.round(quizMinutes + reviewMinutes + input.completedSessionMinutes);
}

/** XP: simple, transparent rules for light gamification. */
export function computeXp(input: { flashcardReviews: number; quizCorrectAnswers: number; sessionsDone: number }) {
  return input.flashcardReviews * 2 + input.quizCorrectAnswers * 5 + input.sessionsDone * 10;
}
