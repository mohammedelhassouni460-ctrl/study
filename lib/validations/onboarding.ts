import { z } from "zod";

import { optionalDateSchema } from "./common";

export const EDUCATION_LEVELS = [
  { value: "lycee", label: "Lycée" },
  { value: "bts", label: "BTS" },
  { value: "licence", label: "Licence" },
  { value: "master", label: "Master" },
  { value: "ecole", label: "École" },
  { value: "autre", label: "Autre" },
] as const;

export const GOALS = [
  { value: "understand", label: "Comprendre mes cours", emoji: "💡" },
  { value: "memorize", label: "Mémoriser", emoji: "🧠" },
  { value: "exams", label: "Préparer mes examens", emoji: "🎯" },
  { value: "organize", label: "Organiser mes révisions", emoji: "🗓️" },
] as const;

export const educationLevelSchema = z.enum(["lycee", "bts", "licence", "master", "ecole", "autre"]);
export const goalSchema = z.enum(["understand", "memorize", "exams", "organize"]);

export const onboardingSchema = z.object({
  fullName: z.string().trim().min(1, "Ton prénom est requis.").max(80),
  educationLevel: educationLevelSchema,
  goal: goalSchema,
  nextExamDate: optionalDateSchema,
  subjectName: z.string().trim().min(1, "Donne un nom à ta matière.").max(80),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
