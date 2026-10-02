import "server-only";

import { getCurrentProfile } from "@/lib/auth/session";
import { resolveTopicIds } from "@/lib/documents/topics";
import { AppError } from "@/lib/http/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { QUIZ_DIFFICULTY_VALUES } from "@/lib/validations/ai";

import { generateStructured } from "../client";
import { getCourseContext } from "../context";
import { withAiCredits } from "../credits";
import { SYSTEM_TUTOR, quizPrompt } from "../prompts";
import { quizOutputSchema, type GeneratedQuestion } from "../schemas";

export type QuizDifficulty = (typeof QUIZ_DIFFICULTY_VALUES)[number];

/** Drops malformed questions (wrong number of choices, out-of-range answer, duplicates). */
export function normalizeQuestions(questions: GeneratedQuestion[], count: number): GeneratedQuestion[] {
  const seen = new Set<string>();
  return questions
    .map((q) => ({
      ...q,
      question: q.question.trim().slice(0, 1000),
      choices: q.choices.map((c) => c.trim().slice(0, 500)).filter(Boolean),
      explanation: q.explanation.trim().slice(0, 3000),
      topic: q.topic.trim().slice(0, 120),
    }))
    .filter((q) => {
      const key = q.question.toLowerCase();
      if (!q.question || seen.has(key)) return false;
      if (q.choices.length < 2 || q.choices.length > 6) return false;
      if (new Set(q.choices.map((c) => c.toLowerCase())).size !== q.choices.length) return false;
      if (!Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer >= q.choices.length) return false;
      seen.add(key);
      return true;
    })
    .slice(0, count);
}

export async function generateQuiz(
  supabase: ServerSupabaseClient,
  userId: string,
  input: {
    subjectId: string;
    subjectName: string;
    documentId?: string | null;
    topicId?: string | null;
    count: number;
    difficulty: QuizDifficulty;
  },
) {
  const [profile, { text }, { data: topics }] = await Promise.all([
    getCurrentProfile(),
    getCourseContext(supabase, { subjectId: input.subjectId, documentId: input.documentId }),
    supabase.from("topics").select("id, name, mastery_score, attempts_count").eq("subject_id", input.subjectId).order("mastery_score"),
  ]);
  const allTopics = topics ?? [];
  const target = input.topicId ? allTopics.find((t) => t.id === input.topicId) : undefined;
  if (input.topicId && !target) throw new AppError("not_found", "Concept introuvable.", 404);

  const focus = target
    ? [target.name]
    : allTopics.filter((t) => t.attempts_count > 0 && t.mastery_score < 50).slice(0, 3).map((t) => t.name);

  const questions = await withAiCredits(userId, input.difficulty === "exam" ? "exam" : "quiz", async () => {
    const { data, usage } = await generateStructured({
      schema: quizOutputSchema,
      system: SYSTEM_TUTOR,
      prompt: quizPrompt({
        subjectName: input.subjectName,
        count: input.count,
        difficulty: input.difficulty,
        level: profile?.education_level,
        topics: target ? [target.name] : allTopics.map((t) => t.name),
        focusTopics: focus,
        course: text,
      }),
      maxTokens: 8_000 + input.count * 400,
      effort: input.difficulty === "exam" || input.difficulty === "hard" ? "high" : "medium",
    });
    const normalized = normalizeQuestions(data.questions, input.count);
    if (normalized.length === 0) throw new AppError("ai_invalid_output", "L'IA n'a généré aucune question valide. Réessaie.", 502);
    return { result: { title: data.title.slice(0, 200), questions: normalized }, usage };
  });

  const topicIds = await resolveTopicIds(supabase, userId, input.subjectId, questions.questions.map((q) => q.topic));

  const { data: quiz, error } = await supabase
    .from("quizzes")
    .insert({
      user_id: userId,
      subject_id: input.subjectId,
      title: questions.title,
      difficulty: input.difficulty,
      question_count: questions.questions.length,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Answers are hidden from the `authenticated` role: questions are written with the service role.
  const admin = createAdminClient();
  const { error: questionsError } = await admin.from("quiz_questions").insert(
    questions.questions.map((q, position) => ({
      user_id: userId,
      quiz_id: quiz.id,
      topic_id: topicIds.get(q.topic.toLowerCase()) ?? null,
      position,
      question: q.question,
      choices: q.choices,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
    })),
  );
  if (questionsError) {
    await supabase.from("quizzes").delete().eq("id", quiz.id);
    throw questionsError;
  }
  return { quizId: quiz.id, questionCount: questions.questions.length };
}
