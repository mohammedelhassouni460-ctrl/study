"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/http/action-result";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/common";

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Document introuvable." };

  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("file_path, subject_id").eq("id", id).maybeSingle();
  if (!doc) return { ok: false, error: "Document introuvable." };

  await supabase.storage.from("documents").remove([doc.file_path]);
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { ok: false, error: "Impossible de supprimer le document." };

  revalidatePath(`/subjects/${doc.subject_id}`, "layout");
  return { ok: true, data: undefined, message: "Document supprimé." };
}
