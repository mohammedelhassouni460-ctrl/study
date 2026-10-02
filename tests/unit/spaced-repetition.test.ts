import { describe, expect, it } from "vitest";

import { BASE_INTERVALS, MAX_INTERVAL_DAYS, MIN_EASE, isDue, scheduleNextReview } from "@/lib/learning/spaced-repetition";

const NOW = new Date("2026-10-04T10:00:00Z");
const fresh = { easeFactor: 2.5, intervalDays: 0, reviewCount: 0, lapses: 0, masteryScore: 0 };

describe("scheduleNextReview", () => {
  it.each([
    ["again", 1],
    ["hard", 2],
    ["good", 5],
    ["easy", 10],
  ] as const)("first review %s -> +%i days", (rating, days) => {
    const next = scheduleNextReview(fresh, rating, NOW);
    expect(next.intervalDays).toBe(days);
    expect(next.nextReviewAt.getTime() - NOW.getTime()).toBe(days * 86_400_000);
    expect(next.reviewCount).toBe(1);
  });

  it("grows the interval with the ease factor", () => {
    const first = scheduleNextReview(fresh, "good", NOW);
    const second = scheduleNextReview(first, "good", NOW);
    expect(second.intervalDays).toBeGreaterThan(first.intervalDays);
  });

  it("resets the interval and counts a lapse on 'again'", () => {
    const learned = { easeFactor: 2.5, intervalDays: 20, reviewCount: 5, lapses: 0, masteryScore: 80 };
    const next = scheduleNextReview(learned, "again", NOW);
    expect(next.intervalDays).toBe(BASE_INTERVALS.again);
    expect(next.lapses).toBe(1);
    expect(next.easeFactor).toBeLessThan(2.5);
    expect(next.masteryScore).toBeLessThan(80);
  });

  it("never drops the ease factor below the minimum", () => {
    let state = { ...fresh };
    for (let i = 0; i < 30; i++) state = scheduleNextReview(state, "again", NOW);
    expect(state.easeFactor).toBeGreaterThanOrEqual(MIN_EASE);
  });

  it("caps the interval", () => {
    let state = { ...fresh };
    for (let i = 0; i < 30; i++) state = scheduleNextReview(state, "easy", NOW);
    expect(state.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });

  it("raises mastery on easy more than on hard", () => {
    const base = { easeFactor: 2.5, intervalDays: 5, reviewCount: 2, lapses: 0, masteryScore: 50 };
    const easy = scheduleNextReview(base, "easy", NOW).masteryScore;
    const hard = scheduleNextReview(base, "hard", NOW).masteryScore;
    expect(easy).toBeGreaterThan(hard);
    expect(hard).toBeGreaterThanOrEqual(50);
  });
});

describe("isDue", () => {
  it("compares with now", () => {
    expect(isDue("2026-10-03T00:00:00Z", NOW)).toBe(true);
    expect(isDue("2026-10-05T00:00:00Z", NOW)).toBe(false);
  });
});
