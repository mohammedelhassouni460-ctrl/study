"use client";

import { BookOpenIcon, Loader2Icon, SendIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { clearChatAction } from "@/lib/actions/chat";
import { ApiClientError, errorMessage } from "@/lib/http/client";
import { cn } from "@/lib/utils";
import type { ChatSource } from "@/types/domain";

import { RichText } from "./rich-text";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: ChatSource[];
  error?: boolean;
}

const SUGGESTIONS = [
  "Explique-moi ce chapitre simplement.",
  "Quelles sont les notions à connaître pour l'examen ?",
  "Fais-moi un exercice corrigé.",
  "Donne-moi un exemple concret.",
];

type StreamEvent =
  | { type: "sources"; sources: ChatSource[] }
  | { type: "delta"; text: string }
  | { type: "done"; messageId: string | null }
  | { type: "error"; message: string };

function Sources({ sources, messageId, highlighted }: { sources: ChatSource[]; messageId: string; highlighted: number | null }) {
  if (sources.length === 0) return null;
  return (
    <details className="mt-3 text-sm" open={highlighted !== null}>
      <summary className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <BookOpenIcon className="size-3.5" aria-hidden /> {sources.length} source{sources.length > 1 ? "s" : ""} dans tes documents
      </summary>
      <ol className="mt-2 grid gap-2">
        {sources.map((source, i) => (
          <li
            key={`${source.documentId}-${source.chunkIndex}`}
            id={`${messageId}-source-${i + 1}`}
            className={cn("rounded-lg border bg-background p-3", highlighted === i + 1 && "border-primary ring-2 ring-primary/20")}
          >
            <p className="text-xs font-medium">
              [{i + 1}] {source.documentName}
              {source.page ? ` · page ${source.page}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{source.excerpt}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}

function AssistantMessage({ message }: { message: ChatMessage }) {
  const [highlighted, setHighlighted] = useState<number | null>(null);
  return (
    <div className={cn("rounded-2xl rounded-tl-sm border bg-card px-4 py-3 text-sm", message.error && "border-destructive/40 text-destructive")}>
      {message.content ? (
        <RichText
          text={message.content}
          onCite={(n) => {
            setHighlighted(n);
            requestAnimationFrame(() =>
              document.getElementById(`${message.id}-source-${n}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
            );
          }}
        />
      ) : (
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" aria-hidden /> Je cherche dans tes cours…
        </span>
      )}
      <Sources sources={message.sources} messageId={message.id} highlighted={highlighted} />
    </div>
  );
}

export function ChatPanel({
  subjectId,
  subjectName,
  initialMessages,
  initialPrompt,
  hasDocuments,
}: {
  subjectId: string;
  subjectName: string;
  initialMessages: ChatMessage[];
  initialPrompt?: string;
  hasDocuments: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState(initialPrompt ?? "");
  const [streaming, setStreaming] = useState(false);
  const [clearing, startClearing] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (initialPrompt) inputRef.current?.focus();
  }, [initialPrompt]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || streaming) return;
    const assistantId = `pending-${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: `user-${Date.now()}`, role: "user", content: message, sources: [] },
      { id: assistantId, role: "assistant", content: "", sources: [] },
    ]);
    setInput("");
    setStreaming(true);

    const update = (patch: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>)) =>
      setMessages((list) =>
        list.map((m) => (m.id === assistantId ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) } : m)),
      );

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, message }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: { message?: string; code?: string } } | null;
        throw new ApiClientError(data?.error?.message ?? "Le chat est momentanément indisponible.", data?.error?.code ?? "internal", res.status);
      }

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "sources") update({ sources: event.sources });
          else if (event.type === "delta") update((m) => ({ content: m.content + event.text }));
          else if (event.type === "done" && event.messageId) update({ id: event.messageId });
          else if (event.type === "error") update((m) => ({ content: m.content || event.message, error: !m.content }));
        }
      }
      router.refresh(); // credits meter
    } catch (error) {
      update({ content: errorMessage(error), error: true, sources: [] });
      toast.error(errorMessage(error));
    } finally {
      setStreaming(false);
    }
  };

  const clear = () =>
    startClearing(async () => {
      const result = await clearChatAction(subjectId);
      if (result.ok) setMessages([]);
      else toast.error(result.error);
    });

  return (
    <div className="mx-auto flex h-[calc(100dvh-16rem)] min-h-[28rem] max-w-3xl flex-col rounded-xl border bg-muted/30">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <p className="text-sm font-medium">Ask StudyOS · {subjectName}</p>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear} disabled={clearing || streaming}>
            <Trash2Icon /> Effacer
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4" aria-live="polite" aria-busy={streaming}>
        {messages.length === 0 ? (
          <div className="grid h-full content-center justify-items-center gap-4 text-center">
            <SparklesIcon className="size-8 text-primary" aria-hidden />
            <div>
              <p className="font-medium">Pose une question sur ton cours</p>
              <p className="text-sm text-muted-foreground">
                {hasDocuments
                  ? "Je réponds à partir de tes documents et je cite mes sources."
                  : "Importe un document pour que je puisse m'appuyer sur ton cours."}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => send(s)} disabled={streaming}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="grid gap-4">
            {messages.map((m) => (
              <li key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2 text-sm whitespace-pre-line text-primary-foreground">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[92%]">
                    <AssistantMessage message={m} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t bg-background p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Ta question
        </label>
        <Textarea
          id="chat-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="Ex. : Explique-moi l'élasticité-prix avec un exemple"
          rows={1}
          maxLength={2000}
          className="max-h-40 min-h-10 resize-none"
        />
        <Button type="submit" size="icon" disabled={streaming || !input.trim()} aria-label="Envoyer">
          {streaming ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
        </Button>
      </form>
    </div>
  );
}
