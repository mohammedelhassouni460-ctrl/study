import { NextResponse, type NextRequest } from "next/server";

import { track } from "@/lib/analytics/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/validations/common";

/** OAuth (Google) and password-recovery redirect target (PKCE code exchange). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data.user;
      // A user created less than a minute ago just signed up through OAuth.
      if (user && Date.now() - new Date(user.created_at).getTime() < 60_000) {
        await track(user.id, "user_signed_up", { method: user.app_metadata.provider ?? "oauth" });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
