import { describe, expect, it } from "vitest";

import { chunkText, estimateTokens, normalizeText } from "@/lib/documents/chunking";
import {
  MAX_FILE_SIZE_BYTES,
  matchesMagicBytes,
  sanitizeFileName,
  validateUploadMetadata,
} from "@/lib/documents/file-validation";

const enc = new TextEncoder();

describe("validateUploadMetadata", () => {
  it("accepts supported formats", () => {
    expect(validateUploadMetadata({ name: "chapitre-1.pdf", size: 1000, type: "application/pdf" })).toMatchObject({ ok: true, fileType: "pdf" });
    expect(validateUploadMetadata({ name: "notes.txt", size: 10, type: "" })).toMatchObject({ ok: true, fileType: "txt" });
  });

  it("rejects unsupported, empty, oversized or mismatching files", () => {
    expect(validateUploadMetadata({ name: "virus.exe", size: 10, type: "application/x-msdownload" }).ok).toBe(false);
    expect(validateUploadMetadata({ name: "a.pdf", size: 0, type: "application/pdf" }).ok).toBe(false);
    expect(validateUploadMetadata({ name: "a.pdf", size: MAX_FILE_SIZE_BYTES + 1, type: "application/pdf" }).ok).toBe(false);
    expect(validateUploadMetadata({ name: "a.pdf", size: 10, type: "text/html" }).ok).toBe(false);
  });

  it("sanitises names", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("cours\u0000.pdf")).toBe("cours.pdf");
  });
});

describe("matchesMagicBytes", () => {
  it("detects PDF", () => {
    expect(matchesMagicBytes(enc.encode("%PDF-1.7\n..."), "pdf")).toBe(true);
    expect(matchesMagicBytes(enc.encode("<html>"), "pdf")).toBe(false);
  });

  it("detects DOCX zip containers", () => {
    const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...enc.encode("....word/document.xml")]);
    expect(matchesMagicBytes(docx, "docx")).toBe(true);
    expect(matchesMagicBytes(enc.encode("plain"), "docx")).toBe(false);
  });

  it("accepts UTF-8 text and rejects binary", () => {
    expect(matchesMagicBytes(enc.encode("Élasticité-prix de la demande"), "txt")).toBe(true);
    expect(matchesMagicBytes(new Uint8Array([0x41, 0x00, 0x42]), "txt")).toBe(false);
  });
});

describe("chunkText", () => {
  it("normalises whitespace and hyphenation", () => {
    expect(normalizeText("élas-\ntique   demande\r\n\r\n\r\n\r\nfin")).toBe("élastique demande\n\nfin");
  });

  it("returns nothing for empty text", () => {
    expect(chunkText("   ")).toEqual([]);
  });

  it("keeps a short text in one chunk", () => {
    const chunks = chunkText("Chapitre 1\n\nL'offre et la demande.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].metadata.heading).toBe("Chapitre 1");
  });

  it("splits long text into chunks within the token bounds, with overlap", () => {
    const paragraph = "La demande est élastique lorsque la variation relative des quantités dépasse celle du prix. ".repeat(12);
    const text = Array.from({ length: 40 }, (_, i) => `Paragraphe ${i}. ${paragraph}`).join("\n\n");
    const chunks = chunkText(text, { targetTokens: 1000, maxTokens: 1500, overlapTokens: 100 });
    expect(chunks.length).toBeGreaterThan(5);
    for (const chunk of chunks) expect(chunk.tokenCount).toBeLessThanOrEqual(1600);
    expect(chunks.slice(0, -1).every((c) => c.tokenCount >= 700)).toBe(true);
    expect(chunks.map((c) => c.index)).toEqual(chunks.map((_, i) => i));
    // overlap: the start of chunk 2 appears at the end of chunk 1
    expect(chunks[0].content.slice(-500)).toContain(chunks[1].content.slice(0, 60));
  });

  it("splits a single huge paragraph", () => {
    const huge = "Une phrase assez longue sur les externalités négatives. ".repeat(500);
    const chunks = chunkText(huge);
    expect(chunks.length).toBeGreaterThan(1);
    expect(estimateTokens(huge)).toBeGreaterThan(1500);
  });
});

describe("reflowLines", () => {
  it("rebuilds paragraphs and headings from PDF lines", async () => {
    const { reflowLines } = await import("@/lib/documents/chunking");
    const page = [
      "Chapitre 2 — L'élasticité",
      "1. Élasticité-prix de la demande",
      "L'élasticité-prix de la demande mesure la variation relative de la quantité demandée",
      "résultant d'une variation relative du prix.",
      "Si le prix augmente de 10 % et que la quantité baisse de 20 %, l'élasticité vaut -2.",
    ].join("\n");
    expect(reflowLines(page).split("\n\n")).toEqual([
      "Chapitre 2 — L'élasticité",
      "1. Élasticité-prix de la demande",
      "L'élasticité-prix de la demande mesure la variation relative de la quantité demandée résultant d'une variation relative du prix.",
      "Si le prix augmente de 10 % et que la quantité baisse de 20 %, l'élasticité vaut -2.",
    ]);
  });
});
