import type { Metadata } from "next";

import { PricingPlans } from "@/components/billing/pricing-plans";
import { Faq } from "@/components/marketing/faq";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/auth/session";
import { getBillingState } from "@/lib/billing/access";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "StudyOS AI est gratuit pour commencer. Passe à Pro pour des flashcards, quiz et matières illimités.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage({ searchParams }: PageProps<"/pricing">) {
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  const plan = user ? (await getBillingState(user.id)).plan : null;

  return (
    <div className="mx-auto grid max-w-6xl gap-16 px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Des tarifs simples</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Commence gratuitement. Passe à Pro quand tes examens approchent.
        </p>
      </div>
      {query.checkout === "cancelled" && (
        <Alert className="mx-auto max-w-xl">
          <AlertDescription>Paiement annulé : aucun montant n&apos;a été débité.</AlertDescription>
        </Alert>
      )}
      <PricingPlans currentPlan={plan} />
      <section aria-labelledby="pricing-faq" className="mx-auto w-full max-w-3xl">
        <h2 id="pricing-faq" className="mb-6 text-2xl font-semibold">
          Questions fréquentes
        </h2>
        <Faq />
      </section>
    </div>
  );
}
