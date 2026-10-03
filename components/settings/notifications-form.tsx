"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateNotificationsAction } from "@/lib/actions/settings";
import type { NotificationPreferences } from "@/lib/validations/settings";

const OPTIONS: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
  { key: "email_reminders", label: "Rappels de révision", hint: "Un email quand des sessions de ton planning t'attendent." },
  { key: "weekly_report", label: "Bilan hebdomadaire", hint: "Ta progression et tes concepts à travailler, chaque lundi." },
  { key: "product_updates", label: "Nouveautés StudyOS", hint: "Les nouvelles fonctionnalités, quelques fois par an." },
];

export function NotificationsForm({ defaultValues }: { defaultValues: NotificationPreferences }) {
  const [values, setValues] = useState(defaultValues);
  const [pending, start] = useTransition();

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await updateNotificationsAction(values);
          if (result.ok) toast.success(result.message);
          else toast.error(result.error);
        });
      }}
    >
      {OPTIONS.map((option) => (
        <div key={option.key} className="flex items-start justify-between gap-4">
          <div className="grid gap-0.5">
            <Label htmlFor={option.key}>{option.label}</Label>
            <p className="text-sm text-muted-foreground">{option.hint}</p>
          </div>
          <Switch
            id={option.key}
            checked={values[option.key]}
            onCheckedChange={(checked) => setValues((v) => ({ ...v, [option.key]: checked }))}
          />
        </div>
      ))}
      <div>
        <Button type="submit" disabled={pending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
