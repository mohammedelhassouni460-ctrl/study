import { z } from "zod";

import { uuidSchema } from "./common";

export const PLAN_HORIZONS = [7, 14, 30] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");

export const studyPlanRequestSchema = z.object({
  horizonDays: z.union([z.literal(7), z.literal(14), z.literal(30)]).default(14),
  dailyMinutes: z.number().int().min(10, "10 minutes minimum.").max(480, "8 heures maximum.").optional(),
});

export const sessionStatusSchema = z.object({
  id: uuidSchema,
  status: z.enum(["planned", "done", "skipped"]),
});

export const moveSessionSchema = z.object({
  id: uuidSchema,
  date: isoDate,
});
