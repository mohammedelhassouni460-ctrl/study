import { NextResponse } from "next/server";

import { generateSummary } from "@/lib/ai/generators/summary";
import { track } from "@/lib/analytics/server";
import { apiHandler, parseJsonBody } from "@/lib/http/api";
import { AppError } from "@/lib/http/errors";
import { summaryRequestSchema } from "@/lib/validations/ai";

export const maxDuration = 300;

export const POST = apiHandler({ rateLimit: "aiGeneration" }, async (request, { user, supabase }) => {
  const body = await parseJsonBody(request, summaryRequestSchema);
  const { data: subject } = await supabase.from("subjects").select("id, name").eq("id", body.subjectId).maybeSingle();
  if (!subject) throw new AppError("not_found", "Matière introuvable.", 404);

  const summary = await generateSummary(supabase, user.id, {
    subjectId: subject.id,
    subjectName: subject.name,
    documentId: body.documentId,
    length: body.length,
  });
  await track(user.id, "summary_generated", { length: body.length, scope: body.documentId ? "document" : "subject" });
  return NextResponse.json({ summary });
});
