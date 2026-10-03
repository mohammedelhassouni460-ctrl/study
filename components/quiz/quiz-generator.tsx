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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AI_COSTS } from "@/lib/billing/plans";
import { errorMessage, postJson } from "@/lib/http/client";
import { QUIZ_COUNTS, type QUIZ_DIFFICULTY_VALUES } from "@/lib/validations/ai";

type Difficulty = (typeof QUIZ_DIFFICULTY_VALUES)[number];

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: "easy", label: "Facile", hint: "Définitions et notions de base" },
  { value: "medium", label: "Moyen", hint: "Compréhension et application" },
  { value: "hard", label: "Difficile", hint: "Analyse, pièges, calculs" },
  { value: "exam", label: "Mode examen", hint: "Conditions de partiel" },
];

const ALL_TOPICS = "all";

export function QuizGenerator({
  subjectId,
  documents,
  topics,
  defaultTopicId,
}: {
  subjectId: string;
  documents: { id: string; name: string }[];
  topics: { id: string; name: string }[];
  defaultTopicId?: string;
}) {
  const router = useRouter();
  const [count, setCount] = useState<(typeof QUIZ_COUNTS)[number]>(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [scope, setScope] = useState(ALL_DOCUMENTS);
  const [topic, setTopic] = useState(defaultTopicId && topics.some((t) => t.id === defaultTopicId) ? defaultTopicId : ALL_TOPICS);
  const [pending, setPending] = useState(false);

  const generate = async () => {
    setPending(true);
    try {
      const { quizId } = await postJson<{ quizId: string }>("/api/ai/quiz", {
        subjectId,
        count,
        difficulty,
        documentId: scope === ALL_DOCUMENTS ? null : scope,
        topicId: topic === ALL_TOPICS ? null : topic,
      });
      toast.success("Quiz prêt, bonne chance !");
      router.push(`/subjects/${subjectId}/quiz/${quizId}`);
    } catch (error) {
      toast.error(errorMessage(error));
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau quiz</CardTitle>
        <CardDescription>
          {difficulty === "exam" ? AI_COSTS.exam : AI_COSTS.quiz} crédits IA par quiz
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Label id="quiz-count-label">Nombre de questions</Label>
          <RadioGroup
            value={String(count)}
            onValueChange={(v) => setCount(Number(v) as typeof count)}
            className="grid grid-cols-4 gap-2"
            aria-labelledby="quiz-count-label"
          >
            {QUIZ_COUNTS.map((n) => (
              <Label
                key={n}
                htmlFor={`quiz-count-${n}`}
                className="flex cursor-pointer items-center justify-center rounded-lg border p-2 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/50"
              >
                <RadioGroupItem id={`quiz-count-${n}`} value={String(n)} className="sr-only" />
                {n}
              </Label>
            ))}
          </RadioGroup>
        </div>
        <div className="grid gap-2">
          <Label id="quiz-difficulty-label">Difficulté</Label>
          <RadioGroup
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as Difficulty)}
            className="grid grid-cols-2 gap-2"
            aria-labelledby="quiz-difficulty-label"
          >
            {DIFFICULTIES.map((d) => (
              <Label
                key={d.value}
                htmlFor={`quiz-difficulty-${d.value}`}
                className="grid cursor-pointer gap-0.5 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/50"
              >
                <RadioGroupItem id={`quiz-difficulty-${d.value}`} value={d.value} className="sr-only" />
                <span className="font-medium">{d.label}</span>
                <span className="text-xs text-muted-foreground">{d.hint}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>
        {topics.length > 0 && (
          <div className="grid gap-2">
            <Label htmlFor="quiz-topic">Concept</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger id="quiz-topic" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TOPICS}>Tous les concepts</SelectItem>
                {topics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="quiz-scope">Source</Label>
          <DocumentScopeSelect id="quiz-scope" documents={documents} value={scope} onChange={setScope} />
        </div>
        {pending ? (
          <GenerationProgress steps={["Lecture de ton cours…", "Choix des questions…", "Rédaction des propositions…", "Vérification des corrections…"]} />
        ) : (
          <Button onClick={generate} disabled={documents.length === 0}>
            <SparklesIcon /> Générer le quiz
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
