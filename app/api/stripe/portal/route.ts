import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { apiHandler } from "@/lib/http/api";
import { AppError } from "@/lib/http/errors";
import { getStripe } from "@/lib/stripe/client";

/** Opens the Stripe Customer Portal (change card, cancel, invoices). */
export const POST = apiHandler({ rateLimit: "billing" }, async (_request, { user, supabase }) => {
  const stripe = getStripe();
  const { data } = await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (!data?.stripe_customer_id) throw new AppError("not_found", "Aucun abonnement à gérer pour l'instant.", 404);

  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${env().NEXT_PUBLIC_APP_URL}/settings/billing`,
    locale: "fr",
  });
  return NextResponse.json({ url: session.url });
});
