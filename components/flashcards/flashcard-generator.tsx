"use client";

import { SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ALL_DOCUMENTS, DocumentScopeSelect } from "@/components/shared/document-scope-select";
import { GenerationProgress } from "@/components/shared/generation-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AI_COSTS } from "@/lib/billing/plans";
import { errorMessage, postJson } from "@/lib/http/client";
import { FLASHCARD_COUNTS } from "@/lib/validations/ai";

export function FlashcardGenerator({ subjectId, documents }: { subjectId: string; documents: { id: string; name: string }[] }) {
  const router = useRouter();
  const [count, setCount] = useState<(typeof FLASHCARD_COUNTS)[number]>(20);
  const [scope, setScope] = useState(ALL_DOCUMENTS);
  const [pending, setPending] = useState(false);

  const generate = async () => {
    setPending(true);
    try {
      const result = await postJson<{ created: number; capped: boolean }>("/api/ai/flashcards", {
        subjectId,
        count,
        documentId: scope === ALL_DOCUMENTS ? null : scope,
      });
      toast.success(`${result.created} flashcards créées !`, {
        description: result.capped ? "Limite du plan Gratuit atteinte : passe à Pro pour en créer plus." : undefined,
      });
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Générer des flashcards</CardTitle>
        <CardDescription>{AI_COSTS.flashcards} crédits IA par génération</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Label id="count-label">Nombre de cartes</Label>
          <RadioGroup
            value={String(count)}
            onValueChange={(v) => setCount(Number(v) as typeof count)}
            className="grid grid-cols-4 gap-2"
            aria-labelledby="count-label"
          >
            {FLASHCARD_COUNTS.map((n) => (
              <Label
                key={n}
                htmlFor={`count-${n}`}
                className="flex cursor-pointer items-center justify-center rounded-lg border p-2 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/50"
              >
                <RadioGroupItem id={`count-${n}`} value={String(n)} className="sr-only" />
                {n}
              </Label>
            ))}
          </RadioGroup>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="flashcards-scope">Source</Label>
          <DocumentScopeSelect id="flashcards-scope" documents={documents} value={scope} onChange={setScope} />
        </div>
        {pending ? (
          <GenerationProgress steps={["Lecture de ton cours…", "Sélection des notions à retenir…", "Rédaction des cartes…", "Presque fini…"]} />
        ) : (
          <Button onClick={generate} disabled={documents.length === 0}>
            <SparklesIcon /> Générer {count} flashcards
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
