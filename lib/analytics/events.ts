export const ANALYTICS_EVENTS = [
  "user_signed_up",
  "onboarding_completed",
  "subject_created",
  "document_uploaded",
  "document_processed",
  "summary_generated",
  "flashcards_generated",
  "flashcard_reviewed",
  "quiz_started",
  "quiz_completed",
  "chat_message_sent",
  "study_plan_generated",
  "checkout_started",
  "subscription_started",
  "subscription_cancelled",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;
