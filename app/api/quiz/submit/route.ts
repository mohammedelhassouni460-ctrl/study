import { NextResponse } from "next/server";

import { track } from "@/lib/analytics/server";
import { apiHandler, parseJsonBody } from "@/lib/http/api";
import { AppError } from "@/lib/http/errors";
import type { QuestionDifficulty } from "@/lib/learning/mastery";
import { scoreQuiz } from "@/lib/learning/quiz-scoring";
import { applyTopicAnswers } from "@/lib/learning/topic-mastery";
import { loadCorrectedQuestions } from "@/lib/quiz/results";
import { quizSubmitSchema } from "@/lib/validations/learning";

export const POST = apiHandler({ rateLimit: "quizSubmit" }, async (request, { user, supabase }) => {
  const body = await parseJsonBody(request, quizSubmitSchema);

  // RLS: only finds the quiz if it belongs to the user.
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, subject_id, difficulty")
    .eq("id", body.quizId)
    .maybeSingle();
  if (!quiz) throw new AppError("not_found", "Quiz introuvable.", 404);

  const questions = await loadCorrectedQuestions(user.id, quiz.id);
  if (questions.length === 0) throw new AppError("not_found", "Ce quiz ne contient aucune question.", 404);

  const result = scoreQuiz(
    questions.map((q) => ({ id: q.id, correctAnswer: q.correctAnswer, topicId: q.topicId, choicesCount: q.choices.length })),
    body.answers,
  );

  const now = new Date();
  const startedAt = body.startedAt && new Date(body.startedAt) <= now ? body.startedAt : now.toISOString();
  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: user.id,
      quiz_id: quiz.id,
      score: result.score,
      total: result.total,
      percentage: result.percentage,
      started_at: startedAt,
      completed_at: now.toISOString(),
    })
    .select("id")
    .single();
  if (attemptError) throw attemptError;

  const { error: answersError } = await supabase.from("quiz_answers").insert(
    result.results.map((r) => ({
      user_id: user.id,
      attempt_id: attempt.id,
      question_id: r.questionId,
      answer: r.answer,
      is_correct: r.isCorrect,
    })),
  );
  if (answersError) throw answersError;

  const difficulty = quiz.difficulty as QuestionDifficulty;
  const byId = new Map(questions.map((q) => [q.id, q]));
  const topics = await applyTopicAnswers(
    supabase,
    result.results.flatMap((r) => {
      const topicId = byId.get(r.questionId)?.topicId;
      return topicId ? [{ topicId, isCorrect: r.isCorrect, difficulty }] : [];
    }),
  );

  await track(user.id, "quiz_completed", { percentage: result.percentage, total: result.total, difficulty });

  return NextResponse.json({
    attemptId: attempt.id,
    score: result.score,
    total: result.total,
    percentage: result.percentage,
    gradeOn20: result.gradeOn20,
    weakTopicIds: result.weakTopicIds,
    topicMastery: topics.map((t) => ({ id: t.id, masteryScore: t.mastery_score })),
  });
});
