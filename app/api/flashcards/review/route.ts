import { NextResponse } from "next/server";

import { track } from "@/lib/analytics/server";
import { apiHandler, parseJsonBody } from "@/lib/http/api";
import { AppError } from "@/lib/http/errors";
import { scheduleNextReview } from "@/lib/learning/spaced-repetition";
import { applyTopicAnswers } from "@/lib/learning/topic-mastery";
import { flashcardReviewSchema } from "@/lib/validations/learning";

export const POST = apiHandler({ rateLimit: "flashcardReview" }, async (request, { user, supabase }) => {
  const { flashcardId, rating } = await parseJsonBody(request, flashcardReviewSchema);

  const { data: card } = await supabase
    .from("flashcards")
    .select("id, topic_id, ease_factor, interval_days, review_count, lapses, mastery_score, difficulty")
    .eq("id", flashcardId)
    .maybeSingle();
  if (!card) throw new AppError("not_found", "Flashcard introuvable.", 404);

  const now = new Date();
  const next = scheduleNextReview(
    {
      easeFactor: Number(card.ease_factor),
      intervalDays: Number(card.interval_days),
      reviewCount: card.review_count,
      lapses: card.lapses,
      masteryScore: card.mastery_score,
    },
    rating,
    now,
  );

  const [{ error: updateError }, { error: reviewError }] = await Promise.all([
    supabase
      .from("flashcards")
      .update({
        ease_factor: next.easeFactor,
        interval_days: next.intervalDays,
        review_count: next.reviewCount,
        lapses: next.lapses,
        mastery_score: next.masteryScore,
        next_review_at: next.nextReviewAt.toISOString(),
        last_reviewed_at: now.toISOString(),
      })
      .eq("id", card.id),
    supabase
      .from("flashcard_reviews")
      .insert({ user_id: user.id, flashcard_id: card.id, rating, interval_days: next.intervalDays }),
  ]);
  if (updateError || reviewError) throw updateError ?? reviewError;

  if (card.topic_id) {
    await applyTopicAnswers(supabase, [
      {
        topicId: card.topic_id,
        isCorrect: rating === "good" || rating === "easy",
        difficulty: card.difficulty === "hard" ? "hard" : card.difficulty === "easy" ? "easy" : "medium",
      },
    ]);
  }
  await track(user.id, "flashcard_reviewed", { rating });

  return NextResponse.json({
    nextReviewAt: next.nextReviewAt.toISOString(),
    intervalDays: next.intervalDays,
    masteryScore: next.masteryScore,
  });
});
