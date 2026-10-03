import type { Metadata } from "next";
import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploader } from "@/components/documents/document-uploader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage({ params, searchParams }: PageProps<"/subjects/[id]/documents">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, file_type, file_size, status, error_message, page_count, chunk_count, created_at")
    .eq("subject_id", id)
    .order("created_at", { ascending: false });
  const readyCount = (documents ?? []).filter((d) => d.status === "ready").length;

  return (
    <div className="grid gap-6">
      {query.welcome && (
        <Alert variant="info">
          <SparklesIcon />
          <AlertTitle>Dernière étape : importe ton premier cours</AlertTitle>
          <AlertDescription className="text-accent-foreground">
            StudyOS va l&apos;analyser puis générer fiches, flashcards et quiz.
          </AlertDescription>
        </Alert>
      )}
      <DocumentUploader subjectId={id} />
      {documents && documents.length > 0 && (
        <section aria-labelledby="documents-title" className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 id="documents-title" className="font-semibold">
              Documents ({documents.length})
            </h2>
            {readyCount > 0 && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/subjects/${id}/summary`}>
                  <SparklesIcon /> Générer une fiche
                </Link>
              </Button>
            )}
          </div>
          <DocumentList documents={documents} />
        </section>
      )}
    </div>
  );
}
