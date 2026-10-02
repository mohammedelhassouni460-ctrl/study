import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2Icon, LayersIcon } from "lucide-react";

import { FlashcardGenerator } from "@/components/flashcards/flashcard-generator";
import { FlashcardList } from "@/components/flashcards/flashcard-list";
import { ReviewSession } from "@/components/flashcards/review-session";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Flashcards" };

const SESSION_SIZE = 30;

export default async function FlashcardsPage({ params }: PageProps<"/subjects/[id]/flashcards">) {
  const { id } = await params;
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [{ data: documents }, { data: cards }] = await Promise.all([
    supabase.from("documents").select("id, name").eq("subject_id", id).eq("status", "ready").order("created_at"),
    supabase
      .from("flashcards")
      .select("id, question, answer, mastery_score, next_review_at, review_count, topics(name)")
      .eq("subject_id", id)
      .order("next_review_at")
      .limit(500),
  ]);

  const all = (cards ?? []).map(({ topics, ...card }) => ({ ...card, topic: topics?.name ?? null }));
  const due = all.filter((c) => c.next_review_at <= now);
  const session = due.slice(0, SESSION_SIZE).map(({ id, question, answer, topic }) => ({ id, question, answer, topic }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="grid content-start gap-6">
        <FlashcardGenerator subjectId={id} documents={documents ?? []} />
        <dl className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border bg-card p-4">
            <dt className="text-xs text-muted-foreground">À réviser</dt>
            <dd className="text-2xl font-semibold">{due.length}</dd>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <dt className="text-xs text-muted-foreground">Total</dt>
            <dd className="text-2xl font-semibold">{all.length}</dd>
          </div>
        </dl>
      </div>

      <div className="lg:col-span-2">
        {all.length === 0 ? (
          <EmptyState
            icon={LayersIcon}
            title="Pas encore de flashcards"
            description={
              documents?.length
                ? "Génère tes premières cartes : l'IA choisit les notions à retenir dans ton cours."
                : "Importe un cours pour générer tes premières flashcards."
            }
            action={
              documents?.length ? undefined : (
                <Button asChild>
                  <Link href={`/subjects/${id}/documents`}>Importer un cours</Link>
                </Button>
              )
            }
          />
        ) : (
          <Tabs defaultValue={session.length ? "review" : "all"}>
            <TabsList>
              <TabsTrigger value="review">Réviser ({due.length})</TabsTrigger>
              <TabsTrigger value="all">Toutes les cartes</TabsTrigger>
            </TabsList>
            <TabsContent value="review" className="mt-4">
              {session.length ? (
                <ReviewSession key={session.map((c) => c.id).join()} cards={session} />
              ) : (
                <EmptyState
                  icon={CheckCircle2Icon}
                  title="Tout est à jour"
                  description="Aucune carte à réviser pour le moment. La répétition espacée te les reproposera au bon moment."
                />
              )}
            </TabsContent>
            <TabsContent value="all" className="mt-4">
              <FlashcardList cards={all} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
