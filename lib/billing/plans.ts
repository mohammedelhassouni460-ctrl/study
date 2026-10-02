/**
 * Central billing configuration: plans, limits and AI credit costs.
 * Change the values here — every check in the app reads from this file.
 */

export type PlanId = "free" | "pro";

export const AI_COSTS = {
  summary: 10,
  flashcards: 10,
  quiz: 10,
  chat: 1,
  exam: 25,
  study_plan: 0,
  document_processing: 0,
} as const;

export type AiAction = keyof typeof AI_COSTS;

export interface PlanLimits {
  monthlyCredits: number;
  maxSubjects: number | null;
  documentsPerMonth: number | null;
  maxFlashcards: number | null;
  quizzesPerWeek: number | null;
  chatMessagesPerDay: number | null;
  planner: boolean;
  analytics: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    monthlyCredits: 100,
    maxSubjects: 2,
    documentsPerMonth: 5,
    maxFlashcards: 30,
    quizzesPerWeek: 3,
    chatMessagesPerDay: 20,
    planner: true,
    analytics: false,
  },
  pro: {
    monthlyCredits: 5000,
    maxSubjects: null,
    documentsPerMonth: 200,
    maxFlashcards: null,
    quizzesPerWeek: null,
    chatMessagesPerDay: 500,
    planner: true,
    analytics: true,
  },
};

export const PRICING = {
  free: { name: "Gratuit", priceMonthly: 0 },
  pro: { name: "Pro", priceMonthly: 9.99, priceYearly: 79.99 },
} as const;

export type BillingInterval = "monthly" | "yearly";

export const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: [
    "2 matières",
    "5 documents par mois",
    "30 flashcards",
    "3 quiz par semaine",
    "Chat avec tes cours (limité)",
    "100 crédits IA par mois",
  ],
  pro: [
    "Matières illimitées",
    "200 documents par mois",
    "Flashcards et quiz illimités",
    "Planner IA personnalisé",
    "Chat avec tes cours",
    "Statistiques de progression",
    "5 000 crédits IA par mois",
  ],
};

/** Stripe subscription statuses that grant Pro access. */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export interface SubscriptionLike {
  status: string | null;
  current_period_end: string | null;
}

/**
 * Pro if Stripe reports an active-like status and the paid period has not
 * ended. `past_due` keeps access while Stripe retries the payment (Smart
 * Retries); Stripe then moves the subscription to `canceled`/`unpaid`.
 */
export function resolvePlan(subscription: SubscriptionLike | null, now: Date = new Date()): PlanId {
  if (!subscription?.status || !ACTIVE_STATUSES.has(subscription.status)) return "free";
  if (subscription.current_period_end) {
    // One day of grace for webhook delivery delays at renewal time.
    const end = new Date(subscription.current_period_end).getTime() + 24 * 60 * 60 * 1000;
    if (end < now.getTime()) return "free";
  }
  return "pro";
}

export function limitsFor(plan: PlanId): PlanLimits {
  return PLAN_LIMITS[plan];
}

export interface CreditCheck {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  cost: number;
}

export function checkCredits(used: number, cost: number, limit: number): CreditCheck {
  const safeUsed = Math.max(0, used);
  const remaining = Math.max(0, limit - safeUsed);
  return { allowed: cost <= remaining, used: safeUsed, limit, remaining, cost };
}

/** null limit = unlimited. */
export function isWithinLimit(current: number, limit: number | null): boolean {
  return limit === null || current < limit;
}
