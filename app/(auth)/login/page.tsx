import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { AuthDivider, GoogleButton } from "@/components/shared/google-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeRedirectPath } from "@/lib/validations/common";

export const metadata: Metadata = { title: "Connexion" };

const ERRORS: Record<string, string> = {
  auth: "La connexion a échoué. Réessaie.",
  oauth: "La connexion avec Google n'est pas disponible pour le moment.",
  confirm: "Ce lien de confirmation est invalide ou a expiré.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next);
  const errorKey = typeof params.error === "string" ? params.error : undefined;
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Content de te revoir 👋</CardTitle>
        <CardDescription>Connecte-toi pour reprendre tes révisions.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {errorKey && ERRORS[errorKey] && (
          <Alert variant="destructive">
            <AlertDescription>{ERRORS[errorKey]}</AlertDescription>
          </Alert>
        )}
        <GoogleButton next={next} />
        <AuthDivider />
        <LoginForm next={next} />
        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Inscription gratuite
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
