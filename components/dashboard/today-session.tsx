import Link from "next/link";
import { BookOpenTextIcon, ClockIcon, LayersIcon, ListChecksIcon, PencilRulerIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/data/dashboard";
import { SESSION_KIND_LABELS, type SessionKind } from "@/lib/learning/planner";
import { sessionHref } from "@/lib/learning/session-links";

const ICONS: Record<SessionKind, typeof LayersIcon> = {
  flashcards: LayersIcon,
  review: BookOpenTextIcon,
  quiz: ListChecksIcon,
  exercise: PencilRulerIcon,
};

export function TodaySession({ session }: { session: DashboardData["todaySession"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Que dois-je réviser aujourd&apos;hui ?</CardTitle>
        <CardDescription>
          {session.items.length
            ? `Session recommandée — ${session.totalMinutes} min`
            : "Importe un cours pour obtenir une session personnalisée."}
        </CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <Link href="/planner">Planning</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {session.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune activité prévue pour l&apos;instant.</p>
        ) : (
          <ol className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {session.items.map((item, index) => {
              const Icon = ICONS[item.kind];
              const topic = item.title.split(" — ")[1];
              return (
                <li key={`${item.subjectId}-${index}`}>
                  <Link
                    href={sessionHref(item.kind, item.subjectId, topic)}
                    className="flex items-center gap-3 rounded-lg border bg-background/50 p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {SESSION_KIND_LABELS[item.kind]} · {item.subjectName}
                      </span>
                    </span>
                    <Badge variant="secondary" className="gap-1">
                      <ClockIcon /> {item.durationMinutes} min
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
