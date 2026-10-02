"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/http/action-result";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/common";

export async function deleteFlashcardAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Flashcard introuvable." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("flashcards").delete().eq("id", id).select("subject_id").maybeSingle();
  if (error || !data) return { ok: false, error: "Impossible de supprimer la flashcard." };
  revalidatePath(`/subjects/${data.subject_id}/flashcards`);
  return { ok: true, data: undefined };
}
