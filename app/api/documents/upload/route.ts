import { NextResponse } from "next/server";

import { track } from "@/lib/analytics/server";
import { recordUsageEvent } from "@/lib/ai/credits";
import { countUsageSince, getBillingState } from "@/lib/billing/access";
import { sanitizeFileName, validateUploadMetadata } from "@/lib/documents/file-validation";
import { apiHandler, parseJsonBody } from "@/lib/http/api";
import { AppError } from "@/lib/http/errors";
import { startOfMonthUTC } from "@/lib/learning/dates";
import { uploadRequestSchema } from "@/lib/validations/documents";

/**
 * Step 1 of an upload: validates metadata and quotas, creates the document row
 * and returns a one-time signed URL. The browser then uploads the file straight
 * to the private Storage bucket (no 4.5 MB serverless body limit).
 */
export const POST = apiHandler({ rateLimit: "documentUpload" }, async (request, { user, supabase }) => {
  const body = await parseJsonBody(request, uploadRequestSchema);

  const validation = validateUploadMetadata(body);
  if (!validation.ok) throw new AppError("invalid_input", validation.error, 400);

  const { data: subject } = await supabase.from("subjects").select("id").eq("id", body.subjectId).maybeSingle();
  if (!subject) throw new AppError("not_found", "Matière introuvable.", 404);

  const { limits } = await getBillingState(user.id);
  if (limits.documentsPerMonth !== null) {
    const uploaded = await countUsageSince(user.id, "document_upload", startOfMonthUTC());
    if (uploaded >= limits.documentsPerMonth) {
      throw new AppError(
        "quota_exceeded",
        `Tu as atteint la limite de ${limits.documentsPerMonth} documents ce mois-ci. Passe à Pro pour en importer davantage.`,
        402,
      );
    }
  }

  const documentId = crypto.randomUUID();
  const extension = validation.fileType === "txt" ? "txt" : validation.fileType;
  const filePath = `${user.id}/${subject.id}/${documentId}.${extension}`;

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    user_id: user.id,
    subject_id: subject.id,
    name: sanitizeFileName(body.name),
    file_path: filePath,
    file_type: validation.fileType,
    file_size: body.size,
    status: "uploading",
  });
  if (insertError) throw insertError;

  const { data: signed, error: signError } = await supabase.storage
    .from("documents")
    .createSignedUploadUrl(filePath);
  if (signError || !signed) {
    await supabase.from("documents").delete().eq("id", documentId);
    throw new AppError("processing_failed", "Impossible de préparer l'envoi du fichier.", 500);
  }

  await recordUsageEvent(user.id, "document_upload");
  await track(user.id, "document_uploaded", { file_type: validation.fileType, size: body.size });

  return NextResponse.json({
    documentId,
    path: signed.path,
    token: signed.token,
    contentType: validation.mime,
  });
});
