"use client";

import { CheckCircle2Icon, CircleAlertIcon, FileUpIcon, Loader2Icon, UploadCloudIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ACCEPT_ATTRIBUTE, MAX_FILE_SIZE_BYTES, validateUploadMetadata } from "@/lib/documents/file-validation";
import { errorMessage, postJson } from "@/lib/http/client";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type UploadStatus = "uploading" | "processing" | "ready" | "failed";

interface UploadItem {
  key: string;
  name: string;
  status: UploadStatus;
  error?: string;
}

const STATUS_LABELS: Record<UploadStatus, string> = {
  uploading: "Envoi…",
  processing: "Analyse de ton cours…",
  ready: "Prêt",
  failed: "Échec",
};

export function DocumentUploader({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);

  const setItem = (key: string, patch: Partial<UploadItem>) =>
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const uploadOne = useCallback(
    async (file: File) => {
      const key = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      setItems((list) => [{ key, name: file.name, status: "uploading" }, ...list]);

      const validation = validateUploadMetadata(file);
      if (!validation.ok) {
        setItem(key, { status: "failed", error: validation.error });
        return;
      }
      try {
        const prepared = await postJson<{ documentId: string; path: string; token: string; contentType: string }>(
          "/api/documents/upload",
          { subjectId, name: file.name, size: file.size, type: file.type },
        );
        const supabase = createClient();
        const { error } = await supabase.storage
          .from("documents")
          .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: prepared.contentType });
        if (error) throw new Error("L'envoi du fichier a échoué. Réessaie.");

        setItem(key, { status: "processing" });
        router.refresh();
        await postJson("/api/documents/process", { documentId: prepared.documentId });
        setItem(key, { status: "ready" });
        toast.success(`« ${file.name} » est prêt.`);
      } catch (error) {
        setItem(key, { status: "failed", error: errorMessage(error) });
      } finally {
        router.refresh();
      }
    },
    [router, subjectId],
  );

  const handleFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    // Sequential processing keeps the UI understandable and avoids rate limits.
    void Array.from(files)
      .slice(0, 10)
      .reduce((chain, file) => chain.then(() => uploadOne(file)), Promise.resolve());
  };

  return (
    <div className="grid gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card px-6 py-10 text-center transition-colors",
          dragging ? "border-primary bg-accent/50" : "border-border",
        )}
      >
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">
          <UploadCloudIcon className="size-6" aria-hidden />
        </div>
        <p className="font-medium">Dépose tes cours ici</p>
        <p className="mt-1 text-sm text-muted-foreground">
          PDF, DOCX ou TXT · {MAX_FILE_SIZE_BYTES / 1024 / 1024} Mo maximum par fichier
        </p>
        <Button className="mt-5" onClick={() => inputRef.current?.click()}>
          <FileUpIcon /> Ajouter un cours
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          aria-label="Choisir des fichiers à importer"
          data-testid="document-input"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="grid gap-2" aria-live="polite">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
              {item.status === "ready" ? (
                <CheckCircle2Icon className="size-4 shrink-0 text-success" aria-hidden />
              ) : item.status === "failed" ? (
                <CircleAlertIcon className="size-4 shrink-0 text-destructive" aria-hidden />
              ) : (
                <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.name}</span>
                {item.error && <span className="block text-xs text-destructive">{item.error}</span>}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{STATUS_LABELS[item.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
