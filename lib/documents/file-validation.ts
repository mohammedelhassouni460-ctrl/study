/** Upload validation: extension + declared MIME before upload, magic bytes after. */

export type DocumentFileType = "pdf" | "docx" | "txt";

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB (also enforced by the bucket)

export const FILE_TYPES: Record<DocumentFileType, { mime: string; extensions: string[]; label: string }> = {
  pdf: { mime: "application/pdf", extensions: [".pdf"], label: "PDF" },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensions: [".docx"],
    label: "Word (DOCX)",
  },
  txt: { mime: "text/plain", extensions: [".txt", ".md"], label: "Texte" },
};

export const ACCEPT_ATTRIBUTE = Object.values(FILE_TYPES)
  .flatMap((t) => [t.mime, ...t.extensions])
  .join(",");

export function fileTypeFromName(name: string): DocumentFileType | null {
  const lower = name.toLowerCase();
  for (const [type, config] of Object.entries(FILE_TYPES) as [DocumentFileType, (typeof FILE_TYPES)[DocumentFileType]][]) {
    if (config.extensions.some((ext) => lower.endsWith(ext))) return type;
  }
  return null;
}

export type UploadValidation =
  | { ok: true; fileType: DocumentFileType; mime: string }
  | { ok: false; error: string };

export function validateUploadMetadata(file: { name: string; size: number; type: string }): UploadValidation {
  const fileType = fileTypeFromName(file.name);
  if (!fileType) return { ok: false, error: "Format non supporté. Formats acceptés : PDF, DOCX, TXT." };
  if (file.size <= 0) return { ok: false, error: "Le fichier est vide." };
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: `Fichier trop volumineux (maximum ${MAX_FILE_SIZE_BYTES / 1024 / 1024} Mo).` };
  }
  const expected = FILE_TYPES[fileType].mime;
  // Browsers sometimes send an empty type (or text/markdown for .md): tolerate those.
  const declared = file.type.split(";")[0].trim();
  const tolerated = declared === "" || declared === expected || (fileType === "txt" && declared.startsWith("text/"));
  if (!tolerated) return { ok: false, error: "Le type du fichier ne correspond pas à son extension." };
  return { ok: true, fileType, mime: expected };
}

/** Sanitised display name: no path, no control characters, max 255 chars. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "document";
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (cleaned || "document").slice(0, 255);
}

/** Checks the real content against the expected type (magic bytes). */
export function matchesMagicBytes(bytes: Uint8Array, fileType: DocumentFileType): boolean {
  if (fileType === "pdf") {
    // "%PDF-" may be preceded by a few junk bytes; look in the first 1 KB.
    const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
    return head.includes("%PDF-");
  }
  if (fileType === "docx") {
    // ZIP container ("PK\x03\x04") holding a word/ directory.
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    if (!isZip) return false;
    const sample = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 64 * 1024)));
    return sample.includes("word/") || sample.includes("[Content_Types].xml");
  }
  // Text: valid UTF-8 and no NUL bytes in the first 64 KB.
  const sample = bytes.subarray(0, 64 * 1024);
  if (sample.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample);
    return true;
  } catch {
    // A multi-byte character may be cut at the sample boundary; retry shorter.
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(sample.subarray(0, Math.max(0, sample.length - 4)));
      return true;
    } catch {
      return false;
    }
  }
}
