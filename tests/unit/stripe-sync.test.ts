import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { subscriptionToRow } from "@/lib/stripe/sync";

const sub = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    cancel_at: null,
    metadata: {},
    items: {
      data: [
        { current_period_end: 1_800_000_000, price: { id: "price_a" } },
        { current_period_end: 1_900_000_000, price: { id: "price_b" } },
      ],
    },
    ...overrides,
  }) as unknown as Stripe.Subscription;

describe("subscriptionToRow", () => {
  it("takes the latest item period end (API ≥ 2025-03-31)", () => {
    const row = subscriptionToRow(sub());
    expect(row.current_period_end).toBe(new Date(1_900_000_000 * 1000).toISOString());
    expect(row.stripe_price_id).toBe("price_a");
    expect(row.stripe_customer_id).toBe("cus_1");
  });

  it("accepts an expanded customer and flags scheduled cancellations", () => {
    const row = subscriptionToRow(sub({ customer: { id: "cus_2" }, cancel_at: 1_900_000_000 }));
    expect(row.stripe_customer_id).toBe("cus_2");
    expect(row.cancel_at_period_end).toBe(true);
  });

  it("handles subscriptions without items", () => {
    expect(subscriptionToRow(sub({ items: { data: [] } })).current_period_end).toBeNull();
  });
});
