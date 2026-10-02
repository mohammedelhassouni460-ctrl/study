import "server-only";

import { AppError } from "@/lib/http/errors";
import type { ServerSupabaseClient } from "@/lib/supabase/server";

/** ~30k tokens of course material per generation keeps quality high and cost predictable. */
export const DEFAULT_CONTEXT_CHARS = 120_000;

interface ChunkRow {
  content: string;
  chunk_index: number;
  document_id: string;
  documents: { name: string } | null;
}

/** Picks `count` items spread evenly across the list (keeps the course's overall structure). */
export function sampleEvenly<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const step = items.length / count;
  return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)]);
}

/**
 * Builds the course material passed to the model for a subject (or a single
 * document), within a character budget.
 */
export async function getCourseContext(
  supabase: ServerSupabaseClient,
  opts: { subjectId: string; documentId?: string | null; maxChars?: number },
): Promise<{ text: string; documentCount: number }> {
  const maxChars = opts.maxChars ?? DEFAULT_CONTEXT_CHARS;
  let query = supabase
    .from("document_chunks")
    .select("content, chunk_index, document_id, documents(name)")
    .eq("subject_id", opts.subjectId)
    .order("document_id")
    .order("chunk_index")
    .limit(3000);
  if (opts.documentId) query = query.eq("document_id", opts.documentId);
  const { data, error } = await query;
  if (error) throw error;
  const chunks = (data ?? []) as ChunkRow[];
  if (chunks.length === 0) {
    throw new AppError(
      "invalid_input",
      "Importe au moins un document (et attends la fin de son analyse) avant de générer du contenu.",
      400,
    );
  }

  const total = chunks.reduce((sum, c) => sum + c.content.length, 0);
  const avg = total / chunks.length;
  const selected = total > maxChars ? sampleEvenly(chunks, Math.max(1, Math.floor(maxChars / avg))) : chunks;

  const parts: string[] = [];
  let currentDoc = "";
  for (const chunk of selected) {
    if (chunk.document_id !== currentDoc) {
      currentDoc = chunk.document_id;
      parts.push(`\n### Document : ${chunk.documents?.name ?? "Sans titre"}\n`);
    }
    parts.push(chunk.content);
  }
  return { text: parts.join("\n\n").slice(0, maxChars), documentCount: new Set(chunks.map((c) => c.document_id)).size };
}
