import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe/client";
import { syncSubscription } from "@/lib/stripe/sync";

const SUBSCRIPTION_EVENTS = new Set<Stripe.Event["type"]>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

/**
 * Stripe webhook. The signature is verified on the raw body; the subscription
 * state is only ever granted from here (never from the checkout redirect).
 * Excluded from the auth proxy (see proxy.ts matcher).
 */
export async function POST(request: Request) {
  const { STRIPE_WEBHOOK_SECRET: secret, STRIPE_SECRET_KEY } = env();
  if (!secret || !STRIPE_SECRET_KEY) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY missing");
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature manquante." }, { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch (error) {
    console.warn("[stripe] invalid signature", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  try {
    if (SUBSCRIPTION_EVENTS.has(event.type)) {
      await syncSubscription(event.data.object as Stripe.Subscription);
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(id);
        if (!subscription.metadata?.user_id && session.client_reference_id) {
          subscription.metadata = { ...subscription.metadata, user_id: session.client_reference_id };
        }
        await syncSubscription(subscription);
      }
    }
  } catch (error) {
    // 500 makes Stripe retry the delivery later.
    console.error("[stripe] webhook handling failed", event.type, error);
    return NextResponse.json({ error: "Erreur de traitement." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
