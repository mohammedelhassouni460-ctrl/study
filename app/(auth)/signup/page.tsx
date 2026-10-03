import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "@/components/auth/signup-form";
import { AuthDivider, GoogleButton } from "@/components/shared/google-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Créer un compte" };

export default function SignupPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Crée ton compte</CardTitle>
        <CardDescription>Gratuit, sans carte bancaire. Ton premier cours en 2 minutes.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <GoogleButton next="/onboarding" label="S'inscrire avec Google" />
        <AuthDivider />
        <SignupForm />
        <p className="text-center text-xs text-muted-foreground">
          En créant un compte, tu acceptes nos{" "}
          <Link href="/terms" className="underline">
            conditions
          </Link>{" "}
          et notre{" "}
          <Link href="/privacy" className="underline">
            politique de confidentialité
          </Link>
          .
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
