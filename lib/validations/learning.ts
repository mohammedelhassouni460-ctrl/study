import { z } from "zod";

import { REVIEW_RATINGS } from "@/lib/learning/spaced-repetition";

import { uuidSchema } from "./common";

export const flashcardReviewSchema = z.object({
  flashcardId: uuidSchema,
  rating: z.enum(REVIEW_RATINGS),
});

export const quizSubmitSchema = z.object({
  quizId: uuidSchema,
  startedAt: z.iso.datetime({ offset: true }).optional(),
  answers: z.record(uuidSchema, z.number().int().min(0).max(9).nullable()),
});
