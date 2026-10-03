import Link from "next/link";
import { CalendarIcon, FileTextIcon, LayersIcon } from "lucide-react";

import { MasteryBar } from "@/components/shared/mastery";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubjectOverview } from "@/lib/data/subjects";
import { daysBetween, formatFrenchDate, toISODate } from "@/lib/learning/dates";
import { subjectColor } from "@/lib/subjects/colors";
import { cn } from "@/lib/utils";

export function SubjectCard({ subject }: { subject: SubjectOverview }) {
  const colors = subjectColor(subject.color);
  const daysLeft = subject.exam_date ? daysBetween(toISODate(new Date()), subject.exam_date) : null;
  return (
    <Link href={`/subjects/${subject.id}`} className="group block rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card className="h-full gap-4 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <span className={cn("grid size-10 place-items-center rounded-lg text-lg font-semibold", colors.soft)} aria-hidden>
              {subject.name.charAt(0).toUpperCase()}
            </span>
            {daysLeft !== null && daysLeft >= 0 && (
              <Badge variant={daysLeft <= 7 ? "destructive" : "secondary"} className="gap-1">
                <CalendarIcon /> J-{daysLeft}
              </Badge>
            )}
          </div>
          <CardTitle className="mt-2 truncate text-lg group-hover:text-primary">{subject.name}</CardTitle>
          {subject.exam_date && (
            <p className="text-xs text-muted-foreground">Examen le {formatFrenchDate(subject.exam_date)}</p>
          )}
        </CardHeader>
        <CardContent className="mt-auto grid gap-3">
          <div>
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-muted-foreground">Maîtrise</span>
              <span className="font-medium tabular-nums">{subject.mastery} %</span>
            </div>
            <MasteryBar score={subject.mastery} label={`Maîtrise de ${subject.name}`} />
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileTextIcon className="size-3.5" aria-hidden /> {subject.documentsCount} doc.
            </span>
            <span className="flex items-center gap-1">
              <LayersIcon className="size-3.5" aria-hidden /> {subject.dueFlashcards} à revoir
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
