import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangleIcon, CalendarDaysIcon, GraduationCapIcon } from "lucide-react";

import { PlanGenerator } from "@/components/planner/plan-generator";
import { SessionItem, type PlannerSession } from "@/components/planner/session-item";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listSubjectOverviews } from "@/lib/data/subjects";
import { addDays, daysBetween, formatFrenchWeekday, toISODate } from "@/lib/learning/dates";
import type { SessionKind } from "@/lib/learning/planner";
import { subjectColor } from "@/lib/subjects/colors";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Planning" };

function dayLabel(date: string, today: string) {
  const diff = daysBetween(today, date);
  if (diff === 0) return `Aujourd'hui · ${formatFrenchWeekday(date)}`;
  if (diff === 1) return `Demain · ${formatFrenchWeekday(date)}`;
  return formatFrenchWeekday(date);
}

export default async function PlannerPage() {
  const { profile } = await requireOnboardedUser();
  const today = toISODate(new Date(), profile.timezone);
  const tomorrow = addDays(today, 1);
  const supabase = await createClient();

  const [subjects, { data: rows }] = await Promise.all([
    listSubjectOverviews(),
    supabase
      .from("study_sessions")
      .select("id, subject_id, topic_id, scheduled_date, kind, title, duration_minutes, status, position, topics(name)")
      .gte("scheduled_date", addDays(today, -14))
      .lte("scheduled_date", addDays(today, 45))
      .order("scheduled_date")
      .order("position"),
  ]);

  const bySubject = new Map(subjects.map((s) => [s.id, s]));
  const sessions: PlannerSession[] = (rows ?? []).map((r) => ({
    id: r.id,
    subjectId: r.subject_id,
    subjectName: bySubject.get(r.subject_id)?.name ?? "Matière",
    dotClass: subjectColor(bySubject.get(r.subject_id)?.color).dot,
    kind: r.kind as SessionKind,
    title: r.title,
    topicName: r.topics?.name ?? null,
    durationMinutes: r.duration_minutes,
    status: r.status as PlannerSession["status"],
    date: r.scheduled_date,
  }));

  const overdue = sessions.filter((s) => s.date < today && s.status === "planned");
  const upcoming = sessions.filter((s) => s.date >= today);
  const exams = subjects
    .filter((s) => s.exam_date && s.exam_date >= today)
    .map((s) => ({ date: s.exam_date!, name: s.name, id: s.id }));

  const days = [...new Set([...upcoming.map((s) => s.date), ...exams.map((e) => e.date)])].sort();
  const hasPlan = upcoming.length > 0;

  return (
    <>
      <PageHeader
        title="Planning"
        description="Tes révisions jour par jour : examens proches et concepts faibles d'abord."
        actions={<PlanGenerator defaultMinutes={profile.daily_study_minutes} hasPlan={hasPlan} />}
      />

      {subjects.length === 0 ? (
        <EmptyState
          icon={CalendarDaysIcon}
          title="Aucune matière"
          description="Crée une matière et importe un cours pour générer ton planning de révision."
          action={
            <Button asChild>
              <Link href="/subjects">Créer une matière</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-8">
          {overdue.length > 0 && (
            <section aria-labelledby="overdue" className="grid gap-3">
              <h2 id="overdue" className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangleIcon className="size-4 text-warning" aria-hidden /> En retard ({overdue.length})
              </h2>
              <ul className="grid gap-2">
                {overdue.map((s) => (
                  <SessionItem key={s.id} session={s} today={today} tomorrow={tomorrow} />
                ))}
              </ul>
            </section>
          )}

          {!hasPlan && (
            <EmptyState
              icon={CalendarDaysIcon}
              title="Pas encore de planning"
              description="Choisis la période et ton temps de révision quotidien, puis génère ton planning. Tu pourras déplacer chaque session."
            />
          )}

          {days.map((date) => {
            const daySessions = upcoming.filter((s) => s.date === date);
            const dayExams = exams.filter((e) => e.date === date);
            const minutes = daySessions.filter((s) => s.status !== "skipped").reduce((sum, s) => sum + s.durationMinutes, 0);
            const done = daySessions.filter((s) => s.status === "done").length;
            return (
              <section key={date} aria-labelledby={`day-${date}`} className="grid gap-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 id={`day-${date}`} className="font-semibold">
                    {dayLabel(date, today)}
                  </h2>
                  {daySessions.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {done}/{daySessions.length} faites · {minutes} min
                    </span>
                  )}
                </div>
                {dayExams.map((exam) => (
                  <Link
                    key={exam.id}
                    href={`/subjects/${exam.id}`}
                    className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm font-medium text-primary"
                  >
                    <GraduationCapIcon className="size-4" aria-hidden /> Examen : {exam.name}
                  </Link>
                ))}
                {daySessions.length > 0 && (
                  <ul className="grid gap-2">
                    {daySessions.map((s) => (
                      <SessionItem key={s.id} session={s} today={today} tomorrow={tomorrow} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
