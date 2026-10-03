import "server-only";

import type { DocumentFileType } from "./file-validation";
import { normalizeText, reflowLines } from "./chunking";

export interface ExtractedDocument {
  text: string;
  pageCount: number | null;
  /** Start offset (in `text`) of each page, for PDFs. */
  pageOffsets: number[];
}

const MAX_TEXT_CHARS = 2_000_000;

export async function extractDocumentText(bytes: Uint8Array, fileType: DocumentFileType): Promise<ExtractedDocument> {
  if (fileType === "pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { totalPages, text } = await extractText(pdf, { mergePages: false });
    const pages = text.map((page) => normalizeText(reflowLines(page.replace(/(\w)-\n(\w)/g, "$1$2"))));
    const offsets: number[] = [];
    let cursor = 0;
    for (const page of pages) {
      offsets.push(cursor);
      cursor += page.length + 2;
    }
    return { text: pages.join("\n\n").slice(0, MAX_TEXT_CHARS), pageCount: totalPages, pageOffsets: offsets };
  }

  if (fileType === "docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return { text: normalizeText(value).slice(0, MAX_TEXT_CHARS), pageCount: null, pageOffsets: [] };
  }

  const decoded = new TextDecoder("utf-8").decode(bytes);
  return { text: normalizeText(decoded).slice(0, MAX_TEXT_CHARS), pageCount: null, pageOffsets: [] };
}

/** Page (1-based) containing a character offset. */
export function pageForOffset(offsets: number[], offset: number): number | undefined {
  if (offsets.length === 0) return undefined;
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (offsets[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}
