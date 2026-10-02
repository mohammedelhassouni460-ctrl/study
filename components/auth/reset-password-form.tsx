"use client";

import { useActionState } from "react";

import { FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { resetPasswordAction } from "@/lib/auth/actions";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordAction, null);
  const errors = state?.fieldErrors;
  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <FormField id="password" label="Nouveau mot de passe" error={errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </FormField>
      <FormField id="confirmPassword" label="Confirmation" error={errors?.confirmPassword}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <SubmitButton className="w-full" pendingLabel="Enregistrement…">
        Changer mon mot de passe
      </SubmitButton>
    </form>
  );
}
