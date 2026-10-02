import "server-only";

import type { ServerSupabaseClient } from "@/lib/supabase/server";

import { calculateMasteryScore, type QuestionDifficulty } from "./mastery";

export interface TopicAnswer {
  topicId: string;
  isCorrect: boolean;
  difficulty?: QuestionDifficulty;
}

/** Applies a batch of answers to the topics' mastery scores (sequentially, in answer order). */
export async function applyTopicAnswers(supabase: ServerSupabaseClient, answers: TopicAnswer[]) {
  const ids = [...new Set(answers.map((a) => a.topicId))];
  if (ids.length === 0) return [];
  const { data: topics } = await supabase
    .from("topics")
    .select("id, mastery_score, attempts_count, correct_count")
    .in("id", ids);

  const state = new Map((topics ?? []).map((t) => [t.id, { ...t }]));
  for (const answer of answers) {
    const topic = state.get(answer.topicId);
    if (!topic) continue;
    topic.mastery_score = calculateMasteryScore({
      currentScore: topic.mastery_score,
      isCorrect: answer.isCorrect,
      difficulty: answer.difficulty,
      attempts: topic.attempts_count,
      correctCount: topic.correct_count,
    });
    topic.attempts_count += 1;
    if (answer.isCorrect) topic.correct_count += 1;
  }

  const now = new Date().toISOString();
  const updated = [...state.values()];
  await Promise.all(
    updated.map((t) =>
      supabase
        .from("topics")
        .update({
          mastery_score: t.mastery_score,
          attempts_count: t.attempts_count,
          correct_count: t.correct_count,
          last_studied_at: now,
        })
        .eq("id", t.id),
    ),
  );
  return updated;
}
