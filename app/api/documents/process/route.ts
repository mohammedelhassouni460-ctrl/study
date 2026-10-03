import { NextResponse } from "next/server";

import { track } from "@/lib/analytics/server";
import { processDocument } from "@/lib/documents/pipeline";
import { apiHandler, parseJsonBody } from "@/lib/http/api";
import { processRequestSchema } from "@/lib/validations/documents";

// Large PDFs + embeddings + topic detection can take a while.
export const maxDuration = 300;

/** Step 2 of an upload: extract, chunk, embed and analyse the stored file. */
export const POST = apiHandler({ rateLimit: "documentProcessing" }, async (request, { user, supabase }) => {
  const { documentId } = await parseJsonBody(request, processRequestSchema);
  const result = await processDocument(supabase, user.id, documentId);
  await track(user.id, "document_processed", {
    chunks: result.chunkCount,
    pages: result.pageCount ?? undefined,
    embedded: result.embedded,
  });
  return NextResponse.json({ status: "ready", ...result });
});
