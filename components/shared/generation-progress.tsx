"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

/** Reassuring, rotating messages while the AI works. */
export function GenerationProgress({ steps }: { steps: string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => Math.min(i + 1, steps.length - 1)), 3500);
    return () => clearInterval(timer);
  }, [steps.length]);
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl border bg-card p-5 text-sm">
      <Loader2Icon className="size-5 animate-spin text-primary" aria-hidden />
      <span>{steps[index]}</span>
    </div>
  );
}
