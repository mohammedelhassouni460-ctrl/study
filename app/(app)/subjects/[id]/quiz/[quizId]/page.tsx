import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { QuizResults, type WeakTopic } from "@/components/quiz/quiz-results";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { DIFFICULTY_LABELS } from "@/lib/quiz/labels";
import { loadCorrectedQuestions } from "@/lib/quiz/results";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/common";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage({ params, searchParams }: PageProps<"/subjects/[id]/quiz/[quizId]">) {
  const [{ id, quizId }, query] = await Promise.all([params, searchParams]);
  if (!uuidSchema.safeParse(quizId).success) notFound();
  const user = await requireUser();
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, difficulty, question_count, subject_id")
    .eq("id", quizId)
    .eq("subject_id", id)
    .maybeSingle();
  if (!quiz) notFound();

  const attemptId = typeof query.attempt === "string" && uuidSchema.safeParse(query.attempt).success ? query.attempt : null;

  const header = (
    <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center gap-3">
      <Link
        href={`/subjects/${id}/quiz`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> Quiz
      </Link>
      <h1 className="flex-1 text-xl font-semibold">{quiz.title}</h1>
      <Badge variant="secondary">{DIFFICULTY_LABELS[quiz.difficulty]}</Badge>
    </div>
  );

  if (attemptId) {
    // RLS: the attempt is only found if it belongs to the user.
    const { data: attempt } = await supabase
      .from("quiz_attempts")
      .select("id, score, total, percentage, completed_at, quiz_answers(question_id, answer, is_correct)")
      .eq("id", attemptId)
      .eq("quiz_id", quiz.id)
      .not("completed_at", "is", null)
      .maybeSingle();
    if (!attempt) notFound();

    // Answers are only revealed for a completed attempt of the owner.
    const questions = await loadCorrectedQuestions(user.id, quiz.id);
    const answers = new Map(attempt.quiz_answers.map((a) => [a.question_id, a.answer]));

    const perTopic = new Map<string, { name: string; correct: number; total: number }>();
    for (const q of questions) {
      if (!q.topicId) continue;
      const entry = perTopic.get(q.topicId) ?? { name: q.topicName ?? "", correct: 0, total: 0 };
      entry.total += 1;
      if (answers.get(q.id) === q.correctAnswer) entry.correct += 1;
      perTopic.set(q.topicId, entry);
    }
    const weakIds = [...perTopic.entries()].filter(([, t]) => t.correct / t.total < 0.6).map(([topicId]) => topicId);
    const { data: topicRows } = weakIds.length
      ? await supabase.from("topics").select("id, mastery_score").in("id", weakIds)
      : { data: [] };
    const weakTopics: WeakTopic[] = weakIds
      .map((topicId) => {
        const t = perTopic.get(topicId)!;
        const mastery = topicRows?.find((r) => r.id === topicId)?.mastery_score ?? 0;
        return { id: topicId, name: t.name, correct: t.correct, total: t.total, masteryScore: mastery };
      })
      .sort((a, b) => a.correct / a.total - b.correct / b.total);

    return (
      <>
        {header}
        <QuizResults
          subjectId={id}
          quizId={quiz.id}
          score={attempt.score}
          total={attempt.total}
          percentage={Number(attempt.percentage)}
          questions={questions}
          answers={answers}
          weakTopics={weakTopics}
        />
      </>
    );
  }

  // Taking the quiz: only public columns (never the correct answer).
  const { data: rows } = await supabase
    .from("quiz_questions")
    .select("id, position, question, choices, topics(name)")
    .eq("quiz_id", quiz.id)
    .order("position");
  const questions = (rows ?? []).map((q) => ({
    id: q.id,
    position: q.position,
    question: q.question,
    choices: Array.isArray(q.choices) ? q.choices.map(String) : [],
    topicName: q.topics?.name ?? null,
  }));
  if (questions.length === 0) notFound();

  return (
    <>
      {header}
      <QuizRunner key={quiz.id} quizId={quiz.id} questions={questions} />
    </>
  );
}
