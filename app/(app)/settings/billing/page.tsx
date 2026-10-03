import type { Metadata } from "next";

import { PortalButton } from "@/components/billing/billing-buttons";
import { PricingPlans } from "@/components/billing/pricing-plans";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/session";
import { getBillingState } from "@/lib/billing/access";
import { PRICING } from "@/lib/billing/plans";

export const metadata: Metadata = { title: "Abonnement" };

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  trialing: "Essai",
  past_due: "Paiement en retard",
  canceled: "Résilié",
  unpaid: "Impayé",
  incomplete: "Incomplet",
  incomplete_expired: "Expiré",
  paused: "En pause",
};

const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default async function BillingSettingsPage({ searchParams }: PageProps<"/settings/billing">) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const billing = await getBillingState(user.id);
  const sub = billing.subscription;
  const usedPct = Math.min(100, (billing.creditsUsed / billing.limits.monthlyCredits) * 100);

  return (
    <>
      {query.checkout === "success" && (
        <Alert variant="info">
          <AlertTitle>Merci pour ton abonnement !</AlertTitle>
          <AlertDescription>
            {billing.plan === "pro"
              ? "Ton plan Pro est actif. Bonnes révisions !"
              : "Ton paiement est en cours de confirmation : ton plan Pro sera activé dans quelques instants (actualise la page)."}
          </AlertDescription>
        </Alert>
      )}
      {sub?.status === "past_due" && (
        <Alert variant="destructive">
          <AlertTitle>Paiement en échec</AlertTitle>
          <AlertDescription>Mets à jour ton moyen de paiement pour conserver ton accès Pro.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Plan actuel</CardTitle>
          <CardDescription>
            {billing.plan === "pro" && sub?.currentPeriodEnd
              ? sub.cancelAtPeriodEnd
                ? `Ton abonnement se termine le ${date(sub.currentPeriodEnd)}.`
                : `Prochain renouvellement le ${date(sub.currentPeriodEnd)}.`
              : "Tu utilises le plan Gratuit."}
          </CardDescription>
          <CardAction className="flex gap-2">
            <Badge variant={billing.plan === "pro" ? "default" : "secondary"} data-testid="current-plan">
              {PRICING[billing.plan].name}
            </Badge>
            {sub?.status && sub.status !== "active" && <Badge variant="outline">{STATUS_LABELS[sub.status] ?? sub.status}</Badge>}
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <div className="flex justify-between text-sm">
              <span>Crédits IA ce mois-ci</span>
              <span className="font-medium">
                {billing.creditsUsed.toLocaleString("fr-FR")} / {billing.limits.monthlyCredits.toLocaleString("fr-FR")}
              </span>
            </div>
            <Progress value={usedPct} aria-label="Crédits IA utilisés" />
            <p className="text-xs text-muted-foreground">Les crédits se renouvellent le 1er de chaque mois.</p>
          </div>
          {sub?.hasCustomer && billing.plan === "pro" && (
            <div>
              <PortalButton>Gérer mon abonnement et mes factures</PortalButton>
            </div>
          )}
        </CardContent>
      </Card>

      {billing.plan === "free" && (
        <section aria-labelledby="upgrade" className="grid gap-4">
          <h2 id="upgrade" className="text-lg font-semibold">
            Passer à Pro
          </h2>
          <PricingPlans currentPlan="free" headingLevel="h3" />
        </section>
      )}
    </>
  );
}
