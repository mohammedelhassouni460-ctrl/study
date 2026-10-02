"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/server";
import { getBillingState } from "@/lib/billing/access";
import { isWithinLimit } from "@/lib/billing/plans";
import { getCurrentUser } from "@/lib/auth/session";
import { fieldErrorsFrom, type ActionResult } from "@/lib/http/action-result";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/common";
import { subjectSchema, type SubjectFormValues } from "@/lib/validations/subject";

const UNAUTHENTICATED = { ok: false as const, error: "Ta session a expiré. Reconnecte-toi." };

function toRow(input: ReturnType<typeof subjectSchema.parse>) {
  return {
    name: input.name,
    description: input.description ?? null,
    color: input.color,
    exam_date: input.examDate ?? null,
    target_grade: input.targetGrade ?? null,
  };
}

export async function createSubjectAction(values: SubjectFormValues): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return UNAUTHENTICATED;

  const parsed = subjectSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Vérifie les champs.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const supabase = await createClient();
  const [{ limits }, { count }] = await Promise.all([
    getBillingState(user.id),
    supabase.from("subjects").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  if (!isWithinLimit(count ?? 0, limits.maxSubjects)) {
    return {
      ok: false,
      error: `Le plan Gratuit est limité à ${limits.maxSubjects} matières. Passe à Pro pour en ajouter d'autres.`,
    };
  }

  const { data, error } = await supabase
    .from("subjects")
    .insert({ ...toRow(parsed.data), user_id: user.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Impossible de créer la matière. Réessaie." };

  await track(user.id, "subject_created", { has_exam_date: Boolean(parsed.data.examDate) });
  revalidatePath("/subjects");
  revalidatePath("/dashboard");
  return { ok: true, data: { id: data.id }, message: "Matière créée." };
}

export async function updateSubjectAction(
  id: string,
  values: SubjectFormValues,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return UNAUTHENTICATED;
  const subjectId = uuidSchema.safeParse(id);
  const parsed = subjectSchema.safeParse(values);
  if (!subjectId.success) return { ok: false, error: "Matière introuvable." };
  if (!parsed.success) {
    return { ok: false, error: "Vérifie les champs.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .update(toRow(parsed.data))
    .eq("id", subjectId.data)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Impossible de modifier la matière." };

  revalidatePath(`/subjects/${data.id}`, "layout");
  revalidatePath("/subjects");
  revalidatePath("/dashboard");
  return { ok: true, data: { id: data.id }, message: "Matière mise à jour." };
}

export async function deleteSubjectAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return UNAUTHENTICATED;
  const subjectId = uuidSchema.safeParse(id);
  if (!subjectId.success) return { ok: false, error: "Matière introuvable." };

  const supabase = await createClient();
  // Remove stored files first (rows cascade, storage objects don't).
  const { data: documents } = await supabase
    .from("documents")
    .select("file_path")
    .eq("subject_id", subjectId.data);
  const paths = (documents ?? []).map((d) => d.file_path);
  if (paths.length > 0) await supabase.storage.from("documents").remove(paths);

  const { error } = await supabase.from("subjects").delete().eq("id", subjectId.data);
  if (error) return { ok: false, error: "Impossible de supprimer la matière." };

  revalidatePath("/subjects");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined, message: "Matière supprimée." };
}
