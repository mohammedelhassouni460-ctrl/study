/**
 * Zod schemas of AI outputs. They are converted to JSON Schema for structured
 * outputs AND used to validate the response. Kept permissive on counts (the
 * model may return one item more or less); business code normalises afterwards.
 */
import { z } from "zod";

const text = z.string().trim().min(1);

export const topicsOutputSchema = z.object({
  topics: z
    .array(
      z.object({
        name: text.describe("Nom court du concept ou chapitre (2 à 6 mots)"),
        description: z.string().describe("Une phrase qui résume le concept"),
        difficulty: z.enum(["easy", "medium", "hard"]),
      }),
    )
    .describe("Concepts clés du document, dans l'ordre du cours"),
});

export const summaryOutputSchema = z.object({
  title: text,
  overview: text.describe("Vue d'ensemble en quelques phrases"),
  keyConcepts: z.array(z.object({ name: text, explanation: text })),
  definitions: z.array(z.object({ term: text, definition: text })),
  formulas: z.array(
    z.object({
      name: text,
      formula: text.describe("Formule en texte brut, ex: Ep = (% variation quantité) / (% variation prix)"),
      interpretation: z.string(),
    }),
  ),
  importantPoints: z.array(text),
  examples: z.array(z.object({ title: text, content: text })),
});
export type SummaryContent = z.infer<typeof summaryOutputSchema>;

export const flashcardsOutputSchema = z.object({
  flashcards: z.array(
    z.object({
      question: text,
      answer: text,
      difficulty: z.enum(["easy", "medium", "hard"]),
      topic: text.describe("Concept auquel la carte se rattache"),
    }),
  ),
});
export type GeneratedFlashcard = z.infer<typeof flashcardsOutputSchema>["flashcards"][number];

export const quizOutputSchema = z.object({
  title: text,
  questions: z.array(
    z.object({
      question: text,
      choices: z.array(text).describe("4 propositions, une seule correcte"),
      correctAnswer: z.number().int().describe("Index (0-based) de la bonne proposition dans choices"),
      explanation: text.describe("Explication de la bonne réponse, avec le calcul si besoin"),
      topic: text,
    }),
  ),
});
export type GeneratedQuestion = z.infer<typeof quizOutputSchema>["questions"][number];
