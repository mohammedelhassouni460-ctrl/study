import "server-only";

import { recordUsageEvent } from "@/lib/ai/credits";
import { embedTexts, toPgVector } from "@/lib/embeddings";
import { AppError } from "@/lib/http/errors";
import type { ServerSupabaseClient } from "@/lib/supabase/server";

import { chunkText } from "./chunking";
import { extractDocumentText, pageForOffset } from "./extract";
import { MAX_FILE_SIZE_BYTES, matchesMagicBytes, type DocumentFileType } from "./file-validation";
import { extractTopics, saveTopics } from "./topics";

const INSERT_BATCH = 100;

export interface ProcessResult {
  chunkCount: number;
  pageCount: number | null;
  topicsCreated: number;
  embedded: boolean;
}

/**
 * Document pipeline: download → verify content → extract text → chunk →
 * embeddings → store chunks → detect topics. Runs with the user's client, so
 * every read and write is subject to RLS.
 */
export async function processDocument(
  supabase: ServerSupabaseClient,
  userId: string,
  documentId: string,
): Promise<ProcessResult> {
  const { data: doc } = await supabase
    .from("documents")
    .select("id, subject_id, file_path, file_type, status, subjects(name)")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) throw new AppError("not_found", "Document introuvable.", 404);
  if (doc.status === "ready") throw new AppError("conflict", "Ce document est déjà analysé.", 409);

  // Atomic transition: only one request can move the document to "processing".
  // A document stuck in "processing" for 10+ minutes (killed function) can be retried.
  const staleBefore = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: claimed } = await supabase
    .from("documents")
    .update({ status: "processing", error_message: null })
    .eq("id", doc.id)
    .or(`status.in.(uploading,failed),and(status.eq.processing,updated_at.lt.${staleBefore})`)
    .select("id")
    .maybeSingle();
  if (!claimed) throw new AppError("conflict", "Ce document est déjà en cours d'analyse.", 409);

  try {
    const { data: blob, error: downloadError } = await supabase.storage.from("documents").download(doc.file_path);
    if (downloadError || !blob) {
      throw new AppError("processing_failed", "Le fichier n'a pas été reçu. Réimporte-le.", 400);
    }
    if (blob.size > MAX_FILE_SIZE_BYTES) throw new AppError("processing_failed", "Fichier trop volumineux.", 400);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const fileType = doc.file_type as DocumentFileType;
    if (!matchesMagicBytes(bytes, fileType)) {
      throw new AppError("processing_failed", "Le contenu du fichier ne correspond pas à son format.", 400);
    }

    let extracted;
    try {
      extracted = await extractDocumentText(bytes, fileType);
    } catch (error) {
      console.error("[documents] extraction failed", error);
      throw new AppError("processing_failed", "Impossible de lire ce fichier (protégé ou corrompu ?).", 400);
    }
    if (extracted.text.replace(/\s/g, "").length < 50) {
      throw new AppError(
        "processing_failed",
        "Aucun texte détecté. S'il s'agit d'un document scanné, la reconnaissance de texte (OCR) arrive bientôt.",
        400,
      );
    }

    const chunks = chunkText(extracted.text);
    let vectors: number[][] | null = null;
    try {
      vectors = await embedTexts(chunks.map((c) => c.content), "document");
    } catch (error) {
      // Embeddings are an enhancement: full-text search still works without them.
      console.error("[documents] embeddings failed, continuing with full-text only", error);
    }

    // Re-processing (retry) starts from a clean slate.
    await supabase.from("document_chunks").delete().eq("document_id", doc.id);
    const rows = chunks.map((chunk, i) => ({
      user_id: userId,
      document_id: doc.id,
      subject_id: doc.subject_id,
      content: chunk.content,
      chunk_index: chunk.index,
      token_count: chunk.tokenCount,
      embedding: vectors?.[i] ? toPgVector(vectors[i]) : null,
      metadata: {
        ...chunk.metadata,
        ...(extracted.pageOffsets.length ? { page: pageForOffset(extracted.pageOffsets, chunk.metadata.charStart) } : {}),
      },
    }));
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const { error } = await supabase.from("document_chunks").insert(rows.slice(i, i + INSERT_BATCH));
      if (error) throw error;
    }

    let topicsCreated = 0;
    try {
      const { topics, usage } = await extractTopics(doc.subjects?.name ?? "", chunks, extracted.text);
      topicsCreated = await saveTopics(supabase, userId, doc.subject_id, topics);
      if (usage) await recordUsageEvent(userId, "document_processing", usage);
    } catch (error) {
      // Topic detection failing must not fail the whole document.
      console.error("[documents] topic extraction failed", error);
    }

    await supabase
      .from("documents")
      .update({
        status: "ready",
        extracted_text: extracted.text,
        page_count: extracted.pageCount,
        chunk_count: chunks.length,
        error_message: null,
      })
      .eq("id", doc.id);

    return { chunkCount: chunks.length, pageCount: extracted.pageCount, topicsCreated, embedded: Boolean(vectors) };
  } catch (error) {
    const message =
      error instanceof AppError ? error.message : "L'analyse du document a échoué. Réessaie dans un instant.";
    if (!(error instanceof AppError)) console.error("[documents] processing failed", error);
    await supabase.from("documents").update({ status: "failed", error_message: message }).eq("id", doc.id);
    throw error instanceof AppError ? error : new AppError("processing_failed", message, 500);
  }
}
