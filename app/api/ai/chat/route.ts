import type Anthropic from "@anthropic-ai/sdk";

import { aiModel, fallbackOptions, getAnthropic, mapAnthropicError } from "@/lib/ai/client";
import { reserveAiCredits } from "@/lib/ai/credits";
import { chatSystemPrompt } from "@/lib/ai/prompts";
import { track } from "@/lib/analytics/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { formatSources, retrieveChunks, toChatSource } from "@/lib/chat/retrieval";
import { apiHandler, parseJsonBody } from "@/lib/http/api";
import { AppError, GENERIC_ERROR_MESSAGE } from "@/lib/http/errors";
import { chatRequestSchema } from "@/lib/validations/ai";
import type { Json } from "@/types/database";
import type { ChatSource } from "@/types/domain";

export const maxDuration = 120;

const HISTORY_MESSAGES = 10;

/**
 * RAG chat. Streams newline-delimited JSON events:
 *   {"type":"sources","sources":[…]} → {"type":"delta","text":"…"}* → {"type":"done","messageId":"…"}
 * or {"type":"error","message":"…"} if generation fails mid-stream.
 */
export const POST = apiHandler({ rateLimit: "aiChat" }, async (request, { user, supabase }) => {
  const body = await parseJsonBody(request, chatRequestSchema);
  const { data: subject } = await supabase.from("subjects").select("id, name").eq("id", body.subjectId).maybeSingle();
  if (!subject) throw new AppError("not_found", "Matière introuvable.", 404);

  const anthropic = getAnthropic(); // fails fast (503) when the AI is not configured
  const reservation = await reserveAiCredits(user.id, "chat");

  let stream: ReturnType<Anthropic["beta"]["messages"]["stream"]>;
  let sources: ChatSource[];
  try {
    const [profile, chunks, { data: history }] = await Promise.all([
      getCurrentProfile(),
      retrieveChunks(supabase, subject.id, body.message),
      supabase
        .from("chat_messages")
        .select("role, content")
        .eq("subject_id", subject.id)
        .order("created_at", { ascending: false })
        .limit(HISTORY_MESSAGES),
    ]);
    sources = chunks.map(toChatSource);

    const { error: insertError } = await supabase
      .from("chat_messages")
      .insert({ user_id: user.id, subject_id: subject.id, role: "user", content: body.message });
    if (insertError) throw insertError;

    // Previous turns (oldest first); the API requires the first message to be from the user.
    const previous = (history ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    while (previous[0]?.role === "assistant") previous.shift();

    stream = anthropic.beta.messages.stream(
      {
        ...fallbackOptions(),
        model: aiModel(),
        max_tokens: 4_000,
        system: chatSystemPrompt({ subjectName: subject.name, level: profile?.education_level, hasSources: chunks.length > 0 }),
        messages: [...previous, { role: "user", content: `${formatSources(chunks)}Question : ${body.message}` }],
        output_config: { effort: "low" },
      },
      { signal: request.signal },
    );
  } catch (error) {
    await reservation.refund();
    mapAnthropicError(error);
  }

  const encoder = new TextEncoder();
  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // The client went away; keep going so the answer is still saved.
        }
      };
      let text = "";
      send({ type: "sources", sources });
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            text += event.delta.text;
            send({ type: "delta", text: event.delta.text });
          }
        }
        const message = await stream.finalMessage();
        if (message.stop_reason === "refusal") {
          throw new AppError("ai_refused", "L'IA ne peut pas répondre à cette question.", 422);
        }
        if (!text.trim()) throw new AppError("ai_invalid_output", "L'IA n'a pas répondu. Réessaie.", 502);

        const { data: saved } = await supabase
          .from("chat_messages")
          .insert({ user_id: user.id, subject_id: subject.id, role: "assistant", content: text, sources: sources as unknown as NonNullable<Json> })
          .select("id")
          .single();
        await reservation.complete({
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          model: message.model,
        });
        await track(user.id, "chat_message_sent", { sources: sources.length });
        send({ type: "done", messageId: saved?.id ?? null });
      } catch (error) {
        // Nothing useful was delivered: give the credit back.
        if (!text.trim() || error instanceof AppError) await reservation.refund();
        if (!request.signal.aborted) {
          let message = GENERIC_ERROR_MESSAGE;
          if (error instanceof AppError) message = error.message;
          else {
            try {
              mapAnthropicError(error);
            } catch (mapped) {
              if (mapped instanceof AppError) message = mapped.message;
              else console.error("[chat] stream failed", mapped);
            }
          }
          send({ type: "error", message });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body$, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
});
