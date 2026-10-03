import { BookMarkedIcon, CalculatorIcon, LightbulbIcon, ListIcon, QuoteIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SummaryContent } from "@/lib/ai/schemas";

function Section({ icon: Icon, title, children }: { icon: typeof ListIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className="size-4 text-primary" aria-hidden /> {title}
      </h3>
      {children}
    </section>
  );
}

export function SummaryView({ content, meta }: { content: SummaryContent; meta?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{content.title}</CardTitle>
        {meta && <CardDescription>{meta}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-8">
        <p className="leading-relaxed">{content.overview}</p>

        {content.keyConcepts.length > 0 && (
          <Section icon={LightbulbIcon} title="Concepts clés">
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
              {content.keyConcepts.map((concept, i) => (
                <li key={i} className="rounded-lg border bg-background/50 p-4">
                  <p className="font-medium">{concept.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{concept.explanation}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {content.definitions.length > 0 && (
          <Section icon={BookMarkedIcon} title="Définitions">
            <dl className="grid gap-3">
              {content.definitions.map((def, i) => (
                <div key={i} className="border-l-2 border-primary/40 pl-4">
                  <dt className="font-medium">{def.term}</dt>
                  <dd className="text-sm text-muted-foreground">{def.definition}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {content.formulas.length > 0 && (
          <Section icon={CalculatorIcon} title="Formules">
            <ul className="grid gap-3">
              {content.formulas.map((formula, i) => (
                <li key={i} className="rounded-lg border bg-background/50 p-4">
                  <p className="text-sm font-medium">{formula.name}</p>
                  <pre className="mt-2 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-sm whitespace-pre-wrap">
                    {formula.formula}
                  </pre>
                  {formula.interpretation && (
                    <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{formula.interpretation}</p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {content.importantPoints.length > 0 && (
          <Section icon={ListIcon} title="À retenir">
            <ul className="grid list-disc gap-2 pl-5 text-sm leading-relaxed marker:text-primary">
              {content.importantPoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </Section>
        )}

        {content.examples.length > 0 && (
          <Section icon={QuoteIcon} title="Exemples">
            <ul className="grid gap-3">
              {content.examples.map((example, i) => (
                <li key={i} className="rounded-lg bg-accent/40 p-4 text-sm">
                  <p className="font-medium">{example.title}</p>
                  <p className="mt-1 whitespace-pre-line text-muted-foreground">{example.content}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </CardContent>
    </Card>
  );
}
