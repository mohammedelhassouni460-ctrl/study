"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/http/action-result";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/common";

export async function clearChatAction(subjectId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };
  if (!uuidSchema.safeParse(subjectId).success) return { ok: false, error: "Matière introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.from("chat_messages").delete().eq("subject_id", subjectId);
  if (error) return { ok: false, error: "Impossible d'effacer la conversation." };
  revalidatePath(`/subjects/${subjectId}/chat`);
  return { ok: true, data: undefined };
}
