import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface CorrectedQuestion {
  id: string;
  position: number;
  question: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
  topicId: string | null;
  topicName: string | null;
}

/**
 * Loads a quiz's questions WITH answers. Uses the service role because the
 * answer columns are hidden from users; always scoped to the owner explicitly.
 * Only call after checking that `userId` owns `quizId` and is allowed to see answers.
 */
export async function loadCorrectedQuestions(userId: string, quizId: string): Promise<CorrectedQuestion[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quiz_questions")
    .select("id, position, question, choices, correct_answer, explanation, topic_id, topics(name)")
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .order("position");
  if (error) throw error;
  return (data ?? []).map((q) => ({
    id: q.id,
    position: q.position,
    question: q.question,
    choices: Array.isArray(q.choices) ? q.choices.map(String) : [],
    correctAnswer: q.correct_answer,
    explanation: q.explanation,
    topicId: q.topic_id,
    topicName: q.topics?.name ?? null,
  }));
}
