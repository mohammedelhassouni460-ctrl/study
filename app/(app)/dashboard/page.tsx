import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpenIcon,
  CalendarClockIcon,
  FlameIcon,
  LayersIcon,
  PlusIcon,
  TimerIcon,
  TrophyIcon,
} from "lucide-react";

import { ProgressStats } from "@/components/dashboard/progress-stats";
import { TodaySession } from "@/components/dashboard/today-session";
import { EmptyState } from "@/components/shared/empty-state";
import { MasteryBar } from "@/components/shared/mastery";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getBillingState } from "@/lib/billing/access";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatFrenchDate } from "@/lib/learning/dates";
import { subjectColor } from "@/lib/subjects/colors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tableau de bord" };

function formatMinutes(total: number) {
  if (total < 60) return `${total} min`;
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const { user, profile } = await requireOnboardedUser();
  const [data, billing] = await Promise.all([
    getDashboardData(user.id, profile.timezone, profile.daily_study_minutes),
    getBillingState(user.id),
  ]);
  const firstName = profile.full_name?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Bonjour${firstName ? ` ${firstName}` : ""} 👋`}
        description={
          data.nextExam
            ? `Ton examen de ${data.nextExam.subjectName} est dans ${data.nextExam.daysLeft} jour${data.nextExam.daysLeft > 1 ? "s" : ""}. Tu maîtrises environ ${data.globalMastery} % du programme.`
            : "Prêt pour ta session du jour ?"
        }
        actions={
          <Button asChild>
            <Link href="/subjects">
              <PlusIcon /> Ajouter un cours
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarClockIcon}
          label="Prochain examen"
          value={data.nextExam ? `${data.nextExam.daysLeft} j` : "—"}
          hint={data.nextExam ? `${data.nextExam.subjectName} · ${formatFrenchDate(data.nextExam.date)}` : "Ajoute une date à une matière"}
        />
        <StatCard
          icon={TrophyIcon}
          label="Progression globale"
          value={`${data.globalMastery} %`}
          hint={<MasteryBar score={data.globalMastery} className="mt-1" label="Progression globale" />}
        />
        <StatCard
          icon={LayersIcon}
          label="Flashcards à revoir"
          value={data.dueFlashcards}
          hint={data.dueFlashcards ? "Prêtes pour la révision" : "Tout est à jour 🎉"}
        />
        <StatCard
          icon={FlameIcon}
          label="Série"
          value={`🔥 ${data.streak} jour${data.streak > 1 ? "s" : ""}`}
          hint={
            <span className="flex items-center gap-1">
              <TimerIcon className="size-3" aria-hidden /> {formatMinutes(data.studyMinutesThisWeek)} cette semaine · {data.xp} XP
            </span>
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TodaySession session={data.todaySession} />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Matières</CardTitle>
            <CardDescription>Niveau de maîtrise par matière</CardDescription>
          </CardHeader>
          <CardContent>
            {data.subjects.length === 0 ? (
              <EmptyState
                icon={BookOpenIcon}
                title="Aucune matière"
                description="Crée ta première matière pour commencer."
                action={
                  <Button asChild size="sm">
                    <Link href="/subjects">Créer une matière</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="grid gap-4">
                {data.subjects.map((subject) => (
                  <li key={subject.id}>
                    <Link href={`/subjects/${subject.id}`} className="group block">
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2 font-medium group-hover:text-primary">
                          <span className={cn("size-2 shrink-0 rounded-full", subjectColor(subject.color).dot)} aria-hidden />
                          <span className="truncate">{subject.name}</span>
                        </span>
                        <span className="text-muted-foreground tabular-nums">{subject.mastery} %</span>
                      </div>
                      <MasteryBar score={subject.mastery} label={`Maîtrise de ${subject.name}`} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quiz récents</CardTitle>
          <CardDescription>Tes 5 dernières tentatives</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentAttempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun quiz pour l&apos;instant. Génère ton premier QCM depuis une matière.
            </p>
          ) : (
            <ul className="divide-y">
              {data.recentAttempts.map((attempt) => (
                <li key={attempt.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <Link
                    href={`/subjects/${attempt.subjectId}/quiz/${attempt.quizId}?attempt=${attempt.id}`}
                    className="min-w-0 truncate font-medium hover:text-primary"
                  >
                    {attempt.title}
                  </Link>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {attempt.score}/{attempt.total} ·{" "}
                    <span className={cn(attempt.percentage >= 60 ? "text-success" : "text-destructive", "font-medium")}>
                      {Math.round(attempt.percentage)} %
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ProgressStats weekly={data.weekly} locked={!billing.limits.analytics} />
    </>
  );
}
