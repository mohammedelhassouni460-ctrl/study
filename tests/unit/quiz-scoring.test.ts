import { describe, expect, it } from "vitest";

import { scoreQuiz } from "@/lib/learning/quiz-scoring";

const questions = [
  { id: "q1", correctAnswer: 2, topicId: "elasticite", choicesCount: 4 },
  { id: "q2", correctAnswer: 0, topicId: "elasticite", choicesCount: 4 },
  { id: "q3", correctAnswer: 1, topicId: "externalites", choicesCount: 4 },
  { id: "q4", correctAnswer: 3, topicId: null, choicesCount: 4 },
];

describe("scoreQuiz", () => {
  it("scores answers and computes percentages", () => {
    const result = scoreQuiz(questions, { q1: 2, q2: 0, q3: 0, q4: 3 });
    expect(result.score).toBe(3);
    expect(result.total).toBe(4);
    expect(result.percentage).toBe(75);
    expect(result.gradeOn20).toBe(15);
  });

  it("treats missing and out-of-range answers as wrong", () => {
    const result = scoreQuiz(questions, { q1: 9, q2: -1, q3: null });
    expect(result.score).toBe(0);
    expect(result.results.map((r) => r.answer)).toEqual([null, null, null, null]);
  });

  it("aggregates by topic and finds weak / strong topics", () => {
    const result = scoreQuiz(questions, { q1: 2, q2: 0, q3: 3 });
    expect(result.byTopic).toEqual(
      expect.arrayContaining([
        { topicId: "elasticite", correct: 2, total: 2 },
        { topicId: "externalites", correct: 0, total: 1 },
      ]),
    );
    expect(result.weakTopicIds).toEqual(["externalites"]);
    expect(result.strongTopicIds).toEqual(["elasticite"]);
  });

  it("handles an empty quiz", () => {
    expect(scoreQuiz([], {}).percentage).toBe(0);
  });
});
