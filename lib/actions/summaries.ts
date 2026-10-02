"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/http/action-result";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/common";

export async function deleteSummaryAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Fiche introuvable." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("summaries").delete().eq("id", id).select("subject_id").maybeSingle();
  if (error || !data) return { ok: false, error: "Impossible de supprimer la fiche." };
  revalidatePath(`/subjects/${data.subject_id}/summary`);
  return { ok: true, data: undefined };
}
