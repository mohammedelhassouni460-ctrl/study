import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, ListChecksIcon } from "lucide-react";

import { QuizGenerator } from "@/components/quiz/quiz-generator";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DIFFICULTY_LABELS } from "@/lib/quiz/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizListPage({ params, searchParams }: PageProps<"/subjects/[id]/quiz">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data: documents }, { data: topics }, { data: quizzes }] = await Promise.all([
    supabase.from("documents").select("id, name").eq("subject_id", id).eq("status", "ready").order("created_at"),
    supabase.from("topics").select("id, name").eq("subject_id", id).order("name"),
    supabase
      .from("quizzes")
      .select("id, title, difficulty, question_count, created_at, quiz_attempts(percentage, completed_at)")
      .eq("subject_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="content-start">
        <QuizGenerator
          subjectId={id}
          documents={documents ?? []}
          topics={topics ?? []}
          defaultTopicId={typeof query.topic === "string" ? query.topic : undefined}
        />
      </div>
      <div className="lg:col-span-2">
        {!quizzes?.length ? (
          <EmptyState
            icon={ListChecksIcon}
            title="Aucun quiz pour l'instant"
            description={
              documents?.length
                ? "Génère un QCM pour tester tes connaissances : ta maîtrise de chaque concept sera mise à jour."
                : "Importe un cours pour générer ton premier quiz."
            }
            action={
              documents?.length ? undefined : (
                <Button asChild>
                  <Link href={`/subjects/${id}/documents`}>Importer un cours</Link>
                </Button>
              )
            }
          />
        ) : (
          <section aria-labelledby="quiz-history" className="grid gap-3">
            <h2 id="quiz-history" className="text-sm font-semibold">
              Tes quiz
            </h2>
            <ul className="grid gap-2">
              {quizzes.map((quiz) => {
                const attempts = quiz.quiz_attempts.filter((a) => a.completed_at);
                const best = attempts.length ? Math.max(...attempts.map((a) => Number(a.percentage))) : null;
                return (
                  <li key={quiz.id}>
                    <Link
                      href={`/subjects/${id}/quiz/${quiz.id}`}
                      className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{quiz.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {quiz.question_count} questions · {new Date(quiz.created_at).toLocaleDateString("fr-FR")}
                          {attempts.length > 0 && ` · ${attempts.length} tentative${attempts.length > 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <Badge variant="secondary">{DIFFICULTY_LABELS[quiz.difficulty]}</Badge>
                      {best !== null ? (
                        <Badge variant={best >= 70 ? "success" : best >= 50 ? "warning" : "destructive"}>{Math.round(best)} %</Badge>
                      ) : (
                        <Badge variant="outline">À faire</Badge>
                      )}
                      <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
