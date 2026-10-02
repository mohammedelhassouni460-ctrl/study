import { describe, expect, it } from "vitest";

import {
  averageMastery,
  calculateMasteryScore,
  clampScore,
  masteryLevel,
  weakestTopics,
} from "@/lib/learning/mastery";

describe("calculateMasteryScore", () => {
  it("increases the score after a correct answer", () => {
    expect(calculateMasteryScore({ currentScore: 50, isCorrect: true, attempts: 4, correctCount: 2 })).toBeGreaterThan(50);
  });

  it("moves a lot on early answers and less later", () => {
    const early = calculateMasteryScore({ currentScore: 40, isCorrect: true, attempts: 0 });
    const late = calculateMasteryScore({ currentScore: 40, isCorrect: true, attempts: 50, correctCount: 25 });
    expect(early - 40).toBeGreaterThan(late - 40);
  });

  it("gives a small exposure score on a wrong first answer", () => {
    expect(calculateMasteryScore({ currentScore: 0, isCorrect: false, attempts: 0 })).toBe(5);
  });

  it("decreases the score after a wrong answer", () => {
    expect(calculateMasteryScore({ currentScore: 70, isCorrect: false, attempts: 5, correctCount: 2 })).toBeLessThan(70);
  });

  it("penalises less when the history is strong", () => {
    const strong = calculateMasteryScore({ currentScore: 80, isCorrect: false, attempts: 10, correctCount: 10 });
    const weak = calculateMasteryScore({ currentScore: 80, isCorrect: false, attempts: 10, correctCount: 2 });
    expect(strong).toBeGreaterThan(weak);
  });

  it("weights hard questions more than easy ones", () => {
    const hard = calculateMasteryScore({ currentScore: 50, isCorrect: true, difficulty: "hard", attempts: 3 });
    const easy = calculateMasteryScore({ currentScore: 50, isCorrect: true, difficulty: "easy", attempts: 3 });
    expect(hard).toBeGreaterThan(easy);
  });

  it("stays within 0..100", () => {
    let score = 0;
    for (let i = 0; i < 200; i++) score = calculateMasteryScore({ currentScore: score, isCorrect: true, attempts: i, correctCount: i });
    expect(score).toBeLessThanOrEqual(100);
    for (let i = 0; i < 200; i++) score = calculateMasteryScore({ currentScore: score, isCorrect: false, attempts: 200 + i, correctCount: 200 });
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe("helpers", () => {
  it("clamps invalid values", () => {
    expect(clampScore(Number.NaN)).toBe(0);
    expect(clampScore(140)).toBe(100);
    expect(clampScore(-3)).toBe(0);
  });

  it("maps scores to levels", () => {
    expect(masteryLevel(0)).toBe("never");
    expect(masteryLevel(20)).toBe("weak");
    expect(masteryLevel(50)).toBe("medium");
    expect(masteryLevel(75)).toBe("mastered");
    expect(masteryLevel(95)).toBe("expert");
  });

  it("averages and sorts weakest topics", () => {
    expect(averageMastery([])).toBe(0);
    expect(averageMastery([50, 100])).toBe(75);
    const topics = [
      { name: "a", mastery_score: 91 },
      { name: "b", mastery_score: 31 },
      { name: "c", mastery_score: 58 },
    ];
    expect(weakestTopics(topics, 2).map((t) => t.name)).toEqual(["b", "c"]);
  });
});
