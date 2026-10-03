import "server-only";

import { getCurrentProfile } from "@/lib/auth/session";
import { getBillingState } from "@/lib/billing/access";
import { resolveTopicIds } from "@/lib/documents/topics";
import { AppError } from "@/lib/http/errors";
import type { ServerSupabaseClient } from "@/lib/supabase/server";

import { generateStructured } from "../client";
import { getCourseContext } from "../context";
import { withAiCredits } from "../credits";
import { SYSTEM_TUTOR, flashcardsPrompt } from "../prompts";
import { flashcardsOutputSchema, type GeneratedFlashcard } from "../schemas";

export function normalizeFlashcards(cards: GeneratedFlashcard[], count: number): GeneratedFlashcard[] {
  const seen = new Set<string>();
  return cards
    .map((c) => ({ ...c, question: c.question.slice(0, 1000), answer: c.answer.slice(0, 3000), topic: c.topic.slice(0, 120) }))
    .filter((c) => {
      const key = c.question.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, count);
}

export async function generateFlashcards(
  supabase: ServerSupabaseClient,
  userId: string,
  input: { subjectId: string; subjectName: string; documentId?: string | null; count: number },
) {
  // Free plan: total number of flashcards is capped.
  const { limits } = await getBillingState(userId);
  let count = input.count;
  if (limits.maxFlashcards !== null) {
    const { count: existing } = await supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const remaining = limits.maxFlashcards - (existing ?? 0);
    if (remaining <= 0) {
      throw new AppError(
        "quota_exceeded",
        `Le plan Gratuit est limité à ${limits.maxFlashcards} flashcards. Passe à Pro pour en créer davantage.`,
        402,
      );
    }
    count = Math.min(count, remaining);
  }

  const [profile, { text }, { data: topics }] = await Promise.all([
    getCurrentProfile(),
    getCourseContext(supabase, { subjectId: input.subjectId, documentId: input.documentId }),
    supabase.from("topics").select("name, mastery_score").eq("subject_id", input.subjectId).order("mastery_score"),
  ]);
  const topicNames = (topics ?? []).map((t) => t.name);
  const weak = (topics ?? []).filter((t) => t.mastery_score > 0 && t.mastery_score < 50).slice(0, 3).map((t) => t.name);

  const cards = await withAiCredits(userId, "flashcards", async () => {
    const { data, usage } = await generateStructured({
      schema: flashcardsOutputSchema,
      system: SYSTEM_TUTOR,
      prompt: flashcardsPrompt({
        subjectName: input.subjectName,
        count,
        level: profile?.education_level,
        topics: topicNames,
        focusTopics: weak,
        course: text,
      }),
      maxTokens: 6_000 + count * 250,
      effort: "medium",
    });
    const normalized = normalizeFlashcards(data.flashcards, count);
    if (normalized.length === 0) throw new AppError("ai_invalid_output", "L'IA n'a généré aucune carte. Réessaie.", 502);
    return { result: normalized, usage };
  });

  const topicIds = await resolveTopicIds(supabase, userId, input.subjectId, cards.map((c) => c.topic));
  const { data: inserted, error } = await supabase
    .from("flashcards")
    .insert(
      cards.map((card) => ({
        user_id: userId,
        subject_id: input.subjectId,
        document_id: input.documentId ?? null,
        topic_id: topicIds.get(card.topic.toLowerCase()) ?? null,
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty,
      })),
    )
    .select("id");
  if (error) throw error;
  return { created: inserted?.length ?? 0, capped: count < input.count };
}
