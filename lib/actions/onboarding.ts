"use server";

import { redirect } from "next/navigation";

import { track } from "@/lib/analytics/server";
import { getCurrentUser } from "@/lib/auth/session";
import { fieldErrorsFrom, type ActionResult } from "@/lib/http/action-result";
import { createClient } from "@/lib/supabase/server";
import { escapeLike } from "@/lib/validations/common";
import { onboardingSchema, type OnboardingInput } from "@/lib/validations/onboarding";

export async function completeOnboardingAction(values: OnboardingInput): Promise<ActionResult<{ subjectId: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };

  const parsed = onboardingSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Vérifie les champs.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const input = parsed.data;
  const supabase = await createClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName,
      education_level: input.educationLevel,
      goal: input.goal,
      next_exam_date: input.nextExamDate ?? null,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (profileError) return { ok: false, error: "Impossible d'enregistrer ton profil. Réessaie." };

  // Re-running onboarding must not create duplicates.
  const { data: existing } = await supabase
    .from("subjects")
    .select("id")
    .ilike("name", escapeLike(input.subjectName))
    .limit(1)
    .maybeSingle();

  let subjectId = existing?.id;
  if (!subjectId) {
    const { data: subject, error } = await supabase
      .from("subjects")
      .insert({ user_id: user.id, name: input.subjectName, exam_date: input.nextExamDate ?? null })
      .select("id")
      .single();
    if (error || !subject) return { ok: false, error: "Impossible de créer ta matière. Réessaie." };
    subjectId = subject.id;
    await track(user.id, "subject_created", { source: "onboarding" });
  }

  await track(user.id, "onboarding_completed", {
    education_level: input.educationLevel,
    goal: input.goal,
  });
  redirect(`/subjects/${subjectId}/documents?welcome=1`);
}
