import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/** Authenticated user for this request, or null. Deduplicated per request. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** For pages: redirects to /login when there is no session. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
});

/** For private pages that need a completed onboarding. */
export async function requireOnboardedUser() {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  if (!profile?.onboarded_at) redirect("/onboarding");
  return { user, profile };
}
