import "server-only";

import { countUsageSince, getBillingState } from "@/lib/billing/access";
import { AI_COSTS, type AiAction, type PlanLimits } from "@/lib/billing/plans";
import { startOfMonthUTC } from "@/lib/learning/dates";
import { AppError } from "@/lib/http/errors";
import { createAdminClient } from "@/lib/supabase/admin";

import type { AiUsage } from "./client";

const DAY_MS = 86_400_000;

/** Per-action quotas of the plan (on top of the monthly credits). */
async function assertActionQuota(userId: string, action: AiAction, limits: PlanLimits) {
  if ((action === "quiz" || action === "exam") && limits.quizzesPerWeek !== null) {
    const count = await countUsageSince(userId, ["quiz", "exam"], new Date(Date.now() - 7 * DAY_MS));
    if (count >= limits.quizzesPerWeek) {
      throw new AppError(
        "quota_exceeded",
        `Tu as atteint la limite de ${limits.quizzesPerWeek} quiz par semaine du plan Gratuit. Passe à Pro pour des quiz illimités.`,
        402,
      );
    }
  }
  if (action === "chat" && limits.chatMessagesPerDay !== null) {
    const count = await countUsageSince(userId, "chat", new Date(Date.now() - DAY_MS));
    if (count >= limits.chatMessagesPerDay) {
      throw new AppError(
        "quota_exceeded",
        `Tu as atteint la limite de ${limits.chatMessagesPerDay} messages par jour. Reviens demain ou passe à Pro.`,
        402,
      );
    }
  }
}

export interface CreditReservation {
  /** Records the tokens actually used (the credits stay consumed). */
  complete(usage?: AiUsage): Promise<void>;
  /** Cancels the reservation: the credits are given back. */
  refund(): Promise<void>;
}

/**
 * Checks per-action quotas, then atomically reserves the action's credits
 * (fails if the monthly quota would be exceeded).
 */
export async function reserveAiCredits(userId: string, action: AiAction): Promise<CreditReservation> {
  const { limits } = await getBillingState(userId);
  await assertActionQuota(userId, action, limits);

  const admin = createAdminClient();
  const cost = AI_COSTS[action];
  const { data: usageId, error } = await admin.rpc("reserve_ai_credits", {
    p_user_id: userId,
    p_action: action,
    p_credits: cost,
    p_limit: limits.monthlyCredits,
    p_since: startOfMonthUTC().toISOString(),
  });
  if (error) {
    console.error("[credits] reservation failed", error.message);
    throw new AppError("ai_unavailable", "Impossible de vérifier tes crédits IA. Réessaie.", 503);
  }
  if (!usageId) {
    throw new AppError(
      "insufficient_credits",
      "Tu n'as plus assez de crédits IA ce mois-ci. Passe à Pro pour en obtenir davantage.",
      402,
      { cost },
    );
  }

  return {
    async complete(usage) {
      if (!usage) return;
      await admin
        .from("ai_usage")
        .update({ tokens_input: usage.inputTokens, tokens_output: usage.outputTokens, model: usage.model })
        .eq("id", usageId);
    },
    async refund() {
      await admin.from("ai_usage").delete().eq("id", usageId);
    },
  };
}

/**
 * Runs an AI operation under the credit system: reserve, run, then record
 * token usage on success or refund the reservation on failure.
 */
export async function withAiCredits<T>(
  userId: string,
  action: AiAction,
  run: () => Promise<{ result: T; usage?: AiUsage }>,
): Promise<T> {
  const reservation = await reserveAiCredits(userId, action);
  try {
    const { result, usage } = await run();
    await reservation.complete(usage);
    return result;
  } catch (err) {
    await reservation.refund();
    throw err;
  }
}

/** Records a zero-credit event (e.g. a document upload) so monthly quotas survive deletions. */
export async function recordUsageEvent(userId: string, action: string, usage?: AiUsage) {
  const admin = createAdminClient();
  await admin.from("ai_usage").insert({
    user_id: userId,
    action,
    credits: 0,
    tokens_input: usage?.inputTokens ?? 0,
    tokens_output: usage?.outputTokens ?? 0,
    model: usage?.model ?? null,
  });
}
