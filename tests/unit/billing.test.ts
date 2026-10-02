import { describe, expect, it } from "vitest";

import { AI_COSTS, PLAN_LIMITS, checkCredits, isWithinLimit, resolvePlan } from "@/lib/billing/plans";

const NOW = new Date("2026-10-02T12:00:00Z");

describe("resolvePlan (subscription access)", () => {
  it("is free without a subscription", () => {
    expect(resolvePlan(null, NOW)).toBe("free");
  });

  it.each(["active", "trialing", "past_due"])("grants Pro for %s", (status) => {
    expect(resolvePlan({ status, current_period_end: "2026-11-02T00:00:00Z" }, NOW)).toBe("pro");
  });

  it.each(["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"])("denies Pro for %s", (status) => {
    expect(resolvePlan({ status, current_period_end: "2026-11-02T00:00:00Z" }, NOW)).toBe("free");
  });

  it("denies Pro when the period ended (after a one-day grace)", () => {
    expect(resolvePlan({ status: "active", current_period_end: "2026-10-01T18:00:00Z" }, NOW)).toBe("pro");
    expect(resolvePlan({ status: "active", current_period_end: "2026-09-29T00:00:00Z" }, NOW)).toBe("free");
  });
});

describe("AI credits", () => {
  it("allows a request within the remaining credits", () => {
    expect(checkCredits(80, AI_COSTS.summary, PLAN_LIMITS.free.monthlyCredits)).toMatchObject({ allowed: true, remaining: 20 });
  });

  it("refuses a request that would exceed the quota", () => {
    expect(checkCredits(95, AI_COSTS.quiz, 100)).toMatchObject({ allowed: false, remaining: 5 });
  });

  it("never reports negative remaining credits", () => {
    expect(checkCredits(150, 1, 100).remaining).toBe(0);
  });

  it("has the documented costs", () => {
    expect(AI_COSTS).toMatchObject({ summary: 10, flashcards: 10, quiz: 10, chat: 1, exam: 25 });
    expect(PLAN_LIMITS.free.monthlyCredits).toBe(100);
    expect(PLAN_LIMITS.pro.monthlyCredits).toBe(5000);
  });
});

describe("limits", () => {
  it("treats null as unlimited", () => {
    expect(isWithinLimit(10_000, null)).toBe(true);
    expect(isWithinLimit(2, PLAN_LIMITS.free.maxSubjects)).toBe(false);
    expect(isWithinLimit(1, PLAN_LIMITS.free.maxSubjects)).toBe(true);
  });
});
