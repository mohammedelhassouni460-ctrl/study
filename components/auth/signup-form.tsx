"use client";

import { useActionState } from "react";

import { FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { signupAction } from "@/lib/auth/actions";

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, null);
  const errors = state?.fieldErrors;
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <FormField id="fullName" label="Prénom" error={errors?.fullName}>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="given-name"
          required
          placeholder="Mohammed"
          aria-invalid={Boolean(errors?.fullName)}
        />
      </FormField>
      <FormField id="email" label="Email" error={errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="toi@exemple.fr"
          aria-invalid={Boolean(errors?.email)}
        />
      </FormField>
      <FormField id="password" label="Mot de passe" error={errors?.password} hint="8 caractères minimum.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(errors?.password)}
        />
      </FormField>
      <SubmitButton className="w-full" pendingLabel="Création du compte…">
        Créer mon compte
      </SubmitButton>
    </form>
  );
}
