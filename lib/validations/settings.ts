import { z } from "zod";

import { optionalDateSchema } from "./common";
import { educationLevelSchema, goalSchema } from "./onboarding";

export const TIMEZONES = [
  "Europe/Paris",
  "Europe/Brussels",
  "Europe/Zurich",
  "Europe/Luxembourg",
  "Africa/Casablanca",
  "Africa/Algiers",
  "Africa/Tunis",
  "Africa/Dakar",
  "Africa/Abidjan",
  "America/Montreal",
  "Indian/Reunion",
  "America/Guadeloupe",
  "Pacific/Noumea",
  "UTC",
] as const;

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Ton prénom est requis.").max(80, "80 caractères maximum."),
  educationLevel: educationLevelSchema,
  goal: goalSchema,
  nextExamDate: optionalDateSchema,
  dailyStudyMinutes: z.coerce.number<string | number>().int().min(10, "10 minutes minimum.").max(480, "8 heures maximum."),
  timezone: z.enum(TIMEZONES),
});
export type ProfileFormValues = z.input<typeof profileSchema>;
export type ProfileInput = z.output<typeof profileSchema>;

export const notificationPreferencesSchema = z.object({
  email_reminders: z.boolean(),
  weekly_report: z.boolean(),
  product_updates: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const DELETE_CONFIRMATION = "SUPPRIMER";
export const deleteAccountSchema = z.object({
  confirmation: z.literal(DELETE_CONFIRMATION, { error: `Tape ${DELETE_CONFIRMATION} pour confirmer.` }),
});
