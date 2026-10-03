import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPasswordPage() {
  // The recovery link signs the user in through /auth/callback first.
  await requireUser();
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Nouveau mot de passe</CardTitle>
        <CardDescription>Choisis un mot de passe d&apos;au moins 8 caractères.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
