import { Fragment, type ReactNode } from "react";

/**
 * Minimal, safe Markdown subset for AI answers: paragraphs, bullet and
 * numbered lists, **bold**, `code` and [n] citations. No HTML is ever injected.
 */
function inline(text: string, onCite?: (n: number) => void): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[\d{1,2}\])/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    const cite = part.match(/^\[(\d{1,2})\]$/);
    if (cite) {
      const n = Number(cite[1]);
      return (
        <button
          key={i}
          type="button"
          onClick={() => onCite?.(n)}
          className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-primary/15 px-1 align-text-top text-[10px] font-semibold text-primary hover:bg-primary/25"
          aria-label={`Source ${n}`}
        >
          {n}
        </button>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function RichText({ text, onCite }: { text: string; onCite?: (n: number) => void }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="grid gap-2 leading-relaxed">
      {blocks.map((block, b) => {
        const lines = block.split("\n");
        const isBullets = lines.every((l) => /^\s*[-*•]\s+/.test(l));
        const isNumbered = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
        if (isBullets || isNumbered) {
          const Tag = isNumbered ? "ol" : "ul";
          return (
            <Tag key={b} className={`grid gap-1 pl-5 ${isNumbered ? "list-decimal" : "list-disc"}`}>
              {lines.map((l, i) => (
                <li key={i}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""), onCite)}</li>
              ))}
            </Tag>
          );
        }
        const heading = block.match(/^#{1,4}\s+(.*)$/);
        if (heading && lines.length === 1) {
          return (
            <p key={b} className="font-semibold">
              {inline(heading[1], onCite)}
            </p>
          );
        }
        return (
          <p key={b} className="whitespace-pre-line">
            {inline(block.replace(/^#{1,4}\s+/gm, ""), onCite)}
          </p>
        );
      })}
    </div>
  );
}
