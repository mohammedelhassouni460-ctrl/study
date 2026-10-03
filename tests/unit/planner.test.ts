import { describe, expect, it } from "vitest";

import { addDays, daysBetween } from "@/lib/learning/dates";
import { buildDailySession, examUrgency, generateStudyPlan, type PlannerSubject } from "@/lib/learning/planner";

const today = "2026-10-02";
const micro: PlannerSubject = {
  id: "micro",
  name: "Microéconomie",
  examDate: "2026-10-28",
  dueFlashcards: 12,
  topics: [
    { id: "offre", name: "Offre et demande", mastery: 91 },
    { id: "elast", name: "Élasticité", mastery: 72 },
    { id: "ext", name: "Externalités", mastery: 31 },
    { id: "mono", name: "Monopole", mastery: 58 },
  ],
};
const stats: PlannerSubject = {
  id: "stats",
  name: "Statistiques",
  examDate: "2026-12-15",
  dueFlashcards: 0,
  topics: [{ id: "proba", name: "Probabilités", mastery: 52 }],
};

describe("dates", () => {
  it("adds days and counts differences", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(daysBetween("2026-10-02", "2026-10-28")).toBe(26);
  });
});

describe("generateStudyPlan", () => {
  it("fills every day up to the daily budget", () => {
    const sessions = generateStudyPlan({ startDate: today, dailyMinutes: 45, subjects: [micro, stats], horizonDays: 7 });
    const byDay = new Map<string, number>();
    sessions.forEach((s) => byDay.set(s.date, (byDay.get(s.date) ?? 0) + s.durationMinutes));
    expect(byDay.size).toBe(7);
    for (const minutes of byDay.values()) expect(minutes).toBe(45);
  });

  it("starts with the weakest topic of the most urgent subject", () => {
    const sessions = generateStudyPlan({ startDate: today, dailyMinutes: 45, subjects: [micro, stats], horizonDays: 1 });
    expect(sessions[0].subjectId).toBe("micro");
    expect(sessions.some((s) => s.topicId === "ext")).toBe(true);
    expect(sessions[0].kind).toBe("flashcards"); // due flashcards come first
  });

  it("rotates topics across days", () => {
    const sessions = generateStudyPlan({ startDate: today, dailyMinutes: 30, subjects: [micro], horizonDays: 4 });
    const topics = new Set(sessions.map((s) => s.topicId).filter(Boolean));
    expect(topics.size).toBeGreaterThan(1);
  });

  it("stops planning a subject after its exam", () => {
    const past = { ...micro, examDate: "2026-10-03" };
    const sessions = generateStudyPlan({ startDate: today, dailyMinutes: 30, subjects: [past], horizonDays: 5 });
    expect(sessions.every((s) => s.date <= "2026-10-03")).toBe(true);
  });

  it("defaults the horizon to the last exam (capped)", () => {
    const sessions = generateStudyPlan({ startDate: today, dailyMinutes: 30, subjects: [micro] });
    const last = sessions.map((s) => s.date).sort().at(-1);
    expect(last).toBe("2026-10-28");
  });

  it("builds today's session", () => {
    const { items, totalMinutes } = buildDailySession({ startDate: today, dailyMinutes: 47, subjects: [micro, stats] });
    expect(totalMinutes).toBe(47);
    expect(items.every((i) => i.date === today)).toBe(true);
  });

  it("computes urgency", () => {
    expect(examUrgency(null)).toBe(0.2);
    expect(examUrgency(-1)).toBe(0);
    expect(examUrgency(1)).toBeGreaterThan(examUrgency(30));
  });
});
