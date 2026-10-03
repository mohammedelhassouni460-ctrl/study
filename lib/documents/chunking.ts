/**
 * Splits extracted course text into overlapping chunks for embeddings / RAG.
 * Token counts are approximated (≈ 4 characters per token for French/English),
 * which is enough to keep chunks in the 800–1500 token range.
 */

export interface TextChunk {
  index: number;
  content: string;
  tokenCount: number;
  metadata: { charStart: number; charEnd: number; heading?: string };
}

export interface ChunkOptions {
  targetTokens?: number;
  maxTokens?: number;
  overlapTokens?: number;
}

export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/­/g, "") // soft hyphens
    .replace(/(\w)-\n(\w)/g, "$1$2") // words hyphenated across lines
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const HEADING_RE = /^(?:(?:chapitre|partie|section|chapter)\s+[\divxlc]+|[\divxlc]+[.)]\s+\S|#{1,6}\s+\S)/i;

/**
 * PDF text comes out as visual lines without paragraph breaks. Rebuilds
 * paragraphs: a line ending a sentence noticeably before the right margin, a
 * heading, or a blank line starts a new paragraph.
 */
export function reflowLines(pageText: string): string {
  const lines = pageText.split("\n").map((l) => l.trim());
  const maxLength = Math.max(0, ...lines.map((l) => l.length));
  const out: string[] = [];
  let current = "";
  let previous = "";
  for (const line of lines) {
    const isHeading = line.length > 0 && line.length < 120 && HEADING_RE.test(line);
    const previousEndsParagraph =
      previous !== "" && /[.!?:»)]$/.test(previous) && previous.length < maxLength * 0.85;
    const previousIsHeading = previous !== "" && previous.length < 120 && HEADING_RE.test(previous);
    if (line === "" || isHeading || previousEndsParagraph || previousIsHeading) {
      if (current) out.push(current);
      current = line;
    } else {
      current = current ? `${current} ${line}` : line;
    }
    previous = line;
  }
  if (current) out.push(current);
  return out.filter(Boolean).join("\n\n");
}

function splitLongParagraph(paragraph: string, maxChars: number): string[] {
  const sentences = paragraph.match(/[^.!?…]+[.!?…]+[\])'"»]*\s*|[^.!?…]+$/g) ?? [paragraph];
  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current) {
      parts.push(current.trim());
      current = "";
    }
    if (sentence.length > maxChars) {
      for (let i = 0; i < sentence.length; i += maxChars) parts.push(sentence.slice(i, i + maxChars).trim());
      continue;
    }
    current += sentence;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function chunkText(raw: string, options: ChunkOptions = {}): TextChunk[] {
  const targetChars = (options.targetTokens ?? 1000) * 4;
  const maxChars = (options.maxTokens ?? 1500) * 4;
  const overlapChars = (options.overlapTokens ?? 100) * 4;
  const text = normalizeText(raw);
  if (!text) return [];

  const paragraphs = text
    .split(/\n\n+/)
    .flatMap((p) => (p.length > maxChars ? splitLongParagraph(p, targetChars) : [p]))
    .filter((p) => p.trim().length > 0);

  const chunks: TextChunk[] = [];
  let buffer: string[] = [];
  let bufferLength = 0;
  let cursor = 0;
  let chunkStart = 0;
  let heading: string | undefined;
  let chunkHeading: string | undefined;

  const flush = () => {
    if (buffer.length === 0) return;
    const content = buffer.join("\n\n").trim();
    chunks.push({
      index: chunks.length,
      content,
      tokenCount: estimateTokens(content),
      metadata: { charStart: chunkStart, charEnd: chunkStart + content.length, ...(chunkHeading ? { heading: chunkHeading } : {}) },
    });
    // Carry the tail of the previous chunk for context continuity.
    const tail = content.length > overlapChars ? content.slice(-overlapChars) : "";
    const cut = tail.indexOf(" ");
    const overlap = cut >= 0 ? tail.slice(cut + 1) : tail;
    buffer = overlap ? [overlap] : [];
    bufferLength = overlap.length;
    chunkStart = Math.max(0, chunkStart + content.length - overlap.length);
    chunkHeading = heading;
  };

  for (const paragraph of paragraphs) {
    const firstLine = paragraph.split("\n")[0].trim();
    if (firstLine.length < 120 && HEADING_RE.test(firstLine)) heading = firstLine.replace(/^#+\s*/, "");
    if (chunkHeading === undefined) chunkHeading = heading;

    if (bufferLength + paragraph.length > targetChars && bufferLength > overlapChars) flush();
    if (buffer.length === 0) chunkStart = cursor;
    buffer.push(paragraph);
    bufferLength += paragraph.length + 2;
    cursor += paragraph.length + 2;
  }
  // Last chunk: only emit if it adds more than the overlap.
  if (buffer.length > 0 && !(chunks.length > 0 && bufferLength <= overlapChars + 2)) flush();

  return chunks;
}

/** Headings found in a text ("Chapitre 2 — …", "1. …", "# …"), in order, deduplicated. */
export function extractHeadings(text: string, limit = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const paragraph of normalizeText(text).split(/\n\n+/)) {
    const line = paragraph.split("\n")[0].trim();
    if (line.length < 3 || line.length >= 120 || !HEADING_RE.test(line)) continue;
    const name = line.replace(/^#+\s*/, "").replace(/\s+/g, " ");
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}
