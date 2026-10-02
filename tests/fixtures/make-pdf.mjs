// Generates a small text PDF fixture (Helvetica, WinAnsi encoding) without dependencies.
import { readFileSync, writeFileSync } from "node:fs";

const text = readFileSync(new URL("./microeconomie-chapitre-2.txt", import.meta.url), "utf8");
const toWinAnsi = (s) =>
  Buffer.from(
    [...s].map((ch) => {
      const map = { "—": 0x97, "’": 0x92, "«": 0xab, "»": 0xbb, "…": 0x85 };
      if (map[ch]) return map[ch];
      const code = ch.charCodeAt(0);
      return code < 256 ? code : 0x3f;
    }),
  ).toString("latin1");
const escape = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

// Wrap lines at ~90 chars and paginate (48 lines per page).
const lines = [];
for (const paragraph of text.split("\n")) {
  if (!paragraph.trim()) { lines.push(""); continue; }
  let current = "";
  for (const word of paragraph.split(" ")) {
    if ((current + " " + word).length > 90) { lines.push(current); current = word; }
    else current = current ? `${current} ${word}` : word;
  }
  lines.push(current);
}
const pages = [];
for (let i = 0; i < lines.length; i += 48) pages.push(lines.slice(i, i + 48));

const objects = [];
const add = (body) => { objects.push(body); return objects.length; };
const catalogId = add(null);
const pagesId = add(null);
const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
const pageIds = [];
for (const pageLines of pages) {
  const content = ["BT", "/F1 11 Tf", "14 TL", "50 800 Td", ...pageLines.map((l) => `(${escape(toWinAnsi(l))}) '`), "ET"].join("\n");
  const contentId = add(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
  pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`));
}
objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

let pdf = "%PDF-1.4\n";
const offsets = [];
objects.forEach((body, i) => { offsets.push(Buffer.byteLength(pdf, "latin1")); pdf += `${i + 1} 0 obj\n${body}\nendobj\n`; });
const xref = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
writeFileSync(new URL("./microeconomie-chapitre-2.pdf", import.meta.url), Buffer.from(pdf, "latin1"));
console.log(`PDF written: ${pages.length} pages`);
