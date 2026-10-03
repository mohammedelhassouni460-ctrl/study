"use client";

import { DownloadIcon, FileTextIcon, Loader2Icon, RotateCwIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteDocumentAction } from "@/lib/actions/documents";
import { errorMessage, postJson } from "@/lib/http/client";

export interface DocumentListItem {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  status: string;
  error_message: string | null;
  page_count: number | null;
  chunk_count: number;
  created_at: string;
}

const STATUS = {
  uploading: { label: "Envoi", variant: "secondary" },
  processing: { label: "Analyse…", variant: "warning" },
  ready: { label: "Prêt", variant: "success" },
  failed: { label: "Échec", variant: "destructive" },
} as const;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

export function DocumentList({ documents }: { documents: DocumentListItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const hasProcessing = documents.some((d) => d.status === "processing" || d.status === "uploading");

  // Refresh while a document is being analysed (e.g. after a page reload).
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(timer);
  }, [hasProcessing, router]);

  const retry = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      try {
        await postJson("/api/documents/process", { documentId: id });
        toast.success("Document analysé.");
      } catch (error) {
        toast.error(errorMessage(error));
      } finally {
        setBusyId(null);
        router.refresh();
      }
    });
  };

  const remove = (id: string, name: string) => {
    if (!window.confirm(`Supprimer « ${name} » ? Les extraits utilisés par le chat seront supprimés.`)) return;
    setBusyId(id);
    startTransition(async () => {
      const result = await deleteDocumentAction(id);
      if (result.ok) toast.success("Document supprimé.");
      else toast.error(result.error);
      setBusyId(null);
      router.refresh();
    });
  };

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {documents.map((doc) => {
        const status = STATUS[doc.status as keyof typeof STATUS] ?? STATUS.failed;
        const busy = pending && busyId === doc.id;
        return (
          <li key={doc.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
              <FileTextIcon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{doc.name}</p>
              <p className="text-xs text-muted-foreground">
                {doc.file_type.toUpperCase()} · {formatSize(doc.file_size)}
                {doc.page_count ? ` · ${doc.page_count} pages` : ""}
                {doc.status === "ready" ? ` · ${doc.chunk_count} extraits` : ""}
              </p>
              {doc.status === "failed" && doc.error_message && (
                <p className="mt-1 text-xs text-destructive">{doc.error_message}</p>
              )}
            </div>
            <Badge variant={status.variant}>
              {doc.status === "processing" && <Loader2Icon className="animate-spin" />}
              {status.label}
            </Badge>
            <div className="flex gap-1">
              {(doc.status === "failed" || doc.status === "uploading") && (
                <Button variant="ghost" size="icon-sm" aria-label={`Relancer l'analyse de ${doc.name}`} onClick={() => retry(doc.id)} disabled={busy}>
                  <RotateCwIcon className={busy ? "animate-spin" : undefined} />
                </Button>
              )}
              <Button variant="ghost" size="icon-sm" asChild aria-label={`Télécharger ${doc.name}`}>
                <a href={`/api/documents/${doc.id}/download`}>
                  <DownloadIcon />
                </a>
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Supprimer ${doc.name}`} onClick={() => remove(doc.id, doc.name)} disabled={busy}>
                <Trash2Icon />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
