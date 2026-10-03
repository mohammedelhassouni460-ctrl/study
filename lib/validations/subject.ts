import { z } from "zod";

import { emptyToUndefined, optionalDateSchema } from "./common";

export const SUBJECT_COLORS = ["indigo", "violet", "sky", "emerald", "amber", "rose", "slate"] as const;
export type SubjectColor = (typeof SUBJECT_COLORS)[number];

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(80, "80 caractères maximum."),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  color: z.enum(SUBJECT_COLORS).default("indigo"),
  examDate: optionalDateSchema,
  targetGrade: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce
      .number({ message: "Note invalide." })
      .min(0, "Entre 0 et 20.")
      .max(20, "Entre 0 et 20.")
      .optional(),
  ),
});

export type SubjectInput = z.infer<typeof subjectSchema>;
export type SubjectFormValues = z.input<typeof subjectSchema>;
