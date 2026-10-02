"use server";

import { redirect } from "next/navigation";

import { track } from "@/lib/analytics/server";
import { fieldErrorsFrom, type FormState } from "@/lib/http/action-result";
import { publicEnv } from "@/lib/public-env";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validations/auth";
import { safeRedirectPath } from "@/lib/validations/common";

const GENERIC_AUTH_ERROR = "Une erreur est survenue. Réessaie dans un instant.";

function mapAuthError(message: string | undefined): string {
  if (!message) return GENERIC_AUTH_ERROR;
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Confirme ton adresse email avant de te connecter.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Un compte existe déjà avec cet email.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Trop de tentatives. Patiente quelques minutes.";
  if (m.includes("password")) return "Ce mot de passe n'est pas accepté (8 caractères minimum).";
  return GENERIC_AUTH_ERROR;
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Vérifie les champs.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: mapAuthError(error.message) };

  redirect(safeRedirectPath(formData.get("next")));
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Vérifie les champs.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${publicEnv.appUrl}/auth/confirm?next=/onboarding`,
    },
  });
  if (error) return { ok: false, error: mapAuthError(error.message) };

  if (data.user) await track(data.user.id, "user_signed_up", { method: "email" });

  // Email confirmation disabled (e.g. local dev): the user is already signed in.
  if (data.session) redirect("/onboarding");

  return {
    ok: true,
    message: "Compte créé ! Clique sur le lien reçu par email pour l'activer.",
  };
}

export async function googleSignInAction(formData: FormData) {
  const next = safeRedirectPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${publicEnv.appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Vérifie les champs.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.appUrl}/auth/callback?next=/reset-password`,
  });
  // Same answer whether or not the account exists (no account enumeration).
  return {
    ok: true,
    message: "Si un compte existe pour cet email, tu vas recevoir un lien de réinitialisation.",
  };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Vérifie les champs.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
