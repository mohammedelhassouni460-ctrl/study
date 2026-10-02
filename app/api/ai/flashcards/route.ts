import { NextResponse } from "next/server";

import { generateFlashcards } from "@/lib/ai/generators/flashcards";
import { track } from "@/lib/analytics/server";
import { apiHandler, parseJsonBody } from "@/lib/http/api";
import { AppError } from "@/lib/http/errors";
import { flashcardsRequestSchema } from "@/lib/validations/ai";

export const maxDuration = 300;

export const POST = apiHandler({ rateLimit: "aiGeneration" }, async (request, { user, supabase }) => {
  const body = await parseJsonBody(request, flashcardsRequestSchema);
  const { data: subject } = await supabase.from("subjects").select("id, name").eq("id", body.subjectId).maybeSingle();
  if (!subject) throw new AppError("not_found", "Matière introuvable.", 404);

  const result = await generateFlashcards(supabase, user.id, {
    subjectId: subject.id,
    subjectName: subject.name,
    documentId: body.documentId,
    count: body.count,
  });
  await track(user.id, "flashcards_generated", { requested: body.count, created: result.created });
  return NextResponse.json(result);
});
