"use client";

import { Trash2Icon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { MasteryBadge } from "@/components/shared/mastery";
import { Button } from "@/components/ui/button";
import { deleteFlashcardAction } from "@/lib/actions/flashcards";
import { formatFrenchDate, toISODate } from "@/lib/learning/dates";

export interface FlashcardListItem {
  id: string;
  question: string;
  answer: string;
  mastery_score: number;
  next_review_at: string;
  review_count: number;
  topic: string | null;
}

function DeleteButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label="Supprimer la flashcard"
      onClick={() =>
        start(async () => {
          const result = await deleteFlashcardAction(id);
          if (result.ok) toast.success("Flashcard supprimée");
          else toast.error(result.error);
        })
      }
    >
      <Trash2Icon />
    </Button>
  );
}

export function FlashcardList({ cards }: { cards: FlashcardListItem[] }) {
  return (
    <ul className="grid gap-2">
      {cards.map((card) => (
        <li key={card.id} className="flex items-start gap-3 rounded-lg border bg-card p-4">
          <details className="min-w-0 flex-1">
            <summary className="cursor-pointer font-medium">{card.question}</summary>
            <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{card.answer}</p>
          </details>
          <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
            {card.topic && <div className="max-w-40 truncate">{card.topic}</div>}
            <div>{card.review_count === 0 ? "Nouvelle" : `Prochaine : ${formatFrenchDate(toISODate(new Date(card.next_review_at)))}`}</div>
          </div>
          <MasteryBadge score={card.mastery_score} />
          <DeleteButton id={card.id} />
        </li>
      ))}
    </ul>
  );
}
