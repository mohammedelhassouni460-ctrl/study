"use client";

import { ArrowLeftIcon, ArrowRightIcon, Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { completeOnboardingAction } from "@/lib/actions/onboarding";
import { cn } from "@/lib/utils";
import { EDUCATION_LEVELS, GOALS, type OnboardingInput } from "@/lib/validations/onboarding";

type Draft = Partial<OnboardingInput>;

const STEPS = [
  { title: "Comment t'appelles-tu ?", description: "On personnalise ton espace de révision." },
  { title: "Quel est ton niveau ?", description: "Pour adapter le vocabulaire et la difficulté." },
  { title: "Que veux-tu améliorer ?", description: "Choisis ton objectif principal." },
  { title: "Quand est ton prochain examen ?", description: "StudyOS planifiera tes révisions jusqu'à cette date." },
  { title: "Ajoute ta première matière", description: "Tu pourras en ajouter d'autres ensuite." },
] as const;

function ChoiceCard({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left text-sm font-medium transition-all hover:border-primary/50 hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        selected && "border-primary bg-accent text-accent-foreground ring-1 ring-primary",
      )}
    >
      {children}
    </button>
  );
}

export function OnboardingWizard({ defaults }: { defaults: Draft }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(defaults);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (patch: Draft) => {
    setError(null);
    setDraft((d) => ({ ...d, ...patch }));
  };

  const canContinue = [
    Boolean(draft.fullName?.trim()),
    Boolean(draft.educationLevel),
    Boolean(draft.goal),
    true,
    Boolean(draft.subjectName?.trim()),
  ][step];

  const next = () => {
    if (!canContinue) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    startTransition(async () => {
      const result = await completeOnboardingAction(draft as OnboardingInput);
      // On success the action redirects; we only get here on error.
      if (result && !result.ok) setError(result.error);
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Étape {step + 1} sur {STEPS.length + 1}
          </span>
          <span>Ensuite : importer ton premier cours</span>
        </div>
        <Progress value={((step + 1) / (STEPS.length + 1)) * 100} aria-label="Progression de l'onboarding" />
        <CardTitle className="mt-6 text-xl">{STEPS[step].title}</CardTitle>
        <CardDescription>{STEPS[step].description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          {step === 0 && (
            <div className="grid gap-2">
              <Label htmlFor="fullName">Prénom</Label>
              <Input
                id="fullName"
                autoFocus
                autoComplete="given-name"
                value={draft.fullName ?? ""}
                onChange={(e) => update({ fullName: e.target.value })}
                placeholder="Mohammed"
                maxLength={80}
              />
            </div>
          )}

          {step === 1 && (
            <div role="radiogroup" aria-label="Niveau d'études" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {EDUCATION_LEVELS.map((level) => (
                <ChoiceCard
                  key={level.value}
                  selected={draft.educationLevel === level.value}
                  onSelect={() => update({ educationLevel: level.value })}
                >
                  {level.label}
                </ChoiceCard>
              ))}
            </div>
          )}

          {step === 2 && (
            <div role="radiogroup" aria-label="Objectif principal" className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
              {GOALS.map((goal) => (
                <ChoiceCard
                  key={goal.value}
                  selected={draft.goal === goal.value}
                  onSelect={() => update({ goal: goal.value })}
                >
                  <span aria-hidden className="text-lg">
                    {goal.emoji}
                  </span>
                  {goal.label}
                </ChoiceCard>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-2">
              <Label htmlFor="nextExamDate">Date de l&apos;examen</Label>
              <Input
                id="nextExamDate"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={draft.nextExamDate ?? ""}
                onChange={(e) => update({ nextExamDate: e.target.value || undefined })}
              />
              <p className="text-xs text-muted-foreground">Pas encore de date ? Tu peux passer cette étape.</p>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-2">
              <Label htmlFor="subjectName">Nom de la matière</Label>
              <Input
                id="subjectName"
                autoFocus
                value={draft.subjectName ?? ""}
                onChange={(e) => update({ subjectName: e.target.value })}
                placeholder="Mathématiques"
                maxLength={80}
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || pending}
            >
              <ArrowLeftIcon /> Retour
            </Button>
            <div className="flex gap-2">
              {step === 3 && !draft.nextExamDate && (
                <Button type="button" variant="outline" onClick={() => setStep(4)}>
                  Passer
                </Button>
              )}
              <Button type="submit" disabled={!canContinue || pending}>
                {pending ? <Loader2Icon className="animate-spin" /> : null}
                {step === STEPS.length - 1 ? "Créer ma matière" : "Continuer"}
                {!pending && <ArrowRightIcon />}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
