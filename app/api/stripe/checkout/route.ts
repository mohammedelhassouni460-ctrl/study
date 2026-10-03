import { NextResponse } from "next/server";

import { track } from "@/lib/analytics/server";
import { getBillingState } from "@/lib/billing/access";
import { env } from "@/lib/env";
import { apiHandler, parseJsonBody } from "@/lib/http/api";
import { AppError } from "@/lib/http/errors";
import { getStripe, priceIdFor } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutRequestSchema } from "@/lib/validations/billing";

/** Creates a Stripe Checkout session for the Pro plan and returns its URL. */
export const POST = apiHandler({ rateLimit: "billing" }, async (request, { user }) => {
  const { interval } = await parseJsonBody(request, checkoutRequestSchema);
  const stripe = getStripe();
  const price = priceIdFor(interval);

  const billing = await getBillingState(user.id);
  if (billing.plan === "pro") {
    throw new AppError("conflict", "Tu es déjà abonné à Pro. Gère ton abonnement depuis les paramètres.", 409);
  }

  // Reuse the Stripe customer if one exists, otherwise create it and remember it.
  const admin = createAdminClient();
  const { data: existing } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  let customerId = existing?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    const { error } = await admin
      .from("subscriptions")
      .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
    if (error) throw error;
  }

  const appUrl = env().NEXT_PUBLIC_APP_URL;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    locale: "fr",
    success_url: `${appUrl}/settings/billing?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
  });
  if (!session.url) throw new AppError("conflict", "Impossible de démarrer le paiement. Réessaie.", 502);

  await track(user.id, "checkout_started", { interval });
  return NextResponse.json({ url: session.url });
});
