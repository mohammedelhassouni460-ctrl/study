import { CheckCircle2Icon, FlameIcon, LayersIcon, ListChecksIcon, SparklesIcon } from "lucide-react";

/** Static, illustrative preview of the app (no real data). */
export function HeroPreview() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-transparent blur-2xl" />
      <div className="rounded-2xl border bg-card p-5 shadow-2xl shadow-indigo-500/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Aujourd&apos;hui · 45 min</p>
            <p className="font-semibold">Que dois-je réviser ?</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium">
            <FlameIcon className="size-3.5 text-warning" /> 6 jours
          </span>
        </div>
        <ul className="mt-4 grid gap-2 text-sm">
          {[
            { icon: LayersIcon, title: "Flashcards — Microéconomie", meta: "12 cartes · 15 min", done: true },
            { icon: ListChecksIcon, title: "QCM — Élasticité", meta: "10 questions · 15 min", done: false },
            { icon: SparklesIcon, title: "Exercice — Externalités", meta: "Avec correction · 15 min", done: false },
          ].map((item) => (
            <li key={item.title} className="flex items-center gap-3 rounded-lg border bg-background/60 p-3">
              <span className="grid size-8 place-items-center rounded-md bg-accent text-accent-foreground">
                <item.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.title}</span>
                <span className="block text-xs text-muted-foreground">{item.meta}</span>
              </span>
              {item.done && <CheckCircle2Icon className="size-5 text-success" />}
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-lg bg-muted p-3">
          <div className="mb-1.5 flex justify-between text-xs">
            <span>Maîtrise — Microéconomie</span>
            <span className="font-medium">68 %</span>
          </div>
          <div className="h-2 rounded-full bg-background">
            <div className="h-2 w-[68%] rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
          </div>
        </div>
      </div>
      <div className="absolute -right-4 -bottom-6 hidden w-56 rotate-2 rounded-xl border bg-card p-4 text-sm shadow-xl sm:block">
        <p className="text-[10px] font-medium tracking-wide text-primary uppercase">Flashcard</p>
        <p className="mt-1 font-medium">Qu&apos;est-ce qu&apos;une externalité négative ?</p>
        <div className="mt-3 grid grid-cols-4 gap-1 text-center text-base">
          <span>😵</span>
          <span>😐</span>
          <span>🙂</span>
          <span>🔥</span>
        </div>
      </div>
    </div>
  );
}
