import { describe, expect, it } from "vitest";

import { normalizeFlashcards } from "@/lib/ai/generators/flashcards";
import { normalizeQuestions } from "@/lib/ai/generators/quiz";

const q = (overrides: Partial<Parameters<typeof normalizeQuestions>[0][number]> = {}) => ({
  question: "Quelle est la formule de l'élasticité ?",
  choices: ["A", "B", "C", "D"],
  correctAnswer: 1,
  explanation: "Parce que.",
  topic: "Élasticité",
  ...overrides,
});

describe("normalizeQuestions", () => {
  it("keeps valid questions and caps the count", () => {
    const list = [q(), q({ question: "Q2 ?" }), q({ question: "Q3 ?" })];
    expect(normalizeQuestions(list, 2)).toHaveLength(2);
  });

  it("drops out-of-range answers, duplicate choices and duplicate questions", () => {
    const list = [
      q(),
      q(), // duplicate question
      q({ question: "Hors limite ?", correctAnswer: 4 }),
      q({ question: "Négatif ?", correctAnswer: -1 }),
      q({ question: "Doublons ?", choices: ["A", "a", "B", "C"] }),
      q({ question: "Une seule ?", choices: ["A"], correctAnswer: 0 }),
    ];
    expect(normalizeQuestions(list, 10).map((x) => x.question)).toEqual([q().question]);
  });
});

describe("normalizeFlashcards", () => {
  it("removes duplicate questions and caps the count", () => {
    const card = { question: "Q ?", answer: "R", difficulty: "easy" as const, topic: "T" };
    const cards = [card, { ...card, question: "q ?" }, { ...card, question: "Autre ?" }, { ...card, question: "3 ?" }];
    expect(normalizeFlashcards(cards, 2).map((c) => c.question)).toEqual(["Q ?", "Autre ?"]);
  });
});
