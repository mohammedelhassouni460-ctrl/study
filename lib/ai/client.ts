import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

import { env } from "@/lib/env";
import { AppError } from "@/lib/http/errors";

let client: Anthropic | null = null;

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function aiModel(): string {
  return env().ANTHROPIC_MODEL;
}

export function getAnthropic(): Anthropic {
  const { ANTHROPIC_API_KEY } = env();
  if (!ANTHROPIC_API_KEY) {
    throw new AppError(
      "not_configured",
      "L'IA n'est pas encore configurée sur ce serveur (ANTHROPIC_API_KEY manquante).",
      503,
    );
  }
  client ??= new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 2, timeout: 5 * 60 * 1000 });
  return client;
}

/**
 * Server-side fallback: if the primary model declines a request, Anthropic
 * re-runs it on a recommended fallback model within the same call.
 */
export function fallbackOptions(): { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } {
  return { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
}

export type Effort = "low" | "medium" | "high";

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export function mapAnthropicError(error: unknown): never {
  if (error instanceof AppError) throw error;
  if (error instanceof Anthropic.RateLimitError) {
    throw new AppError("ai_unavailable", "L'IA est très sollicitée. Réessaie dans une minute.", 503);
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    console.error("[ai] authentication error", error.message);
    throw new AppError("not_configured", "L'IA est mal configurée sur ce serveur.", 503);
  }
  if (error instanceof Anthropic.BadRequestError) {
    console.error("[ai] bad request", error.message);
    throw new AppError("ai_unavailable", "La requête IA a échoué. Réessaie avec moins de contenu.", 502);
  }
  if (error instanceof Anthropic.APIError || error instanceof Anthropic.APIConnectionError) {
    console.error("[ai] api error", error.message);
    throw new AppError("ai_unavailable", "Le service IA est momentanément indisponible. Réessaie.", 503);
  }
  throw error;
}

/**
 * Structured generation: the model is constrained to a JSON schema derived from
 * the Zod schema (structured outputs), and the result is re-validated with Zod —
 * the model's JSON is never trusted as-is.
 */
export async function generateStructured<S extends z.ZodType>({
  schema,
  system,
  prompt,
  maxTokens = 16_000,
  effort = "medium",
}: {
  schema: S;
  system: string;
  prompt: string;
  maxTokens?: number;
  effort?: Effort;
}): Promise<{ data: z.infer<S>; usage: AiUsage }> {
  const anthropic = getAnthropic();
  const model = aiModel();
  let message;
  try {
    // Streaming avoids HTTP timeouts on long generations.
    const stream = anthropic.beta.messages.stream({
      ...fallbackOptions(),
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: betaZodOutputFormat(schema), effort },
    });
    message = await stream.finalMessage();
  } catch (error) {
    mapAnthropicError(error);
  }

  if (message.stop_reason === "refusal") {
    throw new AppError("ai_refused", "L'IA n'a pas pu traiter ce contenu.", 422);
  }
  if (message.stop_reason === "max_tokens") {
    throw new AppError("ai_invalid_output", "La réponse de l'IA était trop longue. Réessaie avec moins d'éléments.", 502);
  }

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AppError("ai_invalid_output", "La réponse de l'IA était illisible. Réessaie.", 502);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    console.error("[ai] schema validation failed", parsed.error.issues.slice(0, 3));
    throw new AppError("ai_invalid_output", "La réponse de l'IA était incomplète. Réessaie.", 502);
  }
  return {
    data: parsed.data,
    usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, model: message.model },
  };
}
