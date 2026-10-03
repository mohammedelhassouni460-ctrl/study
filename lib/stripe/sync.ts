import "server-only";

import type Stripe from "stripe";

import { track } from "@/lib/analytics/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Pure mapping from a Stripe subscription to our `subscriptions` row. */
export function subscriptionToRow(subscription: Stripe.Subscription) {
  const items = subscription.items?.data ?? [];
  // Since API 2025-03-31 the billing period lives on each subscription item.
  const periodEnd = items.reduce<number | null>(
    (max, item) => (item.current_period_end && (max === null || item.current_period_end > max) ? item.current_period_end : max),
    null,
  );
  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  return {
    stripe_customer_id: customer,
    stripe_subscription_id: subscription.id,
    stripe_price_id: items[0]?.price?.id ?? null,
    status: subscription.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end || Boolean(subscription.cancel_at),
  };
}

/**
 * Writes the subscription state (Stripe is the source of truth). Idempotent:
 * replaying the same event produces the same row. Finds the user through the
 * subscription metadata, or through the customer id saved at checkout.
 */
export async function syncSubscription(subscription: Stripe.Subscription): Promise<{ userId: string | null }> {
  const admin = createAdminClient();
  const row = subscriptionToRow(subscription);

  let userId: string | null = subscription.metadata?.user_id ?? null;
  if (!userId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", row.stripe_customer_id)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) {
    console.warn("[stripe] subscription without known user", subscription.id);
    return { userId: null };
  }

  const { data: previous } = await admin.from("subscriptions").select("status").eq("user_id", userId).maybeSingle();
  const { error } = await admin.from("subscriptions").upsert({ user_id: userId, ...row }, { onConflict: "user_id" });
  if (error) throw error;

  const wasActive = previous?.status === "active" || previous?.status === "trialing";
  const isActive = row.status === "active" || row.status === "trialing";
  if (!wasActive && isActive) await track(userId, "subscription_started", { status: row.status });
  if (wasActive && (row.status === "canceled" || row.status === "unpaid")) {
    await track(userId, "subscription_cancelled", { status: row.status });
  }
  return { userId };
}
