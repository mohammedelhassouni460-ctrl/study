import { z } from "zod";

import { uuidSchema } from "./common";

export const uploadRequestSchema = z.object({
  subjectId: uuidSchema,
  name: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
  type: z.string().max(200).default(""),
});

export const processRequestSchema = z.object({ documentId: uuidSchema });
