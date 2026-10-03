import "server-only";

import { getCurrentProfile } from "@/lib/auth/session";
import type { ServerSupabaseClient } from "@/lib/supabase/server";

import { generateStructured } from "../client";
import { getCourseContext } from "../context";
import { SYSTEM_TUTOR, summaryPrompt } from "../prompts";
import { summaryOutputSchema, type SummaryContent } from "../schemas";
import { withAiCredits } from "../credits";

const LENGTH_TOKENS = { short: 4_000, standard: 8_000, detailed: 16_000 } as const;

export async function generateSummary(
  supabase: ServerSupabaseClient,
  userId: string,
  input: { subjectId: string; subjectName: string; documentId?: string | null; length: "short" | "standard" | "detailed" },
) {
  const profile = await getCurrentProfile();
  const { text } = await getCourseContext(supabase, { subjectId: input.subjectId, documentId: input.documentId });

  const content = await withAiCredits(userId, "summary", async () => {
    const { data, usage } = await generateStructured({
      schema: summaryOutputSchema,
      system: SYSTEM_TUTOR,
      prompt: summaryPrompt({ subjectName: input.subjectName, length: input.length, level: profile?.education_level, course: text }),
      maxTokens: LENGTH_TOKENS[input.length] + 8_000,
      effort: "medium",
    });
    return { result: normalizeSummary(data), usage };
  });

  const { data: row, error } = await supabase
    .from("summaries")
    .insert({
      user_id: userId,
      subject_id: input.subjectId,
      document_id: input.documentId ?? null,
      length: input.length,
      title: content.title.slice(0, 200),
      content,
    })
    .select("id, title, length, content, created_at, document_id")
    .single();
  if (error) throw error;
  return row;
}

/** Trims oversized arrays so a runaway answer can't bloat the page. */
export function normalizeSummary(data: SummaryContent): SummaryContent {
  return {
    ...data,
    keyConcepts: data.keyConcepts.slice(0, 20),
    definitions: data.definitions.slice(0, 30),
    formulas: data.formulas.slice(0, 20),
    importantPoints: data.importantPoints.slice(0, 20),
    examples: data.examples.slice(0, 10),
  };
}
