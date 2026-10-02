import "server-only";

/**
 * Embeddings providers (1024 dimensions, matching document_chunks.embedding).
 * Anthropic does not offer an embeddings model; Voyage AI is the provider
 * recommended by Anthropic. OpenAI is supported as an alternative. Without a
 * key, retrieval falls back to Postgres full-text search.
 */

export const EMBEDDING_DIMENSIONS = 1024;

export type EmbeddingsProvider = "voyage" | "openai" | "none";
export type EmbeddingInputType = "document" | "query";

export function embeddingsProvider(): EmbeddingsProvider {
  const explicit = process.env.EMBEDDINGS_PROVIDER?.trim();
  if (explicit === "none") return "none";
  if (explicit === "voyage" && process.env.VOYAGE_API_KEY) return "voyage";
  if (explicit === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (process.env.VOYAGE_API_KEY) return "voyage";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

const BATCH_SIZE = 64;

async function voyageEmbed(texts: string[], inputType: EmbeddingInputType): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: texts,
      model: process.env.VOYAGE_MODEL || "voyage-3.5",
      input_type: inputType,
      output_dimension: EMBEDDING_DIMENSIONS,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Voyage embeddings failed (${res.status})`);
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function openaiEmbed(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: texts,
      model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
      dimensions: EMBEDDING_DIMENSIONS,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings failed (${res.status})`);
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/** Returns one vector per text, or null when no provider is configured. */
export async function embedTexts(texts: string[], inputType: EmbeddingInputType): Promise<number[][] | null> {
  const provider = embeddingsProvider();
  if (provider === "none" || texts.length === 0) return provider === "none" ? null : [];
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    out.push(...(provider === "voyage" ? await voyageEmbed(batch, inputType) : await openaiEmbed(batch)));
  }
  return out;
}

/** pgvector literal ("[0.1,0.2,…]") as expected by PostgREST. */
export function toPgVector(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
