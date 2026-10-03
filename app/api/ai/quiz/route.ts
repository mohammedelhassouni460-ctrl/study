import { NextResponse } from "next/server";

import { generateQuiz } from "@/lib/ai/generators/quiz";
import { track } from "@/lib/analytics/server";
import { apiHandler, parseJsonBody } from "@/lib/http/api";
import { AppError } from "@/lib/http/errors";
import { quizRequestSchema } from "@/lib/validations/ai";

export const maxDuration = 300;

export const POST = apiHandler({ rateLimit: "aiGeneration" }, async (request, { user, supabase }) => {
  const body = await parseJsonBody(request, quizRequestSchema);
  const { data: subject } = await supabase.from("subjects").select("id, name").eq("id", body.subjectId).maybeSingle();
  if (!subject) throw new AppError("not_found", "Matière introuvable.", 404);

  const result = await generateQuiz(supabase, user.id, {
    subjectId: subject.id,
    subjectName: subject.name,
    documentId: body.documentId,
    topicId: body.topicId,
    count: body.count,
    difficulty: body.difficulty,
  });
  await track(user.id, "quiz_started", { count: result.questionCount, difficulty: body.difficulty });
  return NextResponse.json(result);
});
