/**
 * Spaced repetition (SM-2 inspired, simplified). Pure function: given a card's
 * state and the user's rating, returns the next state and review date.
 *
 * First review:  À revoir → 1 j · Difficile → 2 j · Correct → 5 j · Facile → 10 j
 * Afterwards the interval grows with the card's ease factor.
 * Can later be swapped for FSRS behind the same signature.
 */

import { calculateMasteryScore, clampScore } from "./mastery";

export const REVIEW_RATINGS = ["again", "hard", "good", "easy"] as const;
export type ReviewRating = (typeof REVIEW_RATINGS)[number];

export const RATING_LABELS: Record<ReviewRating, { label: string; emoji: string }> = {
  again: { label: "À revoir", emoji: "😵" },
  hard: { label: "Difficile", emoji: "😐" },
  good: { label: "Correct", emoji: "🙂" },
  easy: { label: "Facile", emoji: "🔥" },
};

export interface CardSchedulingState {
  easeFactor: number;
  intervalDays: number;
  reviewCount: number;
  lapses: number;
  masteryScore: number;
}

export interface ScheduledCard extends CardSchedulingState {
  nextReviewAt: Date;
}

export const BASE_INTERVALS: Record<ReviewRating, number> = { again: 1, hard: 2, good: 5, easy: 10 };
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
export const MAX_INTERVAL_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

const round2 = (n: number) => Math.round(n * 100) / 100;
const clampEase = (n: number) => Math.min(MAX_EASE, Math.max(MIN_EASE, n));

export function scheduleNextReview(
  state: CardSchedulingState,
  rating: ReviewRating,
  now: Date = new Date(),
): ScheduledCard {
  const ease = clampEase(state.easeFactor || 2.5);
  const isFirstReview = state.reviewCount === 0 || state.intervalDays <= 0;

  let interval: number;
  let nextEase = ease;
  let lapses = state.lapses;

  if (isFirstReview) {
    interval = BASE_INTERVALS[rating];
    if (rating === "again") nextEase = ease - 0.2;
    if (rating === "hard") nextEase = ease - 0.15;
    if (rating === "easy") nextEase = ease + 0.15;
  } else {
    switch (rating) {
      case "again":
        interval = BASE_INTERVALS.again;
        nextEase = ease - 0.2;
        lapses += 1;
        break;
      case "hard":
        interval = Math.max(BASE_INTERVALS.hard, state.intervalDays * 1.2);
        nextEase = ease - 0.15;
        break;
      case "good":
        interval = Math.max(BASE_INTERVALS.good, state.intervalDays * ease);
        break;
      case "easy":
        interval = Math.max(BASE_INTERVALS.easy, state.intervalDays * ease * 1.3);
        nextEase = ease + 0.15;
        break;
    }
  }

  interval = Math.min(MAX_INTERVAL_DAYS, Math.round(interval));

  // "Easy" counts like a hard question answered right, "hard" earns half the gain.
  const afterAnswer = calculateMasteryScore({
    currentScore: state.masteryScore,
    isCorrect: rating !== "again",
    difficulty: rating === "easy" ? "hard" : "medium",
    attempts: state.reviewCount,
    correctCount: Math.max(0, state.reviewCount - state.lapses),
  });
  const masteryScore =
    rating === "hard"
      ? clampScore(state.masteryScore + (afterAnswer - state.masteryScore) / 2)
      : afterAnswer;

  return {
    easeFactor: round2(clampEase(nextEase)),
    intervalDays: interval,
    reviewCount: state.reviewCount + 1,
    lapses,
    masteryScore,
    nextReviewAt: new Date(now.getTime() + interval * DAY_MS),
  };
}

export function isDue(nextReviewAt: string | Date, now: Date = new Date()): boolean {
  return new Date(nextReviewAt).getTime() <= now.getTime();
}
