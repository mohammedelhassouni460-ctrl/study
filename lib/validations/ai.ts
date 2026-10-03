import { z } from "zod";

import { uuidSchema } from "./common";

export const summaryRequestSchema = z.object({
  subjectId: uuidSchema,
  documentId: uuidSchema.nullish(),
  length: z.enum(["short", "standard", "detailed"]).default("standard"),
});

export const FLASHCARD_COUNTS = [10, 20, 30, 50] as const;
export const flashcardsRequestSchema = z.object({
  subjectId: uuidSchema,
  documentId: uuidSchema.nullish(),
  count: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(50)]).default(20),
});

export const QUIZ_COUNTS = [5, 10, 20, 30] as const;
export const QUIZ_DIFFICULTY_VALUES = ["easy", "medium", "hard", "exam"] as const;
export const quizRequestSchema = z.object({
  subjectId: uuidSchema,
  documentId: uuidSchema.nullish(),
  count: z.union([z.literal(5), z.literal(10), z.literal(20), z.literal(30)]).default(10),
  difficulty: z.enum(QUIZ_DIFFICULTY_VALUES).default("medium"),
  topicId: uuidSchema.nullish(),
});

export const chatRequestSchema = z.object({
  subjectId: uuidSchema,
  message: z.string().trim().min(1, "Écris une question.").max(2000, "Question trop longue (2 000 caractères max)."),
});
