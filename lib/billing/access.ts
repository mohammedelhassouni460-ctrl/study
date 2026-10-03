import "server-only";

import { cache } from "react";

import { startOfMonthUTC } from "@/lib/learning/dates";
import { createClient } from "@/lib/supabase/server";

import { limitsFor, resolvePlan, type PlanId, type PlanLimits } from "./plans";

export interface BillingState {
  plan: PlanId;
  limits: PlanLimits;
  creditsUsed: number;
  creditsRemaining: number;
  subscription: {
    status: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    hasCustomer: boolean;
  } | null;
}

/** Current plan + credit usage for the signed-in user (deduplicated per request). */
export const getBillingState = cache(async (userId: string): Promise<BillingState> => {
  const supabase = await createClient();
  const [{ data: subscription }, { data: used }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, current_period_end, cancel_at_period_end, stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.rpc("credits_used_since", { p_since: startOfMonthUTC().toISOString() }),
  ]);

  const plan = resolvePlan(subscription);
  const limits = limitsFor(plan);
  const creditsUsed = used ?? 0;
  return {
    plan,
    limits,
    creditsUsed,
    creditsRemaining: Math.max(0, limits.monthlyCredits - creditsUsed),
    subscription: subscription
      ? {
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          hasCustomer: Boolean(subscription.stripe_customer_id),
        }
      : null,
  };
});

/** Count of ai_usage rows for an action since a date (usage rows cannot be deleted by users). */
export async function countUsageSince(userId: string, action: string | string[], since: Date): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("action", Array.isArray(action) ? action : [action])
    .gte("created_at", since.toISOString());
  return count ?? 0;
}
