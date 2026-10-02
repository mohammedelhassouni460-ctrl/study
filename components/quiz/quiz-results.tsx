import Link from "next/link";
import { CheckCircle2Icon, LayersIcon, ListChecksIcon, MessageCircleQuestionIcon, RotateCcwIcon, XCircleIcon } from "lucide-react";

import { MasteryBar } from "@/components/shared/mastery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CorrectedQuestion } from "@/lib/quiz/results";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function verdict(percentage: number) {
  if (percentage >= 90) return { title: "Excellent ! 🔥", text: "Tu maîtrises ce chapitre." };
  if (percentage >= 70) return { title: "Très bien ! 🙂", text: "Encore quelques notions à consolider." };
  if (percentage >= 50) return { title: "Pas mal ! 💪", text: "Revois les concepts ci-dessous puis refais un quiz." };
  return { title: "Continue ! 📚", text: "Commence par revoir la fiche et les flashcards des concepts faibles." };
}

export interface WeakTopic {
  id: string;
  name: string;
  masteryScore: number;
  correct: number;
  total: number;
}

export function QuizResults({
  subjectId,
  quizId,
  score,
  total,
  percentage,
  questions,
  answers,
  weakTopics,
}: {
  subjectId: string;
  quizId: string;
  score: number;
  total: number;
  percentage: number;
  questions: CorrectedQuestion[];
  answers: Map<string, number | null>;
  weakTopics: WeakTopic[];
}) {
  const base = `/subjects/${subjectId}`;
  const { title, text } = verdict(percentage);
  const grade = total === 0 ? 0 : Math.round((score / total) * 200) / 10;

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Card>
        <CardContent className="grid gap-4 pt-6 text-center sm:grid-cols-3 sm:text-left">
          <div className="sm:col-span-2">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="text-muted-foreground">{text}</p>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center sm:col-span-3">
            <div className="rounded-lg bg-muted p-3">
              <dt className="text-xs text-muted-foreground">Score</dt>
              <dd className="text-xl font-semibold" data-testid="quiz-score">
                {score} / {total}
              </dd>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <dt className="text-xs text-muted-foreground">Réussite</dt>
              <dd className="text-xl font-semibold">{Math.round(percentage)} %</dd>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <dt className="text-xs text-muted-foreground">Note</dt>
              <dd className="text-xl font-semibold">{grade.toLocaleString("fr-FR")} / 20</dd>
            </div>
          </dl>
          <div className="flex flex-wrap justify-center gap-2 sm:col-span-3">
            <Button asChild variant="outline">
              <Link href={`${base}/quiz/${quizId}`}>
                <RotateCcwIcon /> Refaire ce quiz
              </Link>
            </Button>
            <Button asChild>
              <Link href={`${base}/quiz`}>
                <ListChecksIcon /> Nouveau quiz
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {weakTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Concepts à retravailler</CardTitle>
            <CardDescription>Ta maîtrise a été mise à jour avec ce quiz.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {weakTopics.map((topic) => (
              <div key={topic.id} className="grid gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{topic.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {topic.correct} / {topic.total} correct{topic.correct > 1 ? "es" : "e"}
                  </span>
                </div>
                <MasteryBar score={topic.masteryScore} label={`Maîtrise de ${topic.name}`} />
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`${base}/quiz?topic=${topic.id}`}>
                      <ListChecksIcon /> Quiz ciblé
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`${base}/flashcards`}>
                      <LayersIcon /> Flashcards
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`${base}/chat?prompt=${encodeURIComponent(`Explique-moi simplement : ${topic.name}`)}`}>
                      <MessageCircleQuestionIcon /> Me l&apos;expliquer
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="correction" className="grid gap-3">
        <h2 id="correction" className="text-lg font-semibold">
          Correction
        </h2>
        <ol className="grid gap-3">
          {questions.map((q, i) => {
            const answer = answers.get(q.id) ?? null;
            const correct = answer === q.correctAnswer;
            return (
              <li key={q.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start gap-2">
                  {correct ? (
                    <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-success" aria-label="Bonne réponse" />
                  ) : (
                    <XCircleIcon className="mt-0.5 size-5 shrink-0 text-destructive" aria-label="Mauvaise réponse" />
                  )}
                  <p className="font-medium whitespace-pre-line">
                    {i + 1}. {q.question}
                  </p>
                </div>
                <ul className="mt-3 grid gap-1.5 text-sm">
                  {q.choices.map((choice, c) => (
                    <li
                      key={c}
                      className={cn(
                        "flex gap-2 rounded-md border px-3 py-2",
                        c === q.correctAnswer && "border-success/50 bg-success/10",
                        c === answer && c !== q.correctAnswer && "border-destructive/50 bg-destructive/10",
                      )}
                    >
                      <span className="font-semibold">{LETTERS[c]}.</span>
                      <span className="flex-1">{choice}</span>
                      {c === answer && <span className="text-xs text-muted-foreground">Ta réponse</span>}
                    </li>
                  ))}
                </ul>
                {answer === null && <p className="mt-2 text-xs text-muted-foreground">Sans réponse</p>}
                {q.explanation && (
                  <p className="mt-3 rounded-md bg-muted p-3 text-sm whitespace-pre-line">
                    <span className="font-medium">Explication : </span>
                    {q.explanation}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
