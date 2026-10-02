import { NextResponse } from "next/server";

import { jsonError, requireApiUser } from "@/lib/http/api";
import { AppError } from "@/lib/http/errors";
import { uuidSchema } from "@/lib/validations/common";

/** Redirects to a short-lived signed URL (the bucket is private). */
export async function GET(_request: Request, ctx: RouteContext<"/api/documents/[id]/download">) {
  try {
    const { supabase } = await requireApiUser();
    const { id } = await ctx.params;
    if (!uuidSchema.safeParse(id).success) throw new AppError("not_found", "Document introuvable.", 404);
    const { data: doc } = await supabase.from("documents").select("file_path, name").eq("id", id).maybeSingle();
    if (!doc) throw new AppError("not_found", "Document introuvable.", 404);
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 60, { download: doc.name });
    if (error || !data) throw new AppError("not_found", "Fichier indisponible.", 404);
    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    return jsonError(error);
  }
}
