"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/http/action-result";
import { createClient } from "@/lib/supabase/server";
import { moveSessionSchema, sessionStatusSchema } from "@/lib/validations/planner";

function refresh() {
  revalidatePath("/planner");
  revalidatePath("/dashboard");
}

export async function setSessionStatusAction(input: { id: string; status: "planned" | "done" | "skipped" }): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };
  const parsed = sessionStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Session introuvable." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_sessions")
    .update({
      status: parsed.data.status,
      completed_at: parsed.data.status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Impossible de mettre à jour la session." };
  refresh();
  return { ok: true, data: undefined };
}

export async function moveSessionAction(input: { id: string; date: string }): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };
  const parsed = moveSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Date invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_sessions")
    .update({ scheduled_date: parsed.data.date, status: "planned", completed_at: null })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Impossible de déplacer la session." };
  refresh();
  return { ok: true, data: undefined };
}
