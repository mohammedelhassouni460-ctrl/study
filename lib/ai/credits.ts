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

/**
 * Runs an AI operation under the credit system:
 * 1. checks per-action quotas,
 * 2. atomically reserves the credits (fails if the monthly quota would be exceeded),
 * 3. runs the operation,
 * 4. records token usage on success, or refunds the reservation on failure.
 */
export async function withAiCredits<T>(
  userId: string,
  action: AiAction,
  run: () => Promise<{ result: T; usage?: AiUsage }>,
): Promise<T> {
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

  try {
    const { result, usage } = await run();
    if (usage) {
      await admin
        .from("ai_usage")
        .update({ tokens_input: usage.inputTokens, tokens_output: usage.outputTokens, model: usage.model })
        .eq("id", usageId);
    }
    return result;
  } catch (err) {
    await admin.from("ai_usage").delete().eq("id", usageId);
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
