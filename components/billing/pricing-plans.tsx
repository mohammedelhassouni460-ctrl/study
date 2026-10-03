"use client";

import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { PLAN_FEATURES, PRICING, type BillingInterval, type PlanId } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

import { CheckoutButton, PortalButton } from "./billing-buttons";

const euro = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/**
 * Pricing cards. `currentPlan` is null for visitors (CTAs lead to signup),
 * otherwise the CTAs start a checkout or open the customer portal.
 */
export function PricingPlans({ currentPlan, headingLevel = "h2" }: { currentPlan: PlanId | null; headingLevel?: "h2" | "h3" }) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const yearlyMonthly = PRICING.pro.priceYearly / 12;
  const savings = Math.round((1 - PRICING.pro.priceYearly / (PRICING.pro.priceMonthly * 12)) * 100);
  const Heading = headingLevel;

  return (
    <div className="grid gap-6">
      <div className="mx-auto inline-flex rounded-lg border bg-muted p-1" role="group" aria-label="Période de facturation">
        {(["monthly", "yearly"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setInterval(value)}
            aria-pressed={interval === value}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              interval === value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "monthly" ? "Mensuel" : `Annuel (-${savings} %)`}
          </button>
        ))}
      </div>

      <div className="mx-auto grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <Card className={cn(currentPlan === "free" && "border-primary/50")}>
          <CardHeader>
            <Heading className="text-lg leading-none font-semibold">{PRICING.free.name}</Heading>
            <CardDescription>Pour découvrir StudyOS</CardDescription>
            <p className="pt-2 text-4xl font-bold">
              0 €<span className="text-base font-normal text-muted-foreground"> / mois</span>
            </p>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm">
              {PLAN_FEATURES.free.map((f) => (
                <li key={f} className="flex gap-2">
                  <CheckIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> {f}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="mt-auto">
            {currentPlan === null ? (
              <Button asChild variant="outline" className="w-full">
                <Link href="/signup">Commencer gratuitement</Link>
              </Button>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                {currentPlan === "free" ? "Ton plan actuel" : "Inclus"}
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="relative border-primary shadow-lg shadow-primary/10">
          <Badge className="absolute -top-3 left-6">Le plus populaire</Badge>
          <CardHeader>
            <Heading className="text-lg leading-none font-semibold">{PRICING.pro.name}</Heading>
            <CardDescription>Pour réussir ses examens</CardDescription>
            <p className="pt-2 text-4xl font-bold">
              {euro(interval === "monthly" ? PRICING.pro.priceMonthly : yearlyMonthly)}
              <span className="text-base font-normal text-muted-foreground"> / mois</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {interval === "monthly" ? "Sans engagement, résiliable à tout moment" : `Facturé ${euro(PRICING.pro.priceYearly)} par an`}
            </p>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm">
              {PLAN_FEATURES.pro.map((f) => (
                <li key={f} className="flex gap-2">
                  <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden /> {f}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="mt-auto">
            {currentPlan === null ? (
              <Button asChild className="w-full">
                <Link href="/signup?plan=pro">Passer à Pro</Link>
              </Button>
            ) : currentPlan === "pro" ? (
              <PortalButton className="w-full">Gérer mon abonnement</PortalButton>
            ) : (
              <CheckoutButton interval={interval} className="w-full">
                Passer à Pro
              </CheckoutButton>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
