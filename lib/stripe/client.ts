import "server-only";

import Stripe from "stripe";

import type { BillingInterval } from "@/lib/billing/plans";
import { env } from "@/lib/env";
import { AppError } from "@/lib/http/errors";

let client: Stripe | null = null;

export function isStripeConfigured(): boolean {
  const e = env();
  return Boolean(e.STRIPE_SECRET_KEY && e.STRIPE_PRICE_PRO_MONTHLY);
}

export function getStripe(): Stripe {
  const { STRIPE_SECRET_KEY } = env();
  if (!STRIPE_SECRET_KEY) {
    throw new AppError("not_configured", "Le paiement n'est pas encore configuré sur ce serveur.", 503);
  }
  client ??= new Stripe(STRIPE_SECRET_KEY, { maxNetworkRetries: 2, appInfo: { name: "StudyOS AI" } });
  return client;
}

export function priceIdFor(interval: BillingInterval): string {
  const e = env();
  const price = interval === "yearly" ? (e.STRIPE_PRICE_PRO_YEARLY ?? e.STRIPE_PRICE_PRO_MONTHLY) : e.STRIPE_PRICE_PRO_MONTHLY;
  if (!price) throw new AppError("not_configured", "Le paiement n'est pas encore configuré sur ce serveur.", 503);
  return price;
}
