"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProfileAction } from "@/lib/actions/settings";
import { EDUCATION_LEVELS, GOALS } from "@/lib/validations/onboarding";
import { TIMEZONES, profileSchema, type ProfileFormValues, type ProfileInput } from "@/lib/validations/settings";

export function ProfileForm({ defaultValues }: { defaultValues: ProfileFormValues }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<ProfileFormValues, unknown, ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) =>
    start(async () => {
      const result = await updateProfileAction(values);
      if (!result.ok) {
        toast.error(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) form.setError(field as keyof ProfileFormValues, { message: messages[0] });
        }
        return;
      }
      toast.success(result.message ?? "Enregistré.");
      router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormField id="fullName" label="Prénom" error={errors.fullName?.message}>
        <Input id="fullName" autoComplete="given-name" aria-invalid={Boolean(errors.fullName)} {...form.register("fullName")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="educationLevel" label="Niveau d'études" error={errors.educationLevel?.message}>
          <Controller
            control={form.control}
            name="educationLevel"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="educationLevel" className="w-full">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField id="goal" label="Objectif principal" error={errors.goal?.message}>
          <Controller
            control={form.control}
            name="goal"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="goal" className="w-full">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {GOALS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.emoji} {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField id="nextExamDate" label="Prochain examen" error={errors.nextExamDate?.message}>
          <Input id="nextExamDate" type="date" {...form.register("nextExamDate")} />
        </FormField>
        <FormField id="dailyStudyMinutes" label="Temps de révision par jour (min)" error={errors.dailyStudyMinutes?.message}>
          <Input id="dailyStudyMinutes" type="number" inputMode="numeric" min={10} max={480} step={5} {...form.register("dailyStudyMinutes")} />
        </FormField>
        <FormField id="timezone" label="Fuseau horaire" error={errors.timezone?.message}>
          <Controller
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
