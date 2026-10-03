"use client";

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { errorMessage, postJson } from "@/lib/http/client";
import type { PublicQuizQuestion } from "@/types/domain";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuizRunner({ quizId, questions }: { quizId: string; questions: PublicQuizQuestion[] }) {
  const router = useRouter();
  const startedAt = useRef(new Date().toISOString());
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [pending, setPending] = useState(false);

  const question = questions[index];
  const answeredCount = Object.values(answers).filter((a) => a !== null && a !== undefined).length;
  const isLast = index === questions.length - 1;
  const selected = answers[question.id];

  const choose = (value: number) => setAnswers((a) => ({ ...a, [question.id]: value }));

  const submit = async () => {
    const missing = questions.length - answeredCount;
    if (missing > 0 && !window.confirm(`Il reste ${missing} question${missing > 1 ? "s" : ""} sans réponse. Valider quand même ?`)) {
      return;
    }
    setPending(true);
    try {
      const payload = Object.fromEntries(questions.map((q) => [q.id, answers[q.id] ?? null]));
      const { attemptId } = await postJson<{ attemptId: string }>("/api/quiz/submit", {
        quizId,
        startedAt: startedAt.current,
        answers: payload,
      });
      router.replace(`?attempt=${attemptId}`);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      setPending(false);
    }
  };

  // Keyboard: 1-6 / A-F choose an answer, arrows navigate.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (pending || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toUpperCase();
      const byNumber = Number(key) - 1;
      const byLetter = LETTERS.indexOf(key);
      const choice = byNumber >= 0 && byNumber < question.choices.length ? byNumber : byLetter;
      if (choice >= 0 && choice < question.choices.length) {
        setAnswers((a) => ({ ...a, [question.id]: choice }));
      } else if (event.key === "ArrowRight" && !isLast) {
        setIndex((i) => i + 1);
      } else if (event.key === "ArrowLeft" && index > 0) {
        setIndex((i) => i - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, isLast, pending, question]);

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          Question {index + 1} / {questions.length}
        </span>
        <Progress value={((index + 1) / questions.length) * 100} className="flex-1" aria-label="Progression du quiz" />
        <span>{answeredCount} répondue{answeredCount > 1 ? "s" : ""}</span>
      </div>

      <Card>
        <CardHeader>
          {question.topicName && (
            <span className="text-xs font-medium tracking-wide text-primary uppercase">{question.topicName}</span>
          )}
          <h2 id={`q-${question.id}`} className="text-lg leading-snug font-medium whitespace-pre-line">
            {question.question}
          </h2>
        </CardHeader>
        <CardContent>
          <RadioGroup
            key={question.id}
            value={selected === null || selected === undefined ? "" : String(selected)}
            onValueChange={(v) => choose(Number(v))}
            aria-labelledby={`q-${question.id}`}
            className="grid gap-2"
          >
            {question.choices.map((choice, i) => (
              <Label
                key={i}
                htmlFor={`choice-${question.id}-${i}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 leading-snug font-normal transition-colors hover:bg-accent/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/60"
              >
                <RadioGroupItem id={`choice-${question.id}-${i}`} value={String(i)} className="sr-only" />
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold"
                >
                  {LETTERS[i]}
                </span>
                <span>{choice}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => setIndex((i) => i - 1)} disabled={index === 0 || pending}>
          <ArrowLeftIcon /> Précédente
        </Button>
        {isLast ? (
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />} Valider le quiz
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => i + 1)} disabled={pending}>
            Suivante <ArrowRightIcon />
          </Button>
        )}
      </div>

      <nav aria-label="Aller à une question" className="flex flex-wrap justify-center gap-1.5">
        {questions.map((q, i) => {
          const answered = answers[q.id] !== null && answers[q.id] !== undefined;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Question ${i + 1}${answered ? " (répondue)" : ""}`}
              aria-current={i === index ? "step" : undefined}
              className={`size-8 rounded-md border text-xs font-medium transition-colors ${
                i === index ? "border-primary ring-2 ring-primary/30" : ""
              } ${answered ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent"}`}
            >
              {i + 1}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
