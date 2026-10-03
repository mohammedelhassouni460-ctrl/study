import Link from "next/link";
import { LockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/data/dashboard";
import { formatFrenchDate } from "@/lib/learning/dates";
import { cn } from "@/lib/utils";

/** Weekly progression (Pro feature): average quiz score and flashcard reviews. */
export function ProgressStats({ weekly, locked }: { weekly: DashboardData["weekly"]; locked: boolean }) {
  const maxReviews = Math.max(1, ...weekly.map((w) => w.reviews));
  return (
    <Card className="relative mt-6 overflow-hidden">
      <CardHeader>
        <CardTitle>Statistiques de progression</CardTitle>
        <CardDescription>Score moyen aux quiz et flashcards révisées, sur 8 semaines</CardDescription>
      </CardHeader>
      <CardContent className={cn(locked && "pointer-events-none blur-sm select-none")} aria-hidden={locked}>
        <div className="grid grid-cols-8 items-end gap-2" role="img" aria-label="Évolution hebdomadaire">
          {weekly.map((w) => (
            <div key={w.weekStart} className="grid gap-1 text-center">
              <span className="text-xs font-medium tabular-nums">{w.quizAverage === null ? "—" : `${w.quizAverage} %`}</span>
              <div className="flex h-28 items-end justify-center gap-1">
                <div
                  className="w-3 rounded-t bg-primary"
                  style={{ height: `${w.quizAverage ?? 0}%` }}
                  title={`Score moyen : ${w.quizAverage ?? 0} %`}
                />
                <div
                  className="w-3 rounded-t bg-success/70"
                  style={{ height: `${(w.reviews / maxReviews) * 100}%` }}
                  title={`${w.reviews} flashcards révisées`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{formatFrenchDate(w.weekStart)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-primary" aria-hidden /> Score moyen aux quiz
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-success/70" aria-hidden /> Flashcards révisées
          </span>
        </div>
      </CardContent>
      {locked && (
        <div className="absolute inset-0 top-16 grid place-items-center bg-background/40">
          <div className="grid justify-items-center gap-2 text-center">
            <LockIcon className="size-5 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">Disponible avec StudyOS Pro</p>
            <Button asChild size="sm">
              <Link href="/settings/billing">Passer à Pro</Link>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
