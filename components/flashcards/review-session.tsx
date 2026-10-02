"use client";

import { PartyPopperIcon, RotateCcwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { errorMessage, postJson } from "@/lib/http/client";
import { RATING_LABELS, REVIEW_RATINGS, type ReviewRating } from "@/lib/learning/spaced-repetition";
import { cn } from "@/lib/utils";

export interface ReviewCard {
  id: string;
  question: string;
  answer: string;
  topic: string | null;
}

const RATING_STYLES: Record<ReviewRating, string> = {
  again: "border-destructive/40 hover:bg-destructive/10",
  hard: "border-warning/40 hover:bg-warning/10",
  good: "border-primary/40 hover:bg-primary/10",
  easy: "border-success/40 hover:bg-success/10",
};

export function ReviewSession({ cards }: { cards: ReviewCard[] }) {
  const router = useRouter();
  const [queue, setQueue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pending, setPending] = useState(false);
  const [stats, setStats] = useState<Record<ReviewRating, number>>({ again: 0, hard: 0, good: 0, easy: 0 });

  const card = queue[index];
  const done = index >= queue.length;

  const rate = useCallback(
    async (rating: ReviewRating) => {
      if (!card || pending) return;
      setPending(true);
      try {
        await postJson("/api/flashcards/review", { flashcardId: card.id, rating });
        setStats((s) => ({ ...s, [rating]: s[rating] + 1 }));
        // A forgotten card comes back at the end of this session.
        if (rating === "again") setQueue((q) => [...q, card]);
        setIndex((i) => i + 1);
        setFlipped(false);
      } catch (error) {
        toast.error(errorMessage(error));
      } finally {
        setPending(false);
      }
    },
    [card, pending],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (done || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === " " || event.key === "Enter") {
        if (event.target instanceof HTMLButtonElement) return;
        event.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && ["1", "2", "3", "4"].includes(event.key)) {
        void rate(REVIEW_RATINGS[Number(event.key) - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, flipped, rate]);

  if (done) {
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    return (
      <Card>
        <CardContent className="grid justify-items-center gap-4 py-10 text-center">
          <PartyPopperIcon className="size-10 text-primary" aria-hidden />
          <div>
            <h2 className="text-xl font-semibold">Session terminée !</h2>
            <p className="text-sm text-muted-foreground">{total} révisions enregistrées. Reviens demain pour les prochaines cartes.</p>
          </div>
          <ul className="flex flex-wrap justify-center gap-3 text-sm">
            {REVIEW_RATINGS.map((r) => (
              <li key={r} className="rounded-lg border px-3 py-2">
                {RATING_LABELS[r].emoji} {RATING_LABELS[r].label} : <strong>{stats[r]}</strong>
              </li>
            ))}
          </ul>
          <Button variant="outline" onClick={() => router.refresh()}>
            <RotateCcwIcon /> Actualiser
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          Carte {index + 1} / {queue.length}
        </span>
        <Progress value={(index / queue.length) * 100} className="flex-1" aria-label="Progression de la session" />
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Afficher la question" : "Afficher la réponse"}
        className="group min-h-64 rounded-xl border bg-card p-6 text-left shadow-sm transition hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:p-10"
      >
        {card.topic && <span className="mb-3 block text-xs font-medium tracking-wide text-primary uppercase">{card.topic}</span>}
        <span className="block text-xs text-muted-foreground">{flipped ? "Réponse" : "Question"}</span>
        <span className="mt-2 block text-lg font-medium whitespace-pre-line sm:text-xl" aria-live="polite">
          {flipped ? card.answer : card.question}
        </span>
        {!flipped && (
          <span className="mt-6 block text-xs text-muted-foreground">Clique ou appuie sur Espace pour voir la réponse</span>
        )}
      </button>

      {flipped ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Comment t'en es-tu souvenu ?">
          {REVIEW_RATINGS.map((rating, i) => (
            <Button
              key={rating}
              variant="outline"
              disabled={pending}
              onClick={() => rate(rating)}
              className={cn("h-auto flex-col gap-0.5 py-3", RATING_STYLES[rating])}
            >
              <span className="text-lg" aria-hidden>
                {RATING_LABELS[rating].emoji}
              </span>
              <span>{RATING_LABELS[rating].label}</span>
              <kbd className="hidden text-[10px] text-muted-foreground sm:block">{i + 1}</kbd>
            </Button>
          ))}
        </div>
      ) : (
        <Button size="lg" onClick={() => setFlipped(true)}>
          Voir la réponse
        </Button>
      )}
    </div>
  );
}
