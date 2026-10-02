import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChatPanel, type ChatMessage } from "@/components/chat/chat-panel";
import { getSubject } from "@/lib/data/subjects";
import { createClient } from "@/lib/supabase/server";
import type { ChatSource } from "@/types/domain";

export const metadata: Metadata = { title: "Ask StudyOS" };

export default async function ChatPage({ params, searchParams }: PageProps<"/subjects/[id]/chat">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const subject = await getSubject(id);
  if (!subject) notFound();

  const supabase = await createClient();
  const [{ data: rows }, { count: documents }] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("id, role, content, sources, created_at")
      .eq("subject_id", id)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("subject_id", id).eq("status", "ready"),
  ]);

  const messages: ChatMessage[] = (rows ?? []).reverse().map((m) => ({
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    sources: Array.isArray(m.sources) ? (m.sources as unknown as ChatSource[]) : [],
  }));
  const prompt = typeof query.prompt === "string" ? query.prompt.slice(0, 2000) : undefined;

  return (
    <ChatPanel
      subjectId={id}
      subjectName={subject.name}
      initialMessages={messages}
      initialPrompt={prompt}
      hasDocuments={(documents ?? 0) > 0}
    />
  );
}
