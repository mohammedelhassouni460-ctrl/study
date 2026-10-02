import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import type { PlanId } from "@/lib/billing/plans";

export function CreditsMeter({ plan, used, limit }: { plan: PlanId; used: number; limit: number }) {
  const remaining = Math.max(0, limit - used);
  return (
    <div className="rounded-lg border bg-card p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium">
          <SparklesIcon className="size-3.5 text-primary" aria-hidden />
          Crédits IA
        </span>
        <span className="text-muted-foreground">
          {remaining.toLocaleString("fr-FR")} / {limit.toLocaleString("fr-FR")}
        </span>
      </div>
      <Progress value={limit ? (remaining / limit) * 100 : 0} aria-label="Crédits IA restants" />
      {plan === "free" && (
        <Link href="/settings/billing" className="mt-2 block font-medium text-primary hover:underline">
          Passer à Pro →
        </Link>
      )}
    </div>
  );
}
