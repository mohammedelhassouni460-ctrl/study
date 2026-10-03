"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { fieldErrorsFrom, type ActionResult } from "@/lib/http/action-result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  deleteAccountSchema,
  notificationPreferencesSchema,
  profileSchema,
  type NotificationPreferences,
  type ProfileFormValues,
} from "@/lib/validations/settings";

const EXPIRED = "Ta session a expiré. Reconnecte-toi.";

export async function updateProfileAction(values: ProfileFormValues): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: EXPIRED };
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Vérifie les champs.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      education_level: parsed.data.educationLevel,
      goal: parsed.data.goal,
      next_exam_date: parsed.data.nextExamDate ?? null,
      daily_study_minutes: parsed.data.dailyStudyMinutes,
      timezone: parsed.data.timezone,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Impossible d'enregistrer ton profil." };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined, message: "Profil mis à jour." };
}

/** Saves the avatar uploaded by the browser to `avatars/{user_id}/…` (storage policies enforce the folder). */
export async function updateAvatarAction(path: string | null): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: EXPIRED };
  if (path !== null && !new RegExp(`^${user.id}/[\\w.-]{1,100}$`).test(path)) {
    return { ok: false, error: "Image invalide." };
  }
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();
  const avatarUrl = path ? supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl : null;
  const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
  if (error) return { ok: false, error: "Impossible d'enregistrer la photo." };

  // Remove the previous file.
  const previous = profile?.avatar_url?.split("/avatars/")[1];
  if (previous && previous !== path && previous.startsWith(`${user.id}/`)) {
    await supabase.storage.from("avatars").remove([decodeURIComponent(previous)]);
  }
  revalidatePath("/", "layout");
  return { ok: true, data: undefined, message: path ? "Photo mise à jour." : "Photo supprimée." };
}

export async function updateNotificationsAction(values: NotificationPreferences): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: EXPIRED };
  const parsed = notificationPreferencesSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Préférences invalides." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ notification_preferences: parsed.data }).eq("id", user.id);
  if (error) return { ok: false, error: "Impossible d'enregistrer tes préférences." };
  revalidatePath("/settings/notifications");
  return { ok: true, data: undefined, message: "Préférences enregistrées." };
}

async function removeFolder(bucket: string, folder: string) {
  const admin = createAdminClient();
  // Documents live in {user}/{subject}/file, avatars in {user}/file.
  const { data: entries } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
  const files: string[] = [];
  for (const entry of entries ?? []) {
    if (entry.id) files.push(`${folder}/${entry.name}`);
    else {
      const { data: nested } = await admin.storage.from(bucket).list(`${folder}/${entry.name}`, { limit: 1000 });
      files.push(...(nested ?? []).map((n) => `${folder}/${entry.name}/${n.name}`));
    }
  }
  for (let i = 0; i < files.length; i += 100) {
    await admin.storage.from(bucket).remove(files.slice(i, i + 100));
  }
}

/**
 * Permanently deletes the account: storage files first, then the auth user
 * (every table cascades from auth.users). An active Stripe subscription must
 * be cancelled first so the user is not charged after deletion.
 */
export async function deleteAccountAction(values: { confirmation: string }): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: EXPIRED };
  const parsed = deleteAccountSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confirmation invalide." };

  const supabase = await createClient();
  const { data: subscription } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle();
  if (subscription?.status && ["active", "trialing", "past_due"].includes(subscription.status)) {
    return {
      ok: false,
      error: "Résilie d'abord ton abonnement Pro (Paramètres › Abonnement), puis supprime ton compte.",
    };
  }

  try {
    await Promise.all([removeFolder("documents", user.id), removeFolder("avatars", user.id)]);
    const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (error) {
    console.error("[account] deletion failed", error);
    return { ok: false, error: "La suppression a échoué. Réessaie ou contacte le support." };
  }
  await supabase.auth.signOut();
  redirect("/?compte=supprime");
}
