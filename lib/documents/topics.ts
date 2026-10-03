import "server-only";

import { generateStructured, isAiConfigured, type AiUsage } from "@/lib/ai/client";
import { SYSTEM_TUTOR, topicsPrompt } from "@/lib/ai/prompts";
import { topicsOutputSchema } from "@/lib/ai/schemas";
import { sampleEvenly } from "@/lib/ai/context";
import type { ServerSupabaseClient } from "@/lib/supabase/server";

import { extractHeadings, type TextChunk } from "./chunking";

const DIFFICULTY_SCORE = { easy: 30, medium: 50, hard: 75 } as const;

export interface TopicCandidate {
  name: string;
  description: string | null;
  difficulty_score: number;
}

/** Without AI: use detected headings ("Chapitre 2 — Élasticité") as topics. */
export function topicsFromHeadings(text: string): TopicCandidate[] {
  return extractHeadings(text).map((name) => ({
    // "1. Élasticité-prix" -> "Élasticité-prix"
    name: name.replace(/^[\divxlc]+[.)]\s+/i, "").slice(0, 120),
    description: null,
    difficulty_score: 50,
  }));
}

export async function extractTopics(
  subjectName: string,
  chunks: TextChunk[],
  fullText: string,
): Promise<{ topics: TopicCandidate[]; usage?: AiUsage }> {
  if (!isAiConfigured()) return { topics: topicsFromHeadings(fullText) };
  const sample = sampleEvenly(chunks, 40).map((c) => c.content).join("\n\n").slice(0, 60_000);
  const { data, usage } = await generateStructured({
    schema: topicsOutputSchema,
    system: SYSTEM_TUTOR,
    prompt: topicsPrompt(subjectName, sample),
    maxTokens: 4_000,
    effort: "low",
  });
  const topics = data.topics.slice(0, 12).map((t) => ({
    name: t.name.slice(0, 120),
    description: t.description || null,
    difficulty_score: DIFFICULTY_SCORE[t.difficulty],
  }));
  return { topics, usage };
}

/** Inserts topics that don't exist yet in the subject (case-insensitive). */
export async function saveTopics(
  supabase: ServerSupabaseClient,
  userId: string,
  subjectId: string,
  candidates: TopicCandidate[],
): Promise<number> {
  if (candidates.length === 0) return 0;
  const { data: existing } = await supabase.from("topics").select("name").eq("subject_id", subjectId);
  const known = new Set((existing ?? []).map((t) => t.name.toLowerCase()));
  const fresh = candidates.filter((c) => {
    const key = c.name.toLowerCase();
    if (known.has(key)) return false;
    known.add(key);
    return true;
  });
  if (fresh.length === 0) return 0;
  const { error } = await supabase
    .from("topics")
    .insert(fresh.map((t) => ({ ...t, user_id: userId, subject_id: subjectId })));
  if (error) throw error;
  return fresh.length;
}

/**
 * Maps AI-provided topic names to topic ids of the subject, creating missing
 * topics. Returns a lowercase-name → id map.
 */
export async function resolveTopicIds(
  supabase: ServerSupabaseClient,
  userId: string,
  subjectId: string,
  names: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const { data: existing } = await supabase.from("topics").select("id, name").eq("subject_id", subjectId);
  const map = new Map((existing ?? []).map((t) => [t.name.toLowerCase(), t.id]));
  const missing = unique.filter((n) => !map.has(n.toLowerCase())).slice(0, 20);
  if (missing.length > 0) {
    const { data: created } = await supabase
      .from("topics")
      .insert(missing.map((name) => ({ name: name.slice(0, 120), user_id: userId, subject_id: subjectId })))
      .select("id, name");
    for (const t of created ?? []) map.set(t.name.toLowerCase(), t.id);
  }
  return map;
}
