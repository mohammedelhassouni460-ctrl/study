"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { loginAction } from "@/lib/auth/actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, null);
  const errors = state?.fieldErrors;
  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage state={state} />
      <FormField id="email" label="Email" error={errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="toi@exemple.fr"
          aria-invalid={Boolean(errors?.email)}
          aria-describedby={errors?.email ? "email-error" : undefined}
        />
      </FormField>
      <FormField id="password" label="Mot de passe" error={errors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(errors?.password)}
          aria-describedby={errors?.password ? "password-error" : undefined}
        />
      </FormField>
      <div className="-mt-2 text-right">
        <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
          Mot de passe oublié ?
        </Link>
      </div>
      <SubmitButton className="w-full" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>
    </form>
  );
}
