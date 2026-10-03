import Link from "next/link";
import { BrainIcon, FileTextIcon, LayersIcon, ListChecksIcon, MessageSquareTextIcon, NotebookTextIcon, UploadIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { MasteryBadge, MasteryBar } from "@/components/shared/mastery";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { averageMastery, weakestTopics } from "@/lib/learning/mastery";
import { createClient } from "@/lib/supabase/server";

export default async function SubjectOverviewPage({ params }: PageProps<"/subjects/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const [topicsRes, docsRes, cardsRes, dueRes, quizzesRes] = await Promise.all([
    supabase.from("topics").select("id, name, description, mastery_score, attempts_count").eq("subject_id", id).order("name"),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("subject_id", id),
    supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("subject_id", id),
    supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("subject_id", id).lte("next_review_at", nowIso),
    supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("subject_id", id),
  ]);
  const topics = topicsRes.data ?? [];
  const mastery = averageMastery(topics.map((t) => t.mastery_score));
  const priorities = weakestTopics(topics.filter((t) => t.mastery_score < 75), 3);
  const base = `/subjects/${id}`;

  if ((docsRes.count ?? 0) === 0 && topics.length === 0) {
    return (
      <EmptyState
        icon={UploadIcon}
        title="Importe ton premier cours"
        description="Dépose un PDF, un DOCX ou un TXT : StudyOS l'analyse et en extrait les chapitres et concepts."
        action={
          <Button asChild>
            <Link href={`${base}/documents`}>
              <UploadIcon /> Importer un cours
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BrainIcon} label="Maîtrise" value={`${mastery} %`} hint={<MasteryBar score={mastery} className="mt-1" />} />
        <StatCard icon={FileTextIcon} label="Documents" value={docsRes.count ?? 0} />
        <StatCard icon={LayersIcon} label="Flashcards" value={cardsRes.count ?? 0} hint={`${dueRes.count ?? 0} à revoir`} />
        <StatCard icon={ListChecksIcon} label="Quiz" value={quizzesRes.count ?? 0} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Concepts</CardTitle>
            <CardDescription>Ta maîtrise évolue après chaque quiz et chaque flashcard.</CardDescription>
          </CardHeader>
          <CardContent>
            {topics.length === 0 ? (
              <p className="text-sm text-muted-foreground">Les concepts apparaîtront après l&apos;analyse de tes documents.</p>
            ) : (
              <ul className="grid gap-4">
                {topics.map((topic) => (
                  <li key={topic.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium" title={topic.description ?? undefined}>
                        {topic.name}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <MasteryBadge score={topic.mastery_score} />
                        <span className="w-10 text-right tabular-nums text-muted-foreground">{topic.mastery_score} %</span>
                      </span>
                    </div>
                    <MasteryBar score={topic.mastery_score} label={`Maîtrise : ${topic.name}`} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid content-start gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Priorités</CardTitle>
              <CardDescription>Les concepts que StudyOS te fait travailler en premier.</CardDescription>
            </CardHeader>
            <CardContent>
              {priorities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Rien d&apos;urgent : continue tes révisions espacées. 🎉</p>
              ) : (
                <ol className="grid gap-2 text-sm">
                  {priorities.map((topic, index) => (
                    <li key={topic.id} className="flex items-center gap-3">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                        {index + 1}
                      </span>
                      <span className="flex-1 truncate">{topic.name}</span>
                      <span className="tabular-nums text-muted-foreground">{topic.mastery_score} %</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Réviser</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="outline" className="justify-start">
                <Link href={`${base}/summary`}><NotebookTextIcon /> Générer une fiche</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href={`${base}/flashcards`}><LayersIcon /> Réviser les flashcards</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href={`${base}/quiz`}><ListChecksIcon /> Créer un quiz</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href={`${base}/chat`}><MessageSquareTextIcon /> Poser une question au cours</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
