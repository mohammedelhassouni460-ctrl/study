import type { Metadata } from "next";
import Link from "next/link";
import { NotebookTextIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { SummaryGenerator } from "@/components/summary/summary-generator";
import { SummaryView } from "@/components/summary/summary-view";
import { Button } from "@/components/ui/button";
import { summaryOutputSchema } from "@/lib/ai/schemas";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Fiches" };

const LENGTH_LABELS: Record<string, string> = { short: "Ultra courte", standard: "Standard", detailed: "Détaillée" };

export default async function SummaryPage({ params, searchParams }: PageProps<"/subjects/[id]/summary">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data: documents }, { data: summaries }] = await Promise.all([
    supabase.from("documents").select("id, name").eq("subject_id", id).eq("status", "ready").order("created_at"),
    supabase
      .from("summaries")
      .select("id, title, length, content, created_at, documents(name)")
      .eq("subject_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const selectedId = typeof query.s === "string" ? query.s : summaries?.[0]?.id;
  const selected = summaries?.find((s) => s.id === selectedId) ?? summaries?.[0];
  const content = selected ? summaryOutputSchema.safeParse(selected.content) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="grid content-start gap-6">
        <SummaryGenerator subjectId={id} documents={documents ?? []} />
        {summaries && summaries.length > 1 && (
          <nav aria-label="Fiches précédentes" className="grid gap-1">
            <h2 className="mb-1 text-sm font-semibold">Fiches précédentes</h2>
            {summaries.map((s) => (
              <Link
                key={s.id}
                href={`?s=${s.id}`}
                aria-current={s.id === selected?.id ? "true" : undefined}
                className={cn(
                  "truncate rounded-md px-3 py-2 text-sm hover:bg-accent",
                  s.id === selected?.id && "bg-accent font-medium text-accent-foreground",
                )}
              >
                {s.title} <span className="text-xs text-muted-foreground">· {LENGTH_LABELS[s.length]}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>
      <div className="lg:col-span-2">
        {!documents?.length ? (
          <EmptyState
            icon={NotebookTextIcon}
            title="Aucun document analysé"
            description="Importe un cours pour générer ta première fiche."
            action={
              <Button asChild>
                <Link href={`/subjects/${id}/documents`}>Importer un cours</Link>
              </Button>
            }
          />
        ) : !selected || !content?.success ? (
          <EmptyState
            icon={NotebookTextIcon}
            title="Pas encore de fiche"
            description="Choisis un format et génère ta fiche de révision en quelques secondes."
          />
        ) : (
          <SummaryView
            content={content.data}
            meta={`${LENGTH_LABELS[selected.length]} · ${selected.documents?.name ?? "Tous les documents"} · ${new Date(selected.created_at).toLocaleDateString("fr-FR")}`}
          />
        )}
      </div>
    </div>
  );
}
