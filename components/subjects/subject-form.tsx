"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSubjectAction, updateSubjectAction } from "@/lib/actions/subjects";
import { SUBJECT_COLOR_CLASSES, SUBJECT_COLOR_LABELS } from "@/lib/subjects/colors";
import { cn } from "@/lib/utils";
import { SUBJECT_COLORS, subjectSchema, type SubjectFormValues, type SubjectInput } from "@/lib/validations/subject";

export function SubjectForm({
  subjectId,
  defaultValues,
  onDone,
}: {
  subjectId?: string;
  defaultValues?: Partial<SubjectFormValues>;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<SubjectFormValues, unknown, SubjectInput>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: "", description: "", color: "indigo", examDate: "", targetGrade: "", ...defaultValues },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const payload: SubjectFormValues = { ...values };
      const result = subjectId ? await updateSubjectAction(subjectId, payload) : await createSubjectAction(payload);
      if (!result.ok) {
        toast.error(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) form.setError(field as keyof SubjectFormValues, { message: messages[0] });
        }
        return;
      }
      toast.success(result.message ?? "Enregistré.");
      onDone?.();
      if (!subjectId) router.push(`/subjects/${result.data.id}/documents`);
      else router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormField id="name" label="Nom de la matière" error={errors.name?.message}>
        <Input id="name" placeholder="Microéconomie" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
      </FormField>
      <FormField id="description" label="Description (optionnel)" error={errors.description?.message}>
        <Textarea id="description" rows={2} placeholder="L2 Économie — Pr. Martin" {...form.register("description")} />
      </FormField>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <FormField id="examDate" label="Date d'examen" error={errors.examDate?.message}>
          <Input id="examDate" type="date" {...form.register("examDate")} />
        </FormField>
        <FormField id="targetGrade" label="Note cible (/20)" error={errors.targetGrade?.message}>
          <Input id="targetGrade" type="number" inputMode="decimal" min={0} max={20} step={0.5} placeholder="15" {...form.register("targetGrade")} />
        </FormField>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Couleur</legend>
        <Controller
          control={form.control}
          name="color"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Couleur" className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={field.value === color}
                  aria-label={SUBJECT_COLOR_LABELS[color]}
                  onClick={() => field.onChange(color)}
                  className={cn(
                    "size-7 rounded-full ring-offset-2 ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    SUBJECT_COLOR_CLASSES[color].dot,
                    field.value === color && "ring-2 ring-foreground",
                  )}
                />
              ))}
            </div>
          )}
        />
      </fieldset>
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Enregistrement…" : subjectId ? "Enregistrer" : "Créer la matière"}
      </Button>
    </form>
  );
}
