import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireApiUser } from "@/lib/http/api";

const TABLES = [
  "subjects",
  "documents",
  "topics",
  "summaries",
  "flashcards",
  "flashcard_reviews",
  "quizzes",
  "quiz_attempts",
  "quiz_answers",
  "chat_messages",
  "study_plans",
  "study_sessions",
  "ai_usage",
] as const;

/** RGPD data export: everything the user owns, as a JSON download (RLS-scoped). */
export async function GET() {
  try {
    const { user } = await requireApiUser();
    const supabase = await createClient();
    const [profile, subscription, questions, ...tables] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status, current_period_end, cancel_at_period_end, created_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      // Answer columns are hidden from the user role: read them server-side, scoped to the user.
      createAdminClient()
        .from("quiz_questions")
        .select("id, quiz_id, topic_id, position, question, choices, correct_answer, explanation")
        .eq("user_id", user.id)
        .limit(10_000),
      ...TABLES.map((table) => supabase.from(table).select("*").limit(10_000)),
    ]);

    const data: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      account: { id: user.id, email: user.email, created_at: user.created_at },
      profile: profile.data,
      subscription: subscription.data,
      quiz_questions: questions.data ?? [],
    };
    TABLES.forEach((table, i) => {
      data[table] = tables[i].data ?? [];
    });

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="studyos-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
