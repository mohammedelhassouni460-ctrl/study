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

const LENGTHS = [
  { value: "short", label: "Ultra courte", hint: "L'essentiel en 2 minutes" },
  { value: "standard", label: "Standard", hint: "Une fiche d'une page" },
  { value: "detailed", label: "Détaillée", hint: "Tout le cours, formules et exemples" },
] as const;

export function SummaryGenerator({ subjectId, documents }: { subjectId: string; documents: { id: string; name: string }[] }) {
  const router = useRouter();
  const [length, setLength] = useState<(typeof LENGTHS)[number]["value"]>("standard");
  const [scope, setScope] = useState(ALL_DOCUMENTS);
  const [pending, setPending] = useState(false);

  const generate = async () => {
    setPending(true);
    try {
      await postJson("/api/ai/summary", {
        subjectId,
        length,
        documentId: scope === ALL_DOCUMENTS ? null : scope,
      });
      toast.success("Fiche générée !");
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
        <CardTitle>Générer une fiche</CardTitle>
        <CardDescription>{AI_COSTS.summary} crédits IA par fiche</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <RadioGroup
          value={length}
          onValueChange={(v) => setLength(v as typeof length)}
          className="grid gap-2"
          aria-label="Longueur de la fiche"
        >
          {LENGTHS.map((option) => (
            <Label
              key={option.value}
              htmlFor={`length-${option.value}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/50"
            >
              <RadioGroupItem id={`length-${option.value}`} value={option.value} className="mt-0.5" />
              <span>
                <span className="block font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.hint}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
        <div className="grid gap-2">
          <Label htmlFor="summary-scope">Source</Label>
          <DocumentScopeSelect id="summary-scope" documents={documents} value={scope} onChange={setScope} />
        </div>
        {pending ? (
          <GenerationProgress steps={["Lecture de ton cours…", "Identification des concepts clés…", "Rédaction de la fiche…", "Presque fini…"]} />
        ) : (
          <Button onClick={generate} disabled={documents.length === 0}>
            <SparklesIcon /> Générer la fiche
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
