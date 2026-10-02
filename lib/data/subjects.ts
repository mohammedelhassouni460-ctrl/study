import "server-only";

import { cache } from "react";

import { averageMastery } from "@/lib/learning/mastery";
import { createClient } from "@/lib/supabase/server";

export interface SubjectOverview {
  id: string;
  name: string;
  description: string | null;
  color: string;
  exam_date: string | null;
  target_grade: number | null;
  mastery: number;
  topicsCount: number;
  documentsCount: number;
  dueFlashcards: number;
  topics: { id: string; name: string; mastery_score: number; attempts_count: number }[];
}

/** All subjects of the current user with mastery, topic, document and due-card counts. */
export const listSubjectOverviews = cache(async (): Promise<SubjectOverview[]> => {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const [{ data: subjects }, { data: due }] = await Promise.all([
    supabase
      .from("subjects")
      .select(
        "id, name, description, color, exam_date, target_grade, topics(id, name, mastery_score, attempts_count), documents(count)",
      )
      .order("created_at", { ascending: true }),
    supabase.from("flashcards").select("subject_id").lte("next_review_at", nowIso).limit(5000),
  ]);

  const dueBySubject = new Map<string, number>();
  for (const row of due ?? []) dueBySubject.set(row.subject_id, (dueBySubject.get(row.subject_id) ?? 0) + 1);

  return (subjects ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    color: s.color,
    exam_date: s.exam_date,
    target_grade: s.target_grade,
    topics: s.topics,
    mastery: averageMastery(s.topics.map((t) => t.mastery_score)),
    topicsCount: s.topics.length,
    documentsCount: s.documents[0]?.count ?? 0,
    dueFlashcards: dueBySubject.get(s.id) ?? 0,
  }));
});

export const getSubject = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("subjects").select("*").eq("id", id).maybeSingle();
  return data;
});
